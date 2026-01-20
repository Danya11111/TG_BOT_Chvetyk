import { Context } from 'telegraf';
import { db } from '../../database/connection';
import { config } from '../../config';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { logger } from '../../utils/logger';

export async function handleCallback(ctx: Context): Promise<void> {
  const callbackData = (ctx.callbackQuery as any)?.data;

  if (!callbackData) {
    await ctx.answerCbQuery('Неизвестная команда');
    return;
  }

  const confirmPrefix = 'payment_confirm:';
  const rejectPrefix = 'payment_reject:';

  if (!callbackData.startsWith(confirmPrefix) && !callbackData.startsWith(rejectPrefix)) {
    await ctx.answerCbQuery('Неизвестная команда');
    return;
  }

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
    const updateResult = await db.query(
      `UPDATE orders
       SET payment_status = $1,
           status = $2,
           ${action === 'confirm' ? 'payment_confirmed_by' : 'payment_rejected_by'} = $3,
           ${action === 'confirm' ? 'payment_confirmed_at' : 'payment_rejected_at'} = NOW()
       WHERE id = $4 AND payment_status = $5
       RETURNING id, order_number, total, created_at, user_id`,
      [
        action === 'confirm' ? PAYMENT_STATUSES.CONFIRMED : PAYMENT_STATUSES.REJECTED,
        action === 'confirm' ? ORDER_STATUSES.CONFIRMED : ORDER_STATUSES.CANCELLED,
        manager?.id || null,
        orderId,
        PAYMENT_STATUSES.PENDING_CONFIRMATION,
      ]
    );

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
      const formattedTime = createdAt.toLocaleString('ru-RU');

      const message =
        `${action === 'confirm' ? '✅ Оплата подтверждена!' : '❌ Оплата не прошла.'}\n\n` +
        `📦 Заказ #${orderDetails.order_number}\n` +
        `🧾 Состав заказа:\n${itemsText}\n\n` +
        `💰 Сумма: ${Number(orderDetails.total).toFixed(2)} ₽\n` +
        `🕒 Время оформления: ${formattedTime}\n` +
        (action === 'confirm'
          ? '\nСпасибо за заказ! Мы приступили к обработке.'
          : `\nЕсли оплата была проведена, свяжитесь с менеджером: ${config.support.managerPhone}`);

      await ctx.telegram.sendMessage(Number(orderDetails.telegram_id), message);
    }

    const groupChatId = Number(config.managers.groupChatId);
    if (Number.isFinite(groupChatId)) {
      await ctx.telegram.sendMessage(
        groupChatId,
        `${action === 'confirm' ? '✅ Оплата подтверждена' : '❌ Оплата не прошла'}\n` +
          `Заказ #${updatedOrder.order_number}\n` +
          `Менеджер: ${managerLabel}\n` +
          `Время: ${actionTime.toLocaleString('ru-RU')}`
      );
    }

    if ('message' in (ctx.callbackQuery as any)) {
      const originalMessage = (ctx.callbackQuery as any).message;
      const originalText = originalMessage?.text || '';
      const updatedText =
        `${originalText}\n\n` +
        `${action === 'confirm' ? '✅ Оплата подтверждена' : '❌ Оплата не прошла'}\n` +
        `Менеджер: ${managerLabel}\n` +
        `Время: ${actionTime.toLocaleString('ru-RU')}`;
      try {
        await ctx.editMessageText(updatedText, { reply_markup: { inline_keyboard: [] } });
      } catch (error) {
        logger.warn('Failed to edit manager message', error);
      }
    }

    await ctx.answerCbQuery(action === 'confirm' ? 'Оплата подтверждена' : 'Отмечено как не оплачено');
  } catch (error) {
    logger.error('Failed to handle payment callback', error);
    await ctx.answerCbQuery('Не удалось обновить статус');
  }
}
