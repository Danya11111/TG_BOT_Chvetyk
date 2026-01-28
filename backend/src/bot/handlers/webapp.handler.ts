import { Context } from 'telegraf';
import { logger } from '../../utils/logger';
import { startSupport } from '../support/support.service';

export async function handleWebAppData(ctx: Context): Promise<void> {
  const webAppData = (ctx.message as any)?.web_app?.data;

  if (!webAppData) {
    return;
  }

  try {
    // Mini App can send JSON payloads via WebApp.sendData(...)
    let parsed: any = null;
    try {
      parsed = JSON.parse(webAppData);
    } catch {
      parsed = null;
    }

    if (parsed?.type === 'support' || parsed?.action === 'support') {
      try {
        await startSupport(ctx);
        await ctx.reply(
          'Напишите ваш вопрос в этот чат.\n' +
            'Менеджер ответит здесь.\n\n' +
            'Чтобы закрыть чат поддержки: /close'
        );
      } catch (error) {
        logger.error('Failed to start support from WebApp', {
          error: error instanceof Error ? error.message : String(error),
          fromId: ctx.from?.id,
        });
        await ctx.reply(
          'Не удалось открыть поддержку.\n' +
            'Проверьте, что менеджерская группа — это супергруппа с включёнными темами (Topics) и бот добавлен админом.'
        );
      }
      return;
    }

    logger.info('WebApp data received (unhandled)', { data: webAppData });
  } catch (error) {
    logger.error('Error handling WebApp data:', {
      error: error instanceof Error ? error.message : String(error),
    });
    await ctx.reply('Произошла ошибка при обработке данных.');
  }
}
