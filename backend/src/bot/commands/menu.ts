import { Context } from 'telegraf';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export async function handleMenu(ctx: Context): Promise<void> {
  try {
    // Проверяем, является ли URL HTTPS или localhost (для Telegram Desktop localhost работает)
    const isHttps = config.telegram.webappUrl.startsWith('https://');
    const isLocalhost = config.telegram.webappUrl.includes('localhost') || config.telegram.webappUrl.includes('127.0.0.1');
    
    if (isHttps || isLocalhost) {
      // Если URL HTTPS - показываем только кнопку WebApp для открытия Mini App
      await ctx.reply(
        `🌺 Откройте каталог в Mini App`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌺 Открыть каталог', web_app: { url: config.telegram.webappUrl } }],
            ],
          },
        }
      );
    } else {
      // Если URL не HTTPS - показываем предупреждение
      await ctx.reply(
        `⚠️ Каталог будет доступен после настройки HTTPS для Mini App.\n\n` +
        `Для настройки используйте ngrok или другой туннелинг сервис.`
      );
    }
  } catch (error) {
    logger.error('Error in handleMenu:', error);
    // В случае ошибки показываем сообщение
    await ctx.reply(
      `⚠️ Произошла ошибка при открытии меню. Попробуйте позже.`
    );
  }
}
