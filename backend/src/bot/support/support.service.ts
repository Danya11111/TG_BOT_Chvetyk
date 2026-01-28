import type { Context } from 'telegraf';
import { db } from '../../database/connection';
import { cache } from '../../database/redis';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export type SupportTicketStatus = 'open' | 'closed';

export interface SupportTicket {
  id: number;
  telegramId: number;
  telegramUsername: string | null;
  customerName: string | null;
  topicName: string | null;
  groupChatId: number;
  threadId: number;
  status: SupportTicketStatus;
  assignedManagerTelegramId: number | null;
  assignedManagerUsername: string | null;
  firstClientMessageAt: string | null;
  lastClientMessageAt: string | null;
  firstManagerResponseAt: string | null;
  lastManagerResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

const SUPPORT_SESSION_TTL_SECONDS = 24 * 60 * 60; // 24h
const SUPPORT_PENDING_TTL_SECONDS = 15 * 60; // 15m

export function getSupportGroupChatId(): number | null {
  return config.support.groupChatId ?? null;
}

function supportSessionKey(telegramId: number): string {
  return `support:active:${telegramId}`;
}

export async function setSupportSessionActive(telegramId: number, ticketId: number): Promise<void> {
  await cache.set(supportSessionKey(telegramId), { ticketId }, SUPPORT_SESSION_TTL_SECONDS);
}

export async function clearSupportSession(telegramId: number): Promise<void> {
  await cache.delete(supportSessionKey(telegramId));
}

export async function getSupportSession(telegramId: number): Promise<{ ticketId: number } | null> {
  return cache.get<{ ticketId: number }>(supportSessionKey(telegramId));
}

function supportPendingKey(telegramId: number): string {
  return `support:pending:${telegramId}`;
}

export async function setSupportPending(telegramId: number): Promise<void> {
  await cache.set(
    supportPendingKey(telegramId),
    { requestedAt: new Date().toISOString() },
    SUPPORT_PENDING_TTL_SECONDS
  );
}

export async function clearSupportPending(telegramId: number): Promise<void> {
  await cache.delete(supportPendingKey(telegramId));
}

export async function getSupportPending(telegramId: number): Promise<{ requestedAt: string } | null> {
  return cache.get<{ requestedAt: string }>(supportPendingKey(telegramId));
}

export async function getOpenTicketByTelegramId(telegramId: number): Promise<SupportTicket | null> {
  const result = await db.query(
    `SELECT id,
            telegram_id,
            telegram_username,
            customer_name,
            topic_name,
            group_chat_id,
            thread_id,
            status,
            assigned_manager_telegram_id,
            assigned_manager_username,
            first_client_message_at,
            last_client_message_at,
            first_manager_response_at,
            last_manager_response_at,
            created_at,
            updated_at,
            closed_at
     FROM support_tickets
     WHERE telegram_id = $1 AND status = 'open'
     ORDER BY id DESC
     LIMIT 1`,
    [telegramId]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    telegramId: Number(row.telegram_id),
    telegramUsername: row.telegram_username || null,
    customerName: row.customer_name || null,
    topicName: row.topic_name || null,
    groupChatId: Number(row.group_chat_id),
    threadId: Number(row.thread_id),
    status: row.status,
    assignedManagerTelegramId: row.assigned_manager_telegram_id ? Number(row.assigned_manager_telegram_id) : null,
    assignedManagerUsername: row.assigned_manager_username || null,
    firstClientMessageAt: row.first_client_message_at ? String(row.first_client_message_at) : null,
    lastClientMessageAt: row.last_client_message_at ? String(row.last_client_message_at) : null,
    firstManagerResponseAt: row.first_manager_response_at ? String(row.first_manager_response_at) : null,
    lastManagerResponseAt: row.last_manager_response_at ? String(row.last_manager_response_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
  };
}

export async function getTicketByThreadId(groupChatId: number, threadId: number): Promise<SupportTicket | null> {
  const result = await db.query(
    `SELECT id,
            telegram_id,
            telegram_username,
            customer_name,
            topic_name,
            group_chat_id,
            thread_id,
            status,
            assigned_manager_telegram_id,
            assigned_manager_username,
            first_client_message_at,
            last_client_message_at,
            first_manager_response_at,
            last_manager_response_at,
            created_at,
            updated_at,
            closed_at
     FROM support_tickets
     WHERE group_chat_id = $1 AND thread_id = $2
     ORDER BY id DESC
     LIMIT 1`,
    [groupChatId, threadId]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    telegramId: Number(row.telegram_id),
    telegramUsername: row.telegram_username || null,
    customerName: row.customer_name || null,
    topicName: row.topic_name || null,
    groupChatId: Number(row.group_chat_id),
    threadId: Number(row.thread_id),
    status: row.status,
    assignedManagerTelegramId: row.assigned_manager_telegram_id ? Number(row.assigned_manager_telegram_id) : null,
    assignedManagerUsername: row.assigned_manager_username || null,
    firstClientMessageAt: row.first_client_message_at ? String(row.first_client_message_at) : null,
    lastClientMessageAt: row.last_client_message_at ? String(row.last_client_message_at) : null,
    firstManagerResponseAt: row.first_manager_response_at ? String(row.first_manager_response_at) : null,
    lastManagerResponseAt: row.last_manager_response_at ? String(row.last_manager_response_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
  };
}

export async function getLatestTicketByTelegramId(telegramId: number): Promise<SupportTicket | null> {
  const result = await db.query(
    `SELECT id,
            telegram_id,
            telegram_username,
            customer_name,
            topic_name,
            group_chat_id,
            thread_id,
            status,
            assigned_manager_telegram_id,
            assigned_manager_username,
            first_client_message_at,
            last_client_message_at,
            first_manager_response_at,
            last_manager_response_at,
            created_at,
            updated_at,
            closed_at
     FROM support_tickets
     WHERE telegram_id = $1
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [telegramId]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    telegramId: Number(row.telegram_id),
    telegramUsername: row.telegram_username || null,
    customerName: row.customer_name || null,
    topicName: row.topic_name || null,
    groupChatId: Number(row.group_chat_id),
    threadId: Number(row.thread_id),
    status: row.status,
    assignedManagerTelegramId: row.assigned_manager_telegram_id ? Number(row.assigned_manager_telegram_id) : null,
    assignedManagerUsername: row.assigned_manager_username || null,
    firstClientMessageAt: row.first_client_message_at ? String(row.first_client_message_at) : null,
    lastClientMessageAt: row.last_client_message_at ? String(row.last_client_message_at) : null,
    firstManagerResponseAt: row.first_manager_response_at ? String(row.first_manager_response_at) : null,
    lastManagerResponseAt: row.last_manager_response_at ? String(row.last_manager_response_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
  };
}

function formatUserLabel(user: { id: number; username?: string; first_name?: string; last_name?: string }): string {
  const username = user.username ? `@${user.username}` : null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || null;
  return username || name || `id:${user.id}`;
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

async function createForumTopic(
  ctx: Context,
  groupChatId: number,
  topicName: string
): Promise<{ threadId: number }> {
  const result = (await (ctx.telegram as any).callApi('createForumTopic', {
    chat_id: groupChatId,
    name: topicName,
  })) as { message_thread_id: number };

  return { threadId: Number(result.message_thread_id) };
}

export async function sendToSupportLog(
  ctx: Context,
  text: string,
  extra?: { disable_notification?: boolean; reply_markup?: unknown }
): Promise<void> {
  const chatId = config.support.groupChatId;
  if (!chatId) {
    return;
  }
  const threadId = config.support.logThreadId;
  await (ctx.telegram as any).callApi('sendMessage', {
    chat_id: chatId,
    ...(threadId ? { message_thread_id: threadId } : {}),
    text,
    ...(extra || {}),
  });
}

async function sendToTopic(ctx: Context, groupChatId: number, threadId: number, text: string): Promise<void> {
  await (ctx.telegram as any).callApi('sendMessage', {
    chat_id: groupChatId,
    message_thread_id: threadId,
    text,
  });
}

export async function startSupport(ctx: Context): Promise<SupportTicket> {
  const groupChatId = getSupportGroupChatId();
  if (!groupChatId) {
    throw new Error('Support group chat id is not configured');
  }

  const user = ctx.from;
  if (!user) {
    throw new Error('Missing Telegram user');
  }

  const existing = await getOpenTicketByTelegramId(user.id);
  if (existing) {
    await setSupportSessionActive(user.id, existing.id);
    return existing;
  }

  // Reuse previous topic for this user if it exists (even if ticket was closed).
  const previous = await getLatestTicketByTelegramId(user.id);

  // Ensure group is a forum supergroup
  const chatInfo = await ctx.telegram.getChat(groupChatId);
  const isForum = Boolean((chatInfo as any)?.is_forum);
  if (!isForum) {
    logger.error('Support group is not a forum (topics disabled)', {
      groupChatId,
      chatType: (chatInfo as any)?.type,
      isForum: (chatInfo as any)?.is_forum,
    });
    throw new Error(
      'Support group must be a supergroup with Topics enabled (forum). Enable Topics in Telegram group settings.'
    );
  }

  const customerName = [user.first_name, (user as any).last_name].filter(Boolean).join(' ').trim() || null;
  const userLabel = formatUserLabel({
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: (user as any).last_name,
  });
  const topicName = previous?.topicName || `🆘 ${userLabel}`;

  if (previous && previous.groupChatId === groupChatId && previous.threadId) {
    // Re-open existing ticket and topic
    const reopen = await db.query(
      `UPDATE support_tickets
       SET status = 'open',
           closed_at = NULL,
           updated_at = NOW(),
           assigned_manager_telegram_id = NULL,
           assigned_manager_username = NULL,
           first_client_message_at = NULL,
           last_client_message_at = NULL,
           first_manager_response_at = NULL,
           last_manager_response_at = NULL
       WHERE id = $1
       RETURNING id`,
      [previous.id]
    );

    const ticketId = Number(reopen.rows[0]?.id || previous.id);
    await setSupportSessionActive(user.id, ticketId);

    // Try to re-open forum topic (if it was closed)
    try {
      await (ctx.telegram as any).callApi('reopenForumTopic', {
        chat_id: groupChatId,
        message_thread_id: previous.threadId,
      });
    } catch {
      // ignore
    }

    // Seed topic with context
    await sendToTopic(
      ctx,
      groupChatId,
      previous.threadId,
      `Клиент снова открыл чат поддержки.\nКлиент: ${userLabel} (id: ${user.id})\nНапишите ответ в этой теме — бот доставит ответ клиенту.\n\n` +
        `⏱ ${formatSupportDateTime(new Date())}`
    );

    const updated = await getOpenTicketByTelegramId(user.id);
    if (updated) return updated;
    // Fallback (should not happen)
    return {
      ...previous,
      status: 'open',
      assignedManagerTelegramId: null,
      assignedManagerUsername: null,
      firstClientMessageAt: null,
      lastClientMessageAt: null,
      firstManagerResponseAt: null,
      lastManagerResponseAt: null,
      closedAt: null,
      updatedAt: new Date().toISOString(),
    };
  }

  const { threadId } = await createForumTopic(ctx, groupChatId, topicName);

  const insert = await db.query(
    `INSERT INTO support_tickets (
        telegram_id,
        telegram_username,
        customer_name,
        topic_name,
        group_chat_id,
        thread_id,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open', NOW(), NOW())
      RETURNING id`,
    [user.id, user.username || null, customerName, topicName, groupChatId, threadId]
  );

  const ticketId = Number(insert.rows[0].id);
  await setSupportSessionActive(user.id, ticketId);

  const ticket: SupportTicket = {
    id: ticketId,
    telegramId: user.id,
    telegramUsername: user.username || null,
    customerName,
    topicName,
    groupChatId,
    threadId,
    status: 'open',
    assignedManagerTelegramId: null,
    assignedManagerUsername: null,
    firstClientMessageAt: null,
    lastClientMessageAt: null,
    firstManagerResponseAt: null,
    lastManagerResponseAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
  };

  // Seed topic with context
  await sendToTopic(
    ctx,
    groupChatId,
    threadId,
    `Новый чат поддержки.\nКлиент: ${userLabel} (id: ${user.id})\nОтветьте в этой теме — бот доставит ответ клиенту.\n\n` +
      `⏱ ${formatSupportDateTime(new Date())}`
  );

  return ticket;
}

export async function markTicketClientMessage(
  ticketId: number,
  at: Date
): Promise<{
  isFirstClientMessage: boolean;
  firstClientMessageAt: string | null;
  lastClientMessageAt: string | null;
  firstManagerResponseAt: string | null;
}> {
  const result = await db.query(
    `WITH prev AS (
        SELECT first_client_message_at
        FROM support_tickets
        WHERE id = $2
      ),
      upd AS (
        UPDATE support_tickets
        SET first_client_message_at = COALESCE(first_client_message_at, $1),
            last_client_message_at = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING first_client_message_at, last_client_message_at, first_manager_response_at
      )
      SELECT upd.first_client_message_at,
             upd.last_client_message_at,
             upd.first_manager_response_at,
             (prev.first_client_message_at IS NULL) AS is_first_client_message
      FROM upd, prev`,
    [at, ticketId]
  );

  const row = result.rows[0] || {};
  return {
    isFirstClientMessage: Boolean(row.is_first_client_message),
    firstClientMessageAt: row.first_client_message_at ? String(row.first_client_message_at) : null,
    lastClientMessageAt: row.last_client_message_at ? String(row.last_client_message_at) : null,
    firstManagerResponseAt: row.first_manager_response_at ? String(row.first_manager_response_at) : null,
  };
}

export async function markTicketManagerResponse(
  ticketId: number,
  manager: { id: number; username?: string | null },
  at: Date
): Promise<{
  isFirstManagerResponse: boolean;
  firstClientMessageAt: string | null;
  firstManagerResponseAt: string | null;
  lastManagerResponseAt: string | null;
  assignedManagerTelegramId: number | null;
  assignedManagerUsername: string | null;
}> {
  const result = await db.query(
    `WITH prev AS (
        SELECT first_manager_response_at, first_client_message_at
        FROM support_tickets
        WHERE id = $3
      ),
      upd AS (
        UPDATE support_tickets
        SET first_manager_response_at = COALESCE(first_manager_response_at, $1),
            last_manager_response_at = $1,
            assigned_manager_telegram_id = COALESCE(assigned_manager_telegram_id, $2),
            assigned_manager_username = COALESCE(assigned_manager_username, $4),
            updated_at = NOW()
        WHERE id = $3
        RETURNING first_manager_response_at,
                  last_manager_response_at,
                  assigned_manager_telegram_id,
                  assigned_manager_username
      )
      SELECT upd.first_manager_response_at,
             upd.last_manager_response_at,
             upd.assigned_manager_telegram_id,
             upd.assigned_manager_username,
             prev.first_client_message_at,
             (prev.first_manager_response_at IS NULL) AS is_first_manager_response
      FROM upd, prev`,
    [at, manager.id, ticketId, manager.username || null]
  );

  const row = result.rows[0] || {};
  return {
    isFirstManagerResponse: Boolean(row.is_first_manager_response),
    firstClientMessageAt: row.first_client_message_at ? String(row.first_client_message_at) : null,
    firstManagerResponseAt: row.first_manager_response_at ? String(row.first_manager_response_at) : null,
    lastManagerResponseAt: row.last_manager_response_at ? String(row.last_manager_response_at) : null,
    assignedManagerTelegramId: row.assigned_manager_telegram_id ? Number(row.assigned_manager_telegram_id) : null,
    assignedManagerUsername: row.assigned_manager_username || null,
  };
}

export async function assignFirstResponder(
  ticketId: number,
  manager: { id: number; username?: string | null }
): Promise<void> {
  await db.query(
    `UPDATE support_tickets
     SET assigned_manager_telegram_id = COALESCE(assigned_manager_telegram_id, $1),
         assigned_manager_username = COALESCE(assigned_manager_username, $2),
         updated_at = NOW()
     WHERE id = $3`,
    [manager.id, manager.username || null, ticketId]
  );
}

export async function closeTicket(
  ctx: Context,
  ticket: SupportTicket,
  manager?: { id: number; username?: string | null }
): Promise<void> {
  await db.query(
    `UPDATE support_tickets
     SET status = 'closed',
         closed_at = NOW(),
         updated_at = NOW(),
         assigned_manager_telegram_id = COALESCE(assigned_manager_telegram_id, $1),
         assigned_manager_username = COALESCE(assigned_manager_username, $2)
     WHERE id = $3`,
    [manager?.id || null, manager?.username || null, ticket.id]
  );

  await clearSupportSession(ticket.telegramId);

  // Close forum topic (optional but nice UX)
  try {
    await (ctx.telegram as any).callApi('closeForumTopic', {
      chat_id: ticket.groupChatId,
      message_thread_id: ticket.threadId,
    });
  } catch (error) {
    logger.warn('Failed to close forum topic', {
      ticketId: ticket.id,
      groupChatId: ticket.groupChatId,
      threadId: ticket.threadId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

