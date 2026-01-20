import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';

class CartController {
  async getCart(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string | undefined;

    // TODO: реализация получения корзины из Posiflora/БД
    res.json(
      buildSuccessResponse({
        userId,
        items: [],
        total: 0,
      })
    );
  }

  async addItem(_req: Request, res: Response): Promise<void> {
    // TODO: реализация добавления в корзину
    res.json(buildSuccessResponse(undefined, { message: 'Item added to cart' }));
  }

  async removeItem(_req: Request, res: Response): Promise<void> {
    // TODO: реализация удаления из корзины
    res.json(buildSuccessResponse(undefined, { message: 'Item removed from cart' }));
  }
}

export const cartController = new CartController();
