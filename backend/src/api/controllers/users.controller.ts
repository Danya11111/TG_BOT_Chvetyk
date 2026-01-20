import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';
import { ValidationError, NotFoundError } from '../../utils/errors';

class UsersController {
  async getByTelegramId(req: Request, res: Response): Promise<void> {
    const telegramId = req.params.telegramId;

    if (!telegramId) {
      throw new ValidationError('Telegram ID is required');
    }

    // TODO: реализация получения пользователя
    throw new NotFoundError('User not found');
  }
}

export const usersController = new UsersController();
