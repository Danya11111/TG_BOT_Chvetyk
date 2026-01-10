import { Context } from 'telegraf';

export async function handleWebAppData(ctx: Context): Promise<void> {
  const webAppData = (ctx.message as any)?.web_app?.data;

  if (!webAppData) {
    return;
  }

  try {
    // Обработка данных от Mini App будет добавлена позже
    // Например, создание заказа, обновление корзины и т.д.
    console.log('WebApp data received:', webAppData);
    
    await ctx.reply('Данные получены! Функция будет доработана после интеграции с Posiflora.');
  } catch (error) {
    console.error('Error handling WebApp data:', error);
    await ctx.reply('Произошла ошибка при обработке данных.');
  }
}
