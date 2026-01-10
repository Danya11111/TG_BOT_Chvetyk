import { Context } from 'telegraf';
import { config } from '../../config';

export async function handleMenu(ctx: Context): Promise<void> {
  const webAppButton = {
    text: '🌺 Открыть каталог',
    web_app: { url: config.telegram.webappUrl },
  };

  await ctx.reply(
    `🌺 Главное меню\n\n` +
    `Выберите действие:`,
    {
      reply_markup: {
        keyboard: [
          [webAppButton],
          [{ text: '📦 Мои заказы' }, { text: '💰 Мои бонусы' }],
          [{ text: 'ℹ️ О нас' }, { text: '❓ Помощь' }],
        ],
        resize_keyboard: true,
      },
    }
  );
}
