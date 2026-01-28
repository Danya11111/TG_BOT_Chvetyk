import type { Context } from 'telegraf';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
  clearSupportSession,
  closeTicket,
  getOpenTicketByTelegramId,
  getSupportGroupChatId,
  getSupportSession,
  getTicketByThreadId,
  markTicketClientMessage,
  markTicketManagerResponse,
  sendToSupportLog,
} from '../support/support.service';

function formatManagerLabel(manager: { id: number; username?: string; first_name?: string }): string {
  if (manager.username) return `@${manager.username}`;
  if (manager.first_name) return manager.first_name;
  return `id:${manager.id}`;
}

function formatClientLabel(client: { telegramId: number; telegramUsername: string | null; customerName: string | null }): string {
  if (client.telegramUsername) return `@${client.telegramUsername}`;
  if (client.customerName) return client.customerName;
  return `id:${client.telegramId}`;
}

function isCommandText(text: string | undefined): boolean {
  if (!text) return false;
  return text.trim().startsWith('/');
}

function formatSupportDateTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: config.support.timeZone || 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hrs = Math.floor(totalMin / 60);
  if (hrs > 0) return `${hrs}ч ${min}м ${sec}с`;
  if (min > 0) return `${min}м ${sec}с`;
  return `${sec}с`;
}

function parseDbDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function sendMessageSafe(ctx: Context, chatId: number, text: string, extra?: any): Promise<void> {
  try {
    await (ctx.telegram as any).callApi('sendMessage', {
      chat_id: chatId,
      text,
      ...(extra || {}),
    });
  } catch (error) {
    logger.error('Failed to send message', {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function copyMessageSafe(ctx: Context, toChatId: number, fromChatId: number, messageId: number, extra?: any): Promise<void> {
  try {
    await (ctx.telegram as any).callApi('copyMessage', {
      chat_id: toChatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      ...(extra || {}),
    });
  } catch (error) {
    logger.error('Failed to copy message', {
      toChatId,
      fromChatId,
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function handleSupportRouting(ctx: Context, next: () => Promise<void>): Promise<void> {
  const message: any = ctx.message as any;
  if (!message) {
    return next();
  }

  // Let WebApp handler process first
  if (message?.web_app) {
    return next();
  }

  const supportGroupChatId = getSupportGroupChatId();

  // Managers -> client (messages inside support supergroup topics)
  if (supportGroupChatId && ctx.chat?.id === supportGroupChatId) {
    const threadId = message.message_thread_id;
    if (!threadId) {
      return next();
    }

    const ticket = await getTicketByThreadId(supportGroupChatId, threadId);
    if (!ticket || ticket.status !== 'open') {
      return next();
    }

    // Ignore bot messages to prevent loops
    if (ctx.from?.is_bot) {
      return;
    }

    const manager = ctx.from;
    if (!manager) {
      return;
    }

    // Close ticket command (in topic)
    const text: string | undefined = message.text;
    if (text && text.trim().toLowerCase().startsWith('/close')) {
      await closeTicket(ctx, ticket, { id: manager.id, username: manager.username || null });

      const managerLabel = formatManagerLabel(manager);
      const clientLabel = formatClientLabel(ticket);
      const closedAt = formatSupportDateTime(new Date());

      await sendToSupportLog(
        ctx,
        `✅ Поддержка закрыта\n` +
          `Клиент: ${clientLabel}\n` +
          `Менеджер: ${managerLabel}\n` +
          `Время: ${closedAt}`
      );
      await sendMessageSafe(
        ctx,
        ticket.telegramId,
        `✅ Чат поддержки закрыт.\nЕсли понадобится — нажмите «Написать в поддержку» в профиле или отправьте /support.`
      );
      await sendMessageSafe(
        ctx,
        supportGroupChatId,
        `Тема закрыта. Если нужно — откройте новую тему через /support (клиент) или попросите клиента написать снова.`,
        { message_thread_id: ticket.threadId }
      );
      return;
    }

    const managerLabel = formatManagerLabel(manager);
    const clientLabel = formatClientLabel(ticket);

    const responseAt = new Date((message.date ? Number(message.date) : Math.floor(Date.now() / 1000)) * 1000);
    const responseMeta = await markTicketManagerResponse(ticket.id, { id: manager.id, username: manager.username || null }, responseAt);
    if (responseMeta.isFirstManagerResponse) {
      const clientAtDate = parseDbDate(responseMeta.firstClientMessageAt);
      const clientAtText = clientAtDate ? formatSupportDateTime(clientAtDate) : '—';
      const responseAtText = formatSupportDateTime(responseAt);
      const reactionMs = clientAtDate ? responseAt.getTime() - clientAtDate.getTime() : NaN;

      await sendToSupportLog(
        ctx,
        `💬 Ответ в поддержке\n` +
          `Клиент: ${clientLabel}\n` +
          `Менеджер: ${managerLabel}\n` +
          `Клиент написал: ${clientAtText}\n` +
          `Менеджер ответил: ${responseAtText}\n` +
          `Время реакции: ${formatDurationMs(reactionMs)}`
      );
    }

    // Relay to client
    if (message.text) {
      await sendMessageSafe(ctx, ticket.telegramId, `👩‍💼 ${managerLabel}:\n${message.text}`);
    } else {
      // For media/other messages: send manager label, then copy message as bot (no forwards)
      await sendMessageSafe(ctx, ticket.telegramId, `👩‍💼 ${managerLabel}:`);
      await copyMessageSafe(ctx, ticket.telegramId, supportGroupChatId, message.message_id);
    }

    return;
  }

  // Client -> managers (private chat, only when support session is active)
  if (ctx.chat?.type === 'private') {
    const user = ctx.from;
    if (!user) {
      return next();
    }

    // Do not hijack commands (/start, /menu, /support etc.)
    if (isCommandText(message.text)) {
      return next();
    }

    const session = await getSupportSession(user.id);
    if (!session) {
      return next();
    }

    const ticket = await getOpenTicketByTelegramId(user.id);
    if (!ticket) {
      await clearSupportSession(user.id);
      await ctx.reply('Чат поддержки уже закрыт. Нажмите «Написать в поддержку» ещё раз.');
      return;
    }

    const clientLabel = formatClientLabel(ticket);
    const clientAt = new Date((message.date ? Number(message.date) : Math.floor(Date.now() / 1000)) * 1000);
    const clientMeta = await markTicketClientMessage(ticket.id, clientAt);
    if (clientMeta.isFirstClientMessage) {
      const clientAtText = formatSupportDateTime(clientAt);
      const topicName = ticket.topicName || `thread:${ticket.threadId}`;
      const previewText =
        typeof message.text === 'string'
          ? message.text
          : typeof message.caption === 'string'
            ? message.caption
            : '';
      const preview = previewText.trim() ? `\n\nСообщение:\n${previewText.slice(0, 500)}` : '';

      await sendToSupportLog(
        ctx,
        `🆘 Новый запрос в поддержку\n` +
          `Клиент: ${clientLabel}\n` +
          `Время: ${clientAtText}\n` +
          `Тема: ${topicName}${preview}`
      );
    }

    // Text messages: send with prefix
    if (message.text) {
      await sendMessageSafe(ctx, ticket.groupChatId, `👤 ${clientLabel}:\n${message.text}`, {
        message_thread_id: ticket.threadId,
      });
      return;
    }

    // Media/other: copy into topic, with a caption prefix where supported
    const originalCaption: string | undefined = message.caption;
    const captionPrefix = `👤 ${clientLabel}`;
    const caption = originalCaption ? `${captionPrefix}\n${originalCaption}` : captionPrefix;

    await copyMessageSafe(ctx, ticket.groupChatId, user.id, message.message_id, {
      message_thread_id: ticket.threadId,
      caption,
    });
    return;
  }

  return next();
}

