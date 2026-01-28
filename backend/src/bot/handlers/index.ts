import { Telegraf } from 'telegraf';
import { handleMessage } from './message.handler';
import { handleCallback } from './callback.handler';
import { handleWebAppData } from './webapp.handler';
import { handleSupportRouting } from './support.handler';

export function setupHandlers(bot: Telegraf): void {
  // Обработка callback query (нажатия на inline-кнопки) - ВАЖНО: должен быть ПЕРВЫМ
  // чтобы перехватывать все callback до других обработчиков
  bot.on('callback_query', async (ctx) => {
    const { logger } = await import('../../utils/logger');
    // Логируем ВСЕ callback запросы БЕЗ фильтрации для диагностики
    logger.info('🔔 Bot received callback_query event', {
      hasCallbackQuery: !!ctx.callbackQuery,
      fromId: ctx.from?.id,
      fromUsername: ctx.from?.username,
      callbackData: (ctx.callbackQuery as any)?.data,
      messageChatId: (ctx.callbackQuery as any)?.message?.chat?.id,
      messageId: (ctx.callbackQuery as any)?.message?.message_id,
    });
    try {
      await handleCallback(ctx);
    } catch (error) {
      logger.error('❌ Unhandled error in callback handler', {
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

  // Обработка данных от WebApp (сигналы из Mini App)
  bot.on('message', async (ctx, next) => {
    const message = ctx.message as any;
    if (message?.web_app) {
      await handleWebAppData(ctx);
      return;
    }
    return next();
  });

  // Роутинг сообщений в поддержку (клиент <-> супер-группа с темами)
  bot.on('message', handleSupportRouting);

  // Обработка текстовых сообщений (меню/кнопки)
  bot.on('text', handleMessage);
}
