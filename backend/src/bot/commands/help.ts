import { Context } from 'telegraf';
import { config } from '../../config';

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    `📋 Доступные команды:\n\n` +
    `/start - Начать работу с ботом\n` +
    `/help - Показать справку\n` +
    `/menu - Открыть главное меню\n\n` +
    `💡 Используйте команду /start для начала работы с ботом.`
  );
}
