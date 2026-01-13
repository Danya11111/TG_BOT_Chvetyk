import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';
import { ValidationError, NotFoundError } from '../../utils/errors';

class OrdersController {
  async create(_req: Request, res: Response): Promise<void> {
    // TODO: реализация создания заказа после интеграции с Posiflora
    res.json(
      buildSuccessResponse(undefined, {
        message: 'Order creation will be available after Posiflora integration',
      })
    );
  }

  async list(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string | undefined;
    // TODO: реализация получения заказов пользователя
    res.json(buildSuccessResponse({ userId, orders: [] }));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const orderId = parseInt(req.params.id, 10);

    if (Number.isNaN(orderId)) {
      throw new ValidationError('Invalid order ID');
    }

    // TODO: реализация получения заказа
    throw new NotFoundError('Order not found');
  }
}

export const ordersController = new OrdersController();
