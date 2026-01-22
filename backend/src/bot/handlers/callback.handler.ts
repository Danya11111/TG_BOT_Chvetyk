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

  logger.info('Processing payment callback', { 
    callbackData, 
    action: callbackData.startsWith(confirmPrefix) ? 'confirm' : 'reject',
    from: ctx.from?.id,
    username: ctx.from?.username,
    messageId: (ctx.callbackQuery as any)?.message?.message_id,
    chatId: (ctx.callbackQuery as any)?.message?.chat?.id
  });

  const action = callbackData.startsWith(confirmPrefix) ? 'confirm' : 'reject';
  const orderId = parseInt(callbackData.replace(confirmPrefix, '').replace(rejectPrefix, ''), 10);
  if (Number.isNaN(orderId)) {
    logger.warn('Invalid order ID in callback', { callbackData, orderId });
    await ctx.answerCbQuery('Некорректный заказ');
    return;
  }

  const manager = ctx.from;
  const managerLabel = manager?.username ? `@${manager.username}` : manager?.first_name || 'менеджер';
  const actionTime = new Date();

  try {
    // Сначала проверяем текущий статус заказа
    const currentStatusResult = await db.query(
      `SELECT payment_status, status, order_number FROM orders WHERE id = $1`,
      [orderId]
    );
    
    if (!currentStatusResult.rows.length) {
      logger.warn('Order not found', { orderId });
      await ctx.answerCbQuery('Заказ не найден');
      return;
    }

    const currentStatus = currentStatusResult.rows[0];
    
    // Если заказ уже подтвержден или отклонен, просто сообщаем об этом
    if (action === 'confirm' && currentStatus.payment_status === PAYMENT_STATUSES.CONFIRMED) {
      await ctx.answerCbQuery('Оплата уже подтверждена');
      return;
    }
    
    if (action === 'reject' && currentStatus.payment_status === PAYMENT_STATUSES.REJECTED) {
      await ctx.answerCbQuery('Оплата уже отклонена');
      return;
    }

    // Используем параметризованные запросы для безопасности
    // Обновляем заказ напрямую, если он еще не в финальном статусе
    // Это гарантирует, что кнопка работает независимо от действий клиента
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
        WHERE id = $4
          AND payment_status != $1
        RETURNING id, order_number, total, created_at, user_id
      `;
      queryParams = [
        PAYMENT_STATUSES.CONFIRMED,
        ORDER_STATUSES.CONFIRMED,
        manager?.id || null,
        orderId,
      ];
    } else {
      updateQuery = `
        UPDATE orders
        SET payment_status = $1,
            status = $2,
            payment_rejected_by = $3,
            payment_rejected_at = NOW(),
            updated_at = NOW()
        WHERE id = $4
          AND payment_status != $1
        RETURNING id, order_number, total, created_at, user_id
      `;
      queryParams = [
        PAYMENT_STATUSES.REJECTED,
        ORDER_STATUSES.CANCELLED,
        manager?.id || null,
        orderId,
      ];
    }

    let updateResult = await db.query(updateQuery, queryParams);
    let updatedOrder = updateResult.rows[0];

    // Если обычное обновление не сработало, пытаемся принудительное обновление
    if (!updatedOrder) {
      // Проверяем текущий статус еще раз
      const latestStatusResult = await db.query(
        `SELECT payment_status FROM orders WHERE id = $1`,
        [orderId]
      );
      
      if (latestStatusResult.rows.length) {
        const latestStatus = latestStatusResult.rows[0].payment_status;
        
        // Если уже в финальном статусе, просто сообщаем
        if (action === 'confirm' && latestStatus === PAYMENT_STATUSES.CONFIRMED) {
          await ctx.answerCbQuery('Оплата уже подтверждена');
          return;
        }
        
        if (action === 'reject' && latestStatus === PAYMENT_STATUSES.REJECTED) {
          await ctx.answerCbQuery('Оплата уже отклонена');
          return;
        }
        
        // Пытаемся принудительное обновление (без проверки статуса в WHERE)
        // Это гарантирует, что кнопка работает независимо от действий клиента
        logger.info('Attempting force update', { orderId, action, currentStatus: latestStatus });
        
        const forceUpdateQuery = action === 'confirm' ? `
          UPDATE orders
          SET payment_status = $1,
              status = $2,
              payment_confirmed_by = $3,
              payment_confirmed_at = NOW(),
              updated_at = NOW()
          WHERE id = $4
          RETURNING id, order_number, total, created_at, user_id
        ` : `
          UPDATE orders
          SET payment_status = $1,
              status = $2,
              payment_rejected_by = $3,
              payment_rejected_at = NOW(),
              updated_at = NOW()
          WHERE id = $4
          RETURNING id, order_number, total, created_at, user_id
        `;
        
        const forceParams = action === 'confirm' 
          ? [PAYMENT_STATUSES.CONFIRMED, ORDER_STATUSES.CONFIRMED, manager?.id || null, orderId]
          : [PAYMENT_STATUSES.REJECTED, ORDER_STATUSES.CANCELLED, manager?.id || null, orderId];
        
        updateResult = await db.query(forceUpdateQuery, forceParams);
        updatedOrder = updateResult.rows[0];
        
        if (!updatedOrder) {
          logger.error('Failed to force update order', { orderId, action });
          await ctx.answerCbQuery('Не удалось обновить статус заказа');
          return;
        }
      } else {
        logger.error('Order not found', { orderId, action });
        await ctx.answerCbQuery('Заказ не найден');
        return;
      }
    }

    // Общий блок обработки после успешного обновления (работает для обычного и принудительного)

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
      const originalText = originalMessage?.text || originalMessage?.caption || '';
      const updatedText =
        `${originalText}\n\n` +
        `${action === 'confirm' ? '✅ Оплата подтверждена' : '❌ Оплата не прошла'}\n` +
        `Менеджер: ${managerLabel}\n` +
        `Время: ${actionTime.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;
      try {
        // Если это сообщение с фото (чек), обновляем caption
        if (originalMessage.photo && originalMessage.photo.length > 0) {
          await ctx.editMessageCaption(updatedText, { reply_markup: { inline_keyboard: [] } });
        } else {
          // Обычное текстовое сообщение
          await ctx.editMessageText(updatedText, { reply_markup: { inline_keyboard: [] } });
        }
      } catch (error) {
        logger.warn('Failed to edit manager message', { 
          error, 
          messageId: originalMessage?.message_id,
          hasPhoto: !!originalMessage?.photo,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        // Не прерываем выполнение, если не удалось отредактировать сообщение
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
