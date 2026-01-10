import { Telegraf } from 'telegraf';
import { handleMessage } from './message.handler';
import { handleCallback } from './callback.handler';
import { handleWebAppData } from './webapp.handler';

export function setupHandlers(bot: Telegraf): void {
  // Обработка текстовых сообщений
  bot.on('text', handleMessage);

  // Обработка callback query (нажатия на inline-кнопки)
  bot.on('callback_query', handleCallback);

  // Обработка данных от WebApp
  bot.on('message', (ctx) => {
    const message = ctx.message as any;
    if (message?.web_app) {
      handleWebAppData(ctx);
    }
  });
}
