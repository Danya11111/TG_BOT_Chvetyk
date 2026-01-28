import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../utils/errors';
import { db } from '../../database/connection';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { notifyManagerPaymentReceipt, notifyManagerPaymentRequest } from '../../bot/notifications';
import { logger } from '../../utils/logger';
import { posifloraOrderService } from '../../integrations/posiflora/order.service';
import { config } from '../../config';

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

      const productIds = payload.items
        .map((item) => item.productId)
        .filter((id) => Number.isFinite(id));

      if (!productIds.length) {
        throw new ValidationError('Order items are invalid');
      }

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

      // Resolve product data server-side (price/name/images) to avoid client-side tampering
      const productsResult = await client.query(
        `SELECT id,
                name,
                price,
                in_stock,
                images,
                posiflora_id,
                attributes->>'source' AS source
         FROM products
         WHERE id = ANY($1::int[])`,
        [productIds]
      );

      const productById = new Map<number, any>();
      for (const row of productsResult.rows) {
        productById.set(Number(row.id), row);
      }

      // Validate and build normalized order items
      const usedBouquetProductIds = new Set<number>();
      const normalizedItems = payload.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product) {
          throw new NotFoundError(`Product not found: ${item.productId}`);
        }
        if (product.in_stock === false) {
          throw new ValidationError(`Product is out of stock: ${product.name || item.productId}`);
        }

        const source: string | null = product.source || null;
        const isShowcaseBouquet =
          source === 'posiflora-showcase-bouquets' || source === 'posiflora-bouquets';

        if (isShowcaseBouquet) {
          // Showcase bouquets are unique items, only qty=1 allowed
          if (item.quantity !== 1) {
            throw new ValidationError('Showcase bouquets can be ordered only with quantity = 1');
          }
          if (usedBouquetProductIds.has(item.productId)) {
            throw new ValidationError('Showcase bouquet cannot be ordered more than once');
          }
          usedBouquetProductIds.add(item.productId);
        }

        const price = Number(product.price);
        if (!Number.isFinite(price) || price <= 0) {
          throw new ValidationError(`Invalid product price: ${product.name || item.productId}`);
        }

        const imagesRaw = product.images;
        const imagesArray: string[] = Array.isArray(imagesRaw)
          ? imagesRaw
          : typeof imagesRaw === 'string'
              ? (() => {
                  try {
                    const parsed = JSON.parse(imagesRaw);
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [];
                  }
                })()
              : [];
        const productImage = imagesArray.find((x) => typeof x === 'string' && x.length > 0) || null;

        return {
          productId: item.productId,
          productName: String(product.name || item.productName || `Товар ${item.productId}`),
          price,
          quantity: item.quantity,
          total: price * item.quantity,
          productImage,
          posifloraId: product.posiflora_id as string | null,
          posifloraType: isShowcaseBouquet ? ('bouquets' as const) : ('inventory-items' as const),
        };
      });

      const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
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

      const posifloraMissingItems = normalizedItems.filter((item) => !item.posifloraId);

      for (const item of normalizedItems) {
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
            item.total,
            item.productImage,
          ]
        );
      }

      await client.query(
        `INSERT INTO order_status_history (order_id, status, comment)
         VALUES ($1, $2, $3)`,
        [order.id, ORDER_STATUSES.PENDING, 'Ожидает подтверждения оплаты']
      );

      await client.query('COMMIT');

      try {
        if (config.posiflora.enabled && !posifloraMissingItems.length) {
          const posifloraPayload = {
            orderId: order.id,
            orderNumber: order.order_number,
            customer: {
              name: payload.customer.name,
              phone: payload.customer.phone,
              email: payload.customer.email || null,
            },
            recipient: {
              name: payload.recipient.name,
              phone: payload.recipient.phone,
            },
            delivery: {
              type: payload.delivery.type,
              date: payload.delivery.date,
              time: payload.delivery.time,
              address: payload.delivery.type === 'delivery' ? payload.delivery.address : null,
            },
            comment: payload.comment || null,
            cardText: payload.cardText,
            items: normalizedItems.map((item) => ({
              posifloraId: item.posifloraId!,
              posifloraType: item.posifloraType,
              name: item.productName,
              price: item.price,
              quantity: item.quantity,
            })),
          };

          if (config.posiflora.orderCreateMode === 'dry-run') {
            await posifloraOrderService.dryRunOrder(posifloraPayload);
            logger.info('Posiflora order dry-run ok (not created)', {
              orderId: order.id,
              orderNumber: order.order_number,
            });
          } else {
            const posifloraOrderId = await posifloraOrderService.createOrder(posifloraPayload);

            if (posifloraOrderId) {
              await db.query('UPDATE orders SET posiflora_order_id = $1 WHERE id = $2', [
                posifloraOrderId,
                order.id,
              ]);
            }
          }
        } else if (config.posiflora.enabled && posifloraMissingItems.length) {
          logger.warn('Posiflora sync skipped: missing product mapping', {
            orderId: order.id,
            orderNumber: order.order_number,
            missingProductIds: posifloraMissingItems.map((item) => item.productId),
          });
        }
      } catch (error) {
        logger.error('Posiflora order sync failed', {
          orderId: order.id,
          orderNumber: order.order_number,
          error: error instanceof Error ? error.message : String(error),
        });
      }

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
          customerTelegramId: telegramUser?.id,
          customerTelegramUsername: telegramUser?.username || undefined,
          deliveryType: payload.delivery.type,
          deliveryAddress: payload.delivery.address,
          deliveryDate: payload.delivery.date,
          deliveryTime: payload.delivery.time,
          recipientName: payload.recipient.name,
          recipientPhone: payload.recipient.phone,
          cardText: payload.cardText,
          comment: payload.comment || undefined,
          total,
          items: normalizedItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            image: item.productImage,
          })),
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

    res.json(buildSuccessResponse({ 
      orders: ordersResult.rows.map(order => ({
        id: order.id,
        order_number: order.order_number,
        total: Number(order.total),
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
      }))
    }));
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
      `SELECT o.id,
              o.order_number,
              o.total,
              o.status,
              o.payment_status,
              o.created_at,
              o.delivery_type,
              o.delivery_address,
              o.delivery_date,
              o.delivery_time,
              o.payment_type,
              o.comment,
              o.recipient_name,
              o.recipient_phone,
              o.card_text
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

    const historyResult = await db.query(
      `SELECT status, comment, changed_at
       FROM order_status_history
       WHERE order_id = $1
       ORDER BY changed_at ASC`,
      [orderId]
    );

    const order = orderResult.rows[0];
    
    // Парсим delivery_address если это JSON строка
    let deliveryAddress = order.delivery_address;
    if (typeof deliveryAddress === 'string') {
      try {
        deliveryAddress = JSON.parse(deliveryAddress);
      } catch (e) {
        // Если не JSON, оставляем как есть
        deliveryAddress = null;
      }
    }

    res.json(
      buildSuccessResponse({
        id: order.id,
        order_number: order.order_number,
        total: Number(order.total),
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        delivery_type: order.delivery_type,
        delivery_address: deliveryAddress,
        delivery_date: order.delivery_date,
        delivery_time: order.delivery_time,
        payment_type: order.payment_type,
        comment: order.comment,
        recipient_name: order.recipient_name,
        recipient_phone: order.recipient_phone,
        card_text: order.card_text,
        items: itemsResult.rows.map(item => ({
          product_name: item.product_name,
          product_price: Number(item.product_price),
          quantity: item.quantity,
          total: Number(item.total),
          product_image: item.product_image,
        })),
        history: historyResult.rows.map(entry => ({
          status: entry.status,
          comment: entry.comment,
          changed_at: entry.changed_at,
        })),
      })
    );
  }

  async uploadReceipt(req: Request, res: Response): Promise<void> {
    const telegramUser = req.user;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    const orderId = parseInt(req.params.id, 10);
    if (Number.isNaN(orderId)) {
      throw new ValidationError('Invalid order ID');
    }

    const { imageDataUrl, fileName } = req.body as {
      imageDataUrl?: string;
      fileName?: string | null;
    };

    if (!imageDataUrl) {
      throw new ValidationError('Receipt image is required');
    }

    const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!match) {
      throw new ValidationError('Unsupported receipt image format');
    }

    const imageBuffer = Buffer.from(match[2], 'base64');
    const maxSize = 4 * 1024 * 1024;
    if (imageBuffer.length > maxSize) {
      throw new ValidationError('Размер изображения слишком большой (до 4 МБ)');
    }

    // Валидация реального MIME-типа файла
    const { fileTypeFromBuffer } = await import('file-type');
    const fileTypeResult = await fileTypeFromBuffer(imageBuffer);
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    
    if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
      throw new ValidationError('Недопустимый формат изображения. Разрешены только PNG, JPEG, JPG, WebP');
    }

    const orderResult = await db.query(
      `SELECT o.order_number, o.customer_name, o.customer_phone
       FROM orders o
       INNER JOIN users u ON o.user_id = u.id
       WHERE o.id = $1 AND u.telegram_id = $2`,
      [orderId, telegramUser.id]
    );

    if (!orderResult.rows.length) {
      throw new NotFoundError('Order not found');
    }

    const order = orderResult.rows[0] as {
      order_number: string;
      customer_name: string;
      customer_phone: string;
    };

    // Чеки не сохраняются в БД, только отправляются в Telegram группу
    // Изображения остаются в группе Telegram
    logger.info('Sending receipt to managers', {
      orderId,
      orderNumber: order.order_number,
      imageBufferSize: imageBuffer.length,
      fileName: fileName || 'receipt.jpg'
    });
    
    setImmediate(() => {
      void notifyManagerPaymentReceipt({
        orderId,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerTelegramId: telegramUser.id,
        customerTelegramUsername: telegramUser.username || undefined,
        imageBuffer,
        fileName: fileName || undefined,
      }).catch((error) => {
        logger.error('Failed to notify managers about receipt', {
          error,
          orderId,
          orderNumber: order.order_number,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      });
    });

    res.json(buildSuccessResponse({ ok: true }));
  }
}

export const ordersController = new OrdersController();
