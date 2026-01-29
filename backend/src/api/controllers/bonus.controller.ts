import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';
import { UnauthorizedError, ValidationError } from '../../utils/errors';
import { getLoyaltyInfoByTelegramId } from '../../services/loyalty.service';

class BonusController {
  async getBalance(req: Request, res: Response): Promise<void> {
    const telegramUser = req.user;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    const loyalty = await getLoyaltyInfoByTelegramId(telegramUser.id);
    res.json(buildSuccessResponse({ balance: loyalty.bonusBalance, loyalty }));
  }

  async calculate(_req: Request, res: Response): Promise<void> {
    const telegramUser = (_req as any).user as { id: number } | undefined;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }
    const payload = (_req.body || {}) as { subtotal?: unknown };
    const subtotal = Number(payload.subtotal ?? 0);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      throw new ValidationError('Invalid subtotal');
    }

    const loyalty = await getLoyaltyInfoByTelegramId(telegramUser.id);
    const maxToUse = Math.min(loyalty.bonusBalance, (subtotal * loyalty.maxSpendPercent) / 100);

    res.json(
      buildSuccessResponse({
        maxToUse: Math.max(0, Math.floor(maxToUse)),
        cashbackPercent: loyalty.tier.cashbackPercent,
      })
    );
  }
}

export const bonusController = new BonusController();
