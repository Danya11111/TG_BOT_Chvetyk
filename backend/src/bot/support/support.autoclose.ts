import { db } from '../../database/connection';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { getBot } from '../bot';
import { clearSupportSession } from './support.service';

const SUPPORT_INACTIVITY_HOURS = 2;
const SUPPORT_AUTOCLOSE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let started = false;

type TicketRow = {
  id: number;
  telegram_id: number;
  telegram_username: string | null;
  customer_name: string | null;
  topic_name: string | null;
  group_chat_id: number;
  thread_id: number;
};

async function closeInactiveTicketsOnce(): Promise<void> {
  if (!config.support.groupChatId) return;

  const result = await db.query(
    `SELECT id,
            telegram_id,
            telegram_username,
            customer_name,
            topic_name,
            group_chat_id,
            thread_id
     FROM support_tickets
     WHERE status = 'open'
       AND GREATEST(
             COALESCE(last_client_message_at, created_at),
             COALESCE(last_manager_response_at, created_at)
           ) < NOW() - INTERVAL '${SUPPORT_INACTIVITY_HOURS} hours'
     LIMIT 50`
  );

  const rows: TicketRow[] = result.rows || [];
  if (!rows.length) return;

  const bot = getBot();

  for (const row of rows) {
    try {
      const update = await db.query(
        `UPDATE support_tickets
         SET status = 'closed',
             closed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1 AND status = 'open'
         RETURNING id`,
        [row.id]
      );
      if (!update.rows?.length) {
        continue; // already closed by someone else
      }

      await clearSupportSession(Number(row.telegram_id));

      try {
        await (bot.telegram as any).callApi('closeForumTopic', {
          chat_id: Number(row.group_chat_id),
          message_thread_id: Number(row.thread_id),
        });
      } catch (error) {
        logger.warn('Support auto-close: failed to close forum topic', {
          ticketId: row.id,
          groupChatId: row.group_chat_id,
          threadId: row.thread_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Optional: write to support log thread (managers only), client is not notified.
      if (config.support.logThreadId) {
        const clientLabel = row.customer_name?.trim()
          ? `${row.customer_name}${row.telegram_username ? ` (@${row.telegram_username})` : ''}`
          : row.telegram_username
            ? `@${row.telegram_username}`
            : `id:${row.telegram_id}`;

        try {
          await bot.telegram.sendMessage(
            Number(row.group_chat_id),
            `⏱ Автозакрытие поддержки (нет сообщений ${SUPPORT_INACTIVITY_HOURS}ч)\nКлиент: ${clientLabel}`,
            { message_thread_id: Number(config.support.logThreadId) } as any
          );
        } catch (error) {
          logger.warn('Support auto-close: failed to write to support log', {
            ticketId: row.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logger.warn('Support auto-close: failed to close ticket', {
        ticketId: row.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function startSupportAutoCloseScheduler(): void {
  if (started) return;
  started = true;

  logger.info('Support auto-close scheduler started', {
    inactivityHours: SUPPORT_INACTIVITY_HOURS,
    intervalMs: SUPPORT_AUTOCLOSE_INTERVAL_MS,
  });

  // Fire-and-forget first tick, then run periodically.
  void closeInactiveTicketsOnce();
  setInterval(() => {
    void closeInactiveTicketsOnce();
  }, SUPPORT_AUTOCLOSE_INTERVAL_MS);
}

