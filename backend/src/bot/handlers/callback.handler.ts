import { Context } from 'telegraf';

export async function handleCallback(ctx: Context): Promise<void> {
  const callbackData = (ctx.callbackQuery as any)?.data;

  if (!callbackData) {
    await ctx.answerCbQuery('Неизвестная команда');
    return;
  }

  // Обработка callback query будет добавлена позже
  await ctx.answerCbQuery('Функция в разработке');
}
