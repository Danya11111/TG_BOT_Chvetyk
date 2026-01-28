import { Context } from 'telegraf';
import { logger } from '../../utils/logger';
import { setSupportPending } from '../support/support.service';

export async function handleWebAppData(ctx: Context): Promise<void> {
  const message: any = ctx.message as any;
  const webAppData =
    message?.web_app_data?.data ||
    message?.web_app?.data ||
    null;

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
        if (ctx.from?.id) {
          await setSupportPending(ctx.from.id);
        }
        await ctx.reply('Напишите ваш запрос в этот чат.\nПервый свободный менеджер ответит вам здесь.');
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
