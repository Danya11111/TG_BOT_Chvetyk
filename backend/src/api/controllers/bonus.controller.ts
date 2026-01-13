import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';

class BonusController {
  async getBalance(req: Request, res: Response): Promise<void> {
    const userId = req.query.userId as string | undefined;
    // TODO: реализация после интеграции с Posiflora
    res.json(
      buildSuccessResponse({
        userId,
        balance: 0,
        message: 'Bonus balance will be available after Posiflora integration',
      })
    );
  }

  async calculate(_req: Request, res: Response): Promise<void> {
    // TODO: реализация после интеграции с Posiflora
    res.json(
      buildSuccessResponse({
        bonusesToAccrue: 0,
        message: 'Bonus calculation will be available after Posiflora integration',
      })
    );
  }
}

export const bonusController = new BonusController();
