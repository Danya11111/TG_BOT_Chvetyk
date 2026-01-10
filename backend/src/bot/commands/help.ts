import { Context } from 'telegraf';
import { config } from '../../config';

export async function handleHelp(ctx: Context): Promise<void> {
  const webAppButton = {
    text: '🌺 Открыть каталог',
    web_app: { url: config.telegram.webappUrl },
  };

  await ctx.reply(
    `📋 Доступные команды:\n\n` +
    `/start - Начать работу с ботом\n` +
    `/help - Показать справку\n` +
    `/menu - Открыть главное меню\n\n` +
    `💡 Вы также можете использовать кнопку ниже для быстрого доступа к каталогу.`,
    {
      reply_markup: {
        keyboard: [[webAppButton]],
        resize_keyboard: true,
      },
    }
  );
}
