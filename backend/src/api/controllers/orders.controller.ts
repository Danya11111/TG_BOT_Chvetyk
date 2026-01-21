import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../utils/errors';
import { db } from '../../database/connection';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { notifyManagerPaymentRequest } from '../../bot/notifications';

interface CreateOrderPayload {
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
  delivery: {
    type: 'delivery' | 'pickup';
    address?: {
      city: string;
      street: string;
      house: string;
      apartment?: string;
      postalCode?: string;
    };
    pickupPointId?: number | null;
    date: string;
    time: string;
  };
  recipient: {
    name: string;
    phone: string;
  };
  cardText: string;
  comment?: string;
  paymentType: string;
  items: Array<{
    productId: number;
    productName: string;
    price: number;
    quantity: number;
    image?: string | null;
  }>;
}

const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CHV-${timestamp}-${randomPart}`;
};

class OrdersController {
  async create(req: Request, res: Response): Promise<void> {
    const telegramUser = req.user;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    const payload = req.body as CreateOrderPayload;
    if (!payload?.items?.length) {
      throw new ValidationError('Order items are required');
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (telegram_id, telegram_username, name, phone, email, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (telegram_id)
         DO UPDATE SET
           telegram_username = EXCLUDED.telegram_username,
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           updated_at = NOW()
         RETURNING id`,
        [
          telegramUser.id,
          telegramUser.username || null,
          payload.customer.name,
          payload.customer.phone,
          payload.customer.email || null,
        ]
      );

      const userId = userResult.rows[0]?.id as number | undefined;
      if (!userId) {
        throw new ValidationError('Unable to create user');
      }

      const subtotal = payload.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const total = subtotal;
      const orderNumber = generateOrderNumber();

      const orderResult = await client.query(
        `INSERT INTO orders (
           order_number,
           user_id,
           customer_name,
           customer_phone,
           customer_email,
           status,
           delivery_type,
           delivery_address,
           pickup_point_id,
           delivery_date,
           delivery_time,
           payment_type,
           payment_status,
           subtotal,
           total,
           comment,
           recipient_name,
           recipient_phone,
           card_text
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, $18, $19
         )
         RETURNING id, order_number, total, status, payment_status, created_at`,
        [
          orderNumber,
          userId,
          payload.customer.name,
          payload.customer.phone,
          payload.customer.email || null,
          ORDER_STATUSES.PENDING,
          payload.delivery.type,
          payload.delivery.type === 'delivery' ? payload.delivery.address : null,
          payload.delivery.type === 'pickup' ? payload.delivery.pickupPointId || null : null,
          payload.delivery.date,
          payload.delivery.time,
          payload.paymentType,
          PAYMENT_STATUSES.PENDING_CONFIRMATION,
          subtotal,
          total,
          payload.comment || null,
          payload.recipient.name,
          payload.recipient.phone,
          payload.cardText,
        ]
      );

      const order = orderResult.rows[0];

      for (const item of payload.items) {
        await client.query(
          `INSERT INTO order_items (
             order_id,
             product_id,
             product_name,
             product_price,
             quantity,
             total,
             product_image
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.id,
            item.productId,
            item.productName,
            item.price,
            item.quantity,
            item.price * item.quantity,
            item.image || null,
          ]
        );
      }

      await client.query(
        `INSERT INTO order_status_history (order_id, status, comment)
         VALUES ($1, $2, $3)`,
        [order.id, ORDER_STATUSES.PENDING, 'Ожидает подтверждения оплаты']
      );

      await client.query('COMMIT');

      res.json(
        buildSuccessResponse({
          id: order.id,
          orderNumber: order.order_number,
          total: order.total,
          status: order.status,
          paymentStatus: order.payment_status,
          createdAt: order.created_at,
        })
      );

      setImmediate(() => {
        void notifyManagerPaymentRequest({
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: payload.customer.name,
          customerPhone: payload.customer.phone,
          customerEmail: payload.customer.email || undefined,
          deliveryType: payload.delivery.type,
          deliveryAddress: payload.delivery.address,
          deliveryDate: payload.delivery.date,
          deliveryTime: payload.delivery.time,
          recipientName: payload.recipient.name,
          recipientPhone: payload.recipient.phone,
          cardText: payload.cardText,
          comment: payload.comment || undefined,
          total,
          items: payload.items,
        });
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    const telegramUser = req.user;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    const ordersResult = await db.query(
      `SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.created_at
       FROM orders o
       INNER JOIN users u ON o.user_id = u.id
       WHERE u.telegram_id = $1
       ORDER BY o.created_at DESC`,
      [telegramUser.id]
    );

    res.json(buildSuccessResponse({ orders: ordersResult.rows }));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const telegramUser = req.user;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    const orderId = parseInt(req.params.id, 10);

    if (Number.isNaN(orderId)) {
      throw new ValidationError('Invalid order ID');
    }

    const orderResult = await db.query(
      `SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.created_at
       FROM orders o
       INNER JOIN users u ON o.user_id = u.id
       WHERE o.id = $1 AND u.telegram_id = $2`,
      [orderId, telegramUser.id]
    );

    if (!orderResult.rows.length) {
      throw new NotFoundError('Order not found');
    }

    const itemsResult = await db.query(
      `SELECT product_name, product_price, quantity, total, product_image
       FROM order_items
       WHERE order_id = $1`,
      [orderId]
    );

    res.json(
      buildSuccessResponse({
        ...orderResult.rows[0],
        items: itemsResult.rows,
      })
    );
  }
}

export const ordersController = new OrdersController();
