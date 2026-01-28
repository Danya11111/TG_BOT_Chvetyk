import { Telegraf } from 'telegraf';
import { handleStart } from './start';
import { handleHelp } from './help';
import { handleMenu } from './menu';
import { logger } from '../../utils/logger';
import { closeTicket, getOpenTicketByTelegramId, startSupport } from '../support/support.service';

export function setupCommands(bot: Telegraf): void {
  bot.command('start', async (ctx) => {
    logger.info('Command /start received');
    await handleStart(ctx);
  });
  bot.command('help', handleHelp);
  bot.command('menu', handleMenu);

  // Debug helper: print current chat id (and topic thread id if present).
  // Useful to fill MANAGER_GROUP_CHAT_ID for support supergroup.
  bot.command('chatid', async (ctx) => {
    const chatId = ctx.chat?.id ?? null;
    const fromId = ctx.from?.id ?? null;
    const threadIdRaw = (ctx.message as unknown as { message_thread_id?: unknown } | undefined)?.message_thread_id;
    const threadId = typeof threadIdRaw === 'number' ? threadIdRaw : null;

    const text =
      `chat_id: ${chatId ?? '—'}\n` + `thread_id: ${threadId ?? '—'}\n` + `from_user_id: ${fromId ?? '—'}`;

    // In forum supergroups, plain sendMessage without message_thread_id goes to "General" topic.
    // Send into the same topic if we have threadId so user can see the response.
    if (chatId !== null && threadId !== null) {
      await ctx.telegram.sendMessage(chatId, text, { message_thread_id: threadId });
      return;
    }
    if (chatId !== null) {
      await ctx.telegram.sendMessage(chatId, text);
      return;
    }
    await ctx.reply(text);
  });

  bot.command('support', async (ctx) => {
    try {
      await startSupport(ctx);
      await ctx.reply(
        'Напишите ваш вопрос в этот чат.\n' +
          'Менеджер ответит здесь.\n\n' +
          'Чтобы закрыть чат поддержки: /close'
      );
    } catch (error) {
      logger.error('Failed to start support', {
        error: error instanceof Error ? error.message : String(error),
        fromId: ctx.from?.id,
      });
      await ctx.reply(
        'Не удалось открыть поддержку.\n' +
          'Проверьте, что менеджерская группа — это супергруппа с включёнными темами (Topics) и бот добавлен админом.'
      );
    }
  });

  // For clients: close current support ticket (in private chat)
  bot.command('close', async (ctx) => {
    if (ctx.chat?.type !== 'private') {
      // In group topics, /close is handled by support routing
      return;
    }
    const user = ctx.from;
    if (!user) return;

    const ticket = await getOpenTicketByTelegramId(user.id);
    if (!ticket) {
      await ctx.reply('Нет активного чата поддержки.');
      return;
    }

    await closeTicket(ctx, ticket, undefined);
    await ctx.reply('✅ Чат поддержки закрыт.');
  });

  logger.info('Commands /start, /help, /menu, /chatid, /support, /close registered');
}
