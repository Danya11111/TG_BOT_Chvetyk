import { Telegraf } from 'telegraf';
import { handleMessage } from './message.handler';
import { handleCallback } from './callback.handler';
import { handleWebAppData } from './webapp.handler';

export function setupHandlers(bot: Telegraf): void {
  // Обработка callback query (нажатия на inline-кнопки) - ВАЖНО: должен быть ПЕРВЫМ
  // чтобы перехватывать все callback до других обработчиков
  bot.on('callback_query', async (ctx) => {
    const { logger } = await import('../../utils/logger');
    logger.info('Bot received callback_query event', {
      hasCallbackQuery: !!ctx.callbackQuery,
      fromId: ctx.from?.id,
      callbackData: (ctx.callbackQuery as any)?.data,
    });
    try {
      await handleCallback(ctx);
    } catch (error) {
      logger.error('Unhandled error in callback handler', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        callbackData: (ctx.callbackQuery as any)?.data,
        fromId: ctx.from?.id,
      });
      try {
        await ctx.answerCbQuery('Произошла ошибка. Попробуйте позже.');
      } catch (e) {
        logger.error('Failed to answer callback query after error', e);
        // Игнорируем ошибки при ответе на callback
      }
    }
  });

  // Обработка текстовых сообщений
  bot.on('text', handleMessage);

  // Обработка данных от WebApp
  bot.on('message', (ctx) => {
    const message = ctx.message as any;
    if (message?.web_app) {
      handleWebAppData(ctx);
    }
  });
}
