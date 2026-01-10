import { Context } from 'telegraf';
import { config } from '../../config';

export async function handleStart(ctx: Context): Promise<void> {
  const webAppButton = {
    text: '🌺 Открыть каталог',
    web_app: { url: config.telegram.webappUrl },
  };

  await ctx.reply(
    `🌺 Добро пожаловать в магазин цветов!\n\n` +
    `Нажмите кнопку ниже, чтобы открыть каталог и сделать заказ.`,
    {
      reply_markup: {
        keyboard: [[webAppButton]],
        resize_keyboard: true,
      },
    }
  );
}
