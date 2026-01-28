import { Request, Response } from 'express';
import { buildSuccessResponse } from '../utils/response';
import { UnauthorizedError, ValidationError } from '../../utils/errors';
import { getBot } from '../../bot/bot';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { setSupportPending } from '../../bot/support/support.service';

class SupportController {
  async request(req: Request, res: Response): Promise<void> {
    const telegramUser = (req as any).user as { id: number; username?: string } | undefined;
    if (!telegramUser) {
      throw new UnauthorizedError('Missing Telegram user');
    }

    if (!config.support.groupChatId) {
      throw new ValidationError('Support group chat id is not configured');
    }

    await setSupportPending(telegramUser.id);

    const bot = getBot();
    try {
      // Validate support group configuration early (topics enabled)
      const chatInfo = await bot.telegram.getChat(config.support.groupChatId);
      const isForum = Boolean((chatInfo as any)?.is_forum);
      if (!isForum) {
        throw new ValidationError('Support group must be a supergroup with Topics enabled (forum)');
      }
    } catch (error) {
      logger.error('Support request: support group check failed', {
        error: error instanceof Error ? error.message : String(error),
        groupChatId: config.support.groupChatId,
      });
      throw error;
    }

    const message =
      'Напишите ваш запрос в этот чат.\n' +
      'Первый свободный менеджер ответит вам здесь.';

    try {
      await bot.telegram.sendMessage(telegramUser.id, message, {
        reply_markup: {
          inline_keyboard: [[{ text: '✅ Завершить диалог', callback_data: 'support_close' }]],
        },
      } as any);
    } catch (error) {
      logger.error('Support request: failed to send prompt to user', {
        error: error instanceof Error ? error.message : String(error),
        telegramId: telegramUser.id,
      });
      throw new ValidationError('Failed to send support prompt');
    }

    res.json(buildSuccessResponse({ ok: true }));
  }
}

export const supportController = new SupportController();

