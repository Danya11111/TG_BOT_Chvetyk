import { Context } from 'telegraf';
import { db } from '../../database/connection';
import { config } from '../../config';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { logger } from '../../utils/logger';

export async function handleCallback(ctx: Context): Promise<void> {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) {
    logger.warn('Callback query without data', { callbackQuery });
    await ctx.answerCbQuery('Неизвестная команда');
    return;
  }

  const callbackData = callbackQuery.data as string;

  if (!callbackData) {
    logger.warn('Empty callback data', { callbackQuery });
    await ctx.answerCbQuery('Неизвестная команда');
    return;
  }

  logger.info('Received callback', { callbackData, from: ctx.from?.id, username: ctx.from?.username });

  const confirmPrefix = 'payment_confirm:';
  const rejectPrefix = 'payment_reject:';

  if (!callbackData.startsWith(confirmPrefix) && !callbackData.startsWith(rejectPrefix)) {
    // Если это не наш callback, просто отвечаем и выходим
    logger.debug('Unknown callback prefix', { callbackData });
    await ctx.answerCbQuery('Неизвестная команда');
    return;
  }

  logger.info('Processing payment callback', { callbackData, action: callbackData.startsWith(confirmPrefix) ? 'confirm' : 'reject' });

  const action = callbackData.startsWith(confirmPrefix) ? 'confirm' : 'reject';
  const orderId = parseInt(callbackData.replace(confirmPrefix, '').replace(rejectPrefix, ''), 10);
  if (Number.isNaN(orderId)) {
    await ctx.answerCbQuery('Некорректный заказ');
    return;
  }

  const manager = ctx.from;
  const managerLabel = manager?.username ? `@${manager.username}` : manager?.first_name || 'менеджер';
  const actionTime = new Date();

  try {
    // Используем параметризованные запросы для безопасности
    let updateQuery: string;
    let queryParams: any[];

    if (action === 'confirm') {
      updateQuery = `
        UPDATE orders
        SET payment_status = $1,
            status = $2,
            payment_confirmed_by = $3,
            payment_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = $4 AND payment_status = $5
        RETURNING id, order_number, total, created_at, user_id
      `;
      queryParams = [
        PAYMENT_STATUSES.CONFIRMED,
        ORDER_STATUSES.CONFIRMED,
        manager?.id || null,
        orderId,
        PAYMENT_STATUSES.PENDING_CONFIRMATION,
      ];
    } else {
      updateQuery = `
        UPDATE orders
        SET payment_status = $1,
            status = $2,
            payment_rejected_by = $3,
            payment_rejected_at = NOW(),
            updated_at = NOW()
        WHERE id = $4 AND payment_status = $5
        RETURNING id, order_number, total, created_at, user_id
      `;
      queryParams = [
        PAYMENT_STATUSES.REJECTED,
        ORDER_STATUSES.CANCELLED,
        manager?.id || null,
        orderId,
        PAYMENT_STATUSES.PENDING_CONFIRMATION,
      ];
    }

    const updateResult = await db.query(updateQuery, queryParams);

    if (!updateResult.rows.length) {
      await ctx.answerCbQuery('Статус уже обновлён');
      return;
    }

    const updatedOrder = updateResult.rows[0];

    await db.query(
      `INSERT INTO order_status_history (order_id, status, comment)
       VALUES ($1, $2, $3)`,
      [
        orderId,
        action === 'confirm' ? ORDER_STATUSES.CONFIRMED : ORDER_STATUSES.CANCELLED,
        `Оплата ${action === 'confirm' ? 'подтверждена' : 'не прошла'} менеджером ${managerLabel} (${manager?.id || 'unknown'})`,
      ]
    );

    const orderDetailsResult = await db.query(
      `SELECT o.order_number,
              o.total,
              o.created_at,
              u.telegram_id
       FROM orders o
       INNER JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderDetailsResult.rows.length) {
      const orderDetails = orderDetailsResult.rows[0];
      const itemsResult = await db.query(
        `SELECT product_name, product_price, quantity, total
         FROM order_items
         WHERE order_id = $1`,
        [orderId]
      );
      const itemsText = itemsResult.rows
        .map(
          (item) =>
            `• ${item.product_name} × ${item.quantity} = ${Number(item.total).toFixed(2)} ₽`
        )
        .join('\n');

      const createdAt = new Date(orderDetails.created_at);
      const formattedTime = createdAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

      const message =
        `${action === 'confirm' ? '✅ Оплата подтверждена!' : '❌ Оплата не прошла.'}\n\n` +
        `📦 Заказ #${orderDetails.order_number}\n` +
        `🧾 Состав заказа:\n${itemsText}\n\n` +
        `💰 Сумма: ${Number(orderDetails.total).toFixed(2)} ₽\n` +
        `🕒 Время оформления: ${formattedTime}\n` +
        (action === 'confirm'
          ? '\nОплата завершена, чек сформирован. Спасибо за заказ!'
          : `\nЕсли оплата была проведена, свяжитесь с менеджером: ${config.support.managerPhone}`);

      await ctx.telegram.sendMessage(Number(orderDetails.telegram_id), message);
    }

    if ('message' in (ctx.callbackQuery as any)) {
      const originalMessage = (ctx.callbackQuery as any).message;
      const originalText = originalMessage?.text || '';
      const updatedText =
        `${originalText}\n\n` +
        `${action === 'confirm' ? '✅ Оплата подтверждена' : '❌ Оплата не прошла'}\n` +
        `Менеджер: ${managerLabel}\n` +
        `Время: ${actionTime.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;
      try {
        await ctx.editMessageText(updatedText, { reply_markup: { inline_keyboard: [] } });
      } catch (error) {
        logger.warn('Failed to edit manager message', error);
      }
    }

    await ctx.answerCbQuery(action === 'confirm' ? 'Оплата подтверждена' : 'Отмечено как не оплачено');
    logger.info(`Payment ${action === 'confirm' ? 'confirmed' : 'rejected'} for order ${orderId} by manager ${manager?.id}`);
  } catch (error) {
    logger.error('Failed to handle payment callback', {
      error,
      callbackData,
      orderId,
      action,
      managerId: manager?.id,
      stack: error instanceof Error ? error.stack : undefined,
    });
    try {
      await ctx.answerCbQuery('Не удалось обновить статус. Попробуйте позже.');
    } catch (answerError) {
      logger.error('Failed to answer callback query', answerError);
    }
  }
}
