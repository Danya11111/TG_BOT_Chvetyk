import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';
import { UnauthorizedError, ValidationError } from '../../utils/errors';
import { db } from '../../database/connection';
import {
  claimWelcomeBonus as claimWelcomeBonusService,
  getLoyaltyInfoByTelegramId,
  getWelcomeBonusClaimed,
  syncUserBonusesToPosiflora,
  upsertUserFromTelegram,
} from '../../services/loyalty.service';

class UsersController {
  async getMe(req: Request, res: Response): Promise<void> {
    const telegramUser = req.user;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    const userRow = await upsertUserFromTelegram(telegramUser);
    const loyalty = await getLoyaltyInfoByTelegramId(telegramUser.id);
    const welcomeBonusClaimed = await getWelcomeBonusClaimed(telegramUser.id);

    res.json(
      buildSuccessResponse({
        telegramId: telegramUser.id,
        username: telegramUser.username || null,
        name: userRow.name,
        phone: userRow.phone,
        email: userRow.email,
        welcomeBonusClaimed,
        bonus: {
          balance: loyalty.bonusBalance,
          totalSpent: loyalty.totalSpent,
          tier: loyalty.tier,
          cashbackPercent: loyalty.tier.cashbackPercent,
          welcomeBonus: loyalty.welcomeBonus,
          maxSpendPercent: loyalty.maxSpendPercent,
        },
      })
    );
  }

  async claimWelcomeBonus(req: Request, res: Response): Promise<void> {
    const telegramUser = req.user;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    const body = (req.body || {}) as { phone?: unknown };
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (!phoneRaw) {
      throw new ValidationError('Phone is required to claim welcome bonus');
    }

    const result = await claimWelcomeBonusService(telegramUser.id, phoneRaw);
    if (result.awarded) {
      void syncUserBonusesToPosiflora(telegramUser.id);
    }

    res.json(
      buildSuccessResponse({
        success: true,
        bonusBalance: result.bonusBalance,
        welcomeBonusClaimed: result.welcomeBonusClaimed,
      })
    );
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    const telegramUser = req.user;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    const body = (req.body || {}) as { phone?: unknown; name?: unknown; email?: unknown };
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : null;
    const nameRaw = typeof body.name === 'string' ? body.name.trim() : null;
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : null;

    const phone = phoneRaw ? phoneRaw : null;
    const name = nameRaw ? nameRaw : null;
    const email = emailRaw ? emailRaw : null;

    if (phone && phone.length > 50) {
      throw new ValidationError('Phone is too long');
    }
    if (name && name.length > 255) {
      throw new ValidationError('Name is too long');
    }
    if (email && email.length > 255) {
      throw new ValidationError('Email is too long');
    }

    // Ensure user exists
    await upsertUserFromTelegram(telegramUser);

    await db.query(
      `UPDATE users
       SET phone = COALESCE($2, phone),
           name = COALESCE($3, name),
           email = COALESCE($4, email),
           telegram_username = $5,
           updated_at = NOW()
       WHERE telegram_id = $1`,
      [telegramUser.id, phone, name, email, telegramUser.username || null]
    );

    // Best-effort sync bonuses into Posiflora if phone is now known
    void syncUserBonusesToPosiflora(telegramUser.id);

    // Return updated profile
    return this.getMe(req, res);
  }
}

export const usersController = new UsersController();
