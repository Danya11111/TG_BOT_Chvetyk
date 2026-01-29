import { Context } from 'telegraf';
import { db } from '../../database/connection';
import { config } from '../../config';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { logger } from '../../utils/logger';
import { getLoyaltyInfoByTelegramId, syncUserBonusesToPosiflora } from '../../services/loyalty.service';
import {
  clearSupportPending,
  clearSupportSession,
  closeTicket,
  getOpenTicketByTelegramId,
} from '../support/support.service';

export async function handleCallback(ctx: Context): Promise<void> {
  // Логируем ВСЕ callback запросы в самом начале для диагностики
  logger.info('=== CALLBACK RECEIVED ===', {
    hasCallbackQuery: !!ctx.callbackQuery,
    callbackQueryType: ctx.callbackQuery ? typeof ctx.callbackQuery : 'none',
    fromId: ctx.from?.id,
    fromUsername: ctx.from?.username,
    fromFirstName: ctx.from?.first_name,
    messageId: (ctx.callbackQuery as any)?.message?.message_id,
    chatId: (ctx.callbackQuery as any)?.message?.chat?.id,
    rawCallbackData: (ctx.callbackQuery as any)?.data,
  });

  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) {
    logger.warn('Callback query without data', { 
      callbackQuery,
      callbackQueryKeys: callbackQuery ? Object.keys(callbackQuery) : [],
    });
    try {
      await ctx.answerCbQuery('Неизвестная команда');
    } catch (error) {
      logger.error('Failed to answer callback query (no data)', error);
    }
    return;
  }

  const callbackData = callbackQuery.data as string;

  if (!callbackData) {
    logger.warn('Empty callback data', { 
      callbackQuery,
      callbackQueryData: callbackQuery.data,
      callbackQueryDataType: typeof callbackQuery.data,
    });
    try {
      await ctx.answerCbQuery('Неизвестная команда');
    } catch (error) {
      logger.error('Failed to answer callback query (empty data)', error);
    }
    return;
  }

  logger.info('Received callback', { 
    callbackData, 
    from: ctx.from?.id, 
    username: ctx.from?.username,
    messageId: (ctx.callbackQuery as any)?.message?.message_id,
    chatId: (ctx.callbackQuery as any)?.message?.chat?.id,
    hasPhoto: !!(ctx.callbackQuery as any)?.message?.photo
  });

  // --- Support callbacks ---
  if (callbackData === 'support_close') {
    const user = ctx.from;
    if (!user) {
      await ctx.answerCbQuery('Неизвестная команда');
      return;
    }

    try {
      await clearSupportPending(user.id);
      const ticket = await getOpenTicketByTelegramId(user.id);
      if (ticket) {
        await closeTicket(ctx, ticket, undefined);
      } else {
        await clearSupportSession(user.id);
      }

      try {
        await (ctx as any).editMessageReplyMarkup({ inline_keyboard: [] });
      } catch {
        // ignore
      }
      // Do not notify client: close silently
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('Failed to close support via callback', {
        error: error instanceof Error ? error.message : String(error),
        telegramId: user.id,
      });
      await ctx.answerCbQuery();
    }
    return;
  }

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

  // Проверяем, что callback пришел из группы менеджеров
  // Разрешаем нажимать кнопку любому участнику группы
  const messageChatId = (ctx.callbackQuery as any)?.message?.chat?.id;
  const managerGroupChatId = config.orders.groupChatId ?? Number(config.managers.groupChatId);
  
  logger.info('Checking manager group access', {
    messageChatId,
    managerGroupChatId,
    isGroup: messageChatId < 0, // Группы имеют отрицательный chat_id
    matches: messageChatId === managerGroupChatId,
  });

  // Если callback не из группы менеджеров, отклоняем
  if (!messageChatId || messageChatId !== managerGroupChatId) {
    logger.warn('Callback not from manager group', {
      messageChatId,
      managerGroupChatId,
      fromId: ctx.from?.id,
      username: ctx.from?.username,
    });
    await ctx.answerCbQuery('Эта кнопка доступна только в группе менеджеров');
    return;
  }

  logger.info('Callback from manager group confirmed', {
    chatId: messageChatId,
    fromId: ctx.from?.id,
    username: ctx.from?.username,
    orderId,
  });

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
    
    // Если заказ уже в финальном статусе для этого действия, просто сообщаем
    if (action === 'confirm' && currentStatus.payment_status === PAYMENT_STATUSES.CONFIRMED) {
      await ctx.answerCbQuery('Оплата уже подтверждена');
      return;
    }
    
    if (action === 'reject' && currentStatus.payment_status === PAYMENT_STATUSES.REJECTED) {
      await ctx.answerCbQuery('Оплата уже отклонена');
      return;
    }

    // Обновляем заказ напрямую БЕЗ проверки статуса в WHERE
    // Это гарантирует, что кнопка работает в любом случае, пока заказ не в финальном статусе
    // Кнопка должна работать независимо от действий клиента
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
        RETURNING id, order_number, total, created_at, user_id
      `;
      queryParams = [
        PAYMENT_STATUSES.REJECTED,
        ORDER_STATUSES.CANCELLED,
        manager?.id || null,
        orderId,
      ];
    }

    logger.info('Executing update query', { orderId, action, queryParams: queryParams.map((p, i) => i === 2 ? '***' : p) });
    
    const updateResult = await db.query(updateQuery, queryParams);
    const updatedOrder = updateResult.rows[0];

    if (!updatedOrder) {
      logger.error('Failed to update order - no rows returned', { 
        orderId, 
        action, 
        rowCount: updateResult.rowCount,
        query: updateQuery.substring(0, 100)
      });
      
      // Проверяем еще раз статус заказа
      const recheckResult = await db.query(
        `SELECT payment_status, status FROM orders WHERE id = $1`,
        [orderId]
      );
      
      if (recheckResult.rows.length) {
        const currentStatus = recheckResult.rows[0];
        logger.info('Recheck order status', { orderId, currentPaymentStatus: currentStatus.payment_status, currentStatus: currentStatus.status });
        
        if (action === 'confirm' && currentStatus.payment_status === PAYMENT_STATUSES.CONFIRMED) {
          await ctx.answerCbQuery('Оплата уже подтверждена');
          return;
        }
        if (action === 'reject' && currentStatus.payment_status === PAYMENT_STATUSES.REJECTED) {
          await ctx.answerCbQuery('Оплата уже отклонена');
          return;
        }
      } else {
        logger.error('Order not found during recheck', { orderId });
      }
      
      await ctx.answerCbQuery('Не удалось обновить статус заказа');
      return;
    }

    logger.info('Order updated successfully', { orderId, action, updatedOrderId: updatedOrder.id });

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
              o.subtotal,
              o.total,
              o.bonus_used,
              o.bonus_accrued,
              o.created_at,
              u.id AS user_id,
              u.telegram_id
       FROM orders o
       INNER JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderDetailsResult.rows.length) {
      const orderDetails = orderDetailsResult.rows[0];
      const userId = Number(orderDetails.user_id || 0);
      const telegramId = Number(orderDetails.telegram_id || 0);
      const bonusUsed = Number(orderDetails.bonus_used || 0);
      const bonusAccruedExisting = Number(orderDetails.bonus_accrued || 0);

      let bonusAccrued = 0;
      try {
        if (action === 'confirm' && userId && telegramId && bonusAccruedExisting <= 0) {
          const loyalty = await getLoyaltyInfoByTelegramId(telegramId);
          const percent = Number(loyalty.tier.cashbackPercent || 0);
          const paidTotal = Number(orderDetails.total || 0);
          bonusAccrued = Math.max(0, Math.floor((paidTotal * percent) / 100));
          if (bonusAccrued > 0) {
            await db.query(
              `UPDATE users
               SET bonus_balance = bonus_balance + $1,
                   updated_at = NOW()
               WHERE id = $2`,
              [bonusAccrued, userId]
            );
            await db.query(`UPDATE orders SET bonus_accrued = $1 WHERE id = $2`, [bonusAccrued, orderId]);
            await db.query(
              `INSERT INTO bonus_history (user_id, order_id, type, amount, description)
               VALUES ($1, $2, 'accrued', $3, $4)`,
              [userId, orderId, bonusAccrued, 'ORDER_CASHBACK']
            );
            void syncUserBonusesToPosiflora(telegramId);
          }
        }

        if (action === 'reject' && userId && telegramId && bonusUsed > 0) {
          await db.query(
            `UPDATE users
             SET bonus_balance = bonus_balance + $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [bonusUsed, userId]
          );
          await db.query(
            `INSERT INTO bonus_history (user_id, order_id, type, amount, description)
             VALUES ($1, $2, 'cancelled', $3, $4)`,
            [userId, orderId, bonusUsed, 'ORDER_BONUS_REFUND']
          );
          void syncUserBonusesToPosiflora(telegramId);
        }
      } catch (bonusError) {
        logger.warn('Bonus processing failed', {
          orderId,
          action,
          error: bonusError instanceof Error ? bonusError.message : String(bonusError),
        });
      }

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
        (bonusUsed > 0 ? `🎁 Списано бонусами: ${Number(bonusUsed).toFixed(0)} ₽\n` : '') +
        (action === 'confirm' && bonusAccrued > 0 ? `✨ Начислено бонусов: ${Number(bonusAccrued).toFixed(0)} ₽\n` : '') +
        `🕒 Время оформления: ${formattedTime}\n` +
        (action === 'confirm'
          ? '\nОплата завершена, чек сформирован. Спасибо за заказ!'
          : `\nЕсли оплата была проведена, свяжитесь с менеджером: ${config.support.managerPhone}`);

      await ctx.telegram.sendMessage(Number(orderDetails.telegram_id), message);
    }

    // ВАЖНО: Сначала отвечаем на callback query, потом редактируем сообщение
    // Telegram требует ответа на callback query в течение нескольких секунд
    const answerText = action === 'confirm' ? 'Оплата подтверждена' : 'Отмечено как не оплачено';
    await ctx.answerCbQuery(answerText);
    logger.info(`Payment ${action === 'confirm' ? 'confirmed' : 'rejected'} for order ${orderId} by manager ${manager?.id}`);

    // После ответа на callback query редактируем сообщение
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
          logger.info('Message caption updated', { messageId: originalMessage?.message_id, orderId });
        } else {
          // Обычное текстовое сообщение
          await ctx.editMessageText(updatedText, { reply_markup: { inline_keyboard: [] } });
          logger.info('Message text updated', { messageId: originalMessage?.message_id, orderId });
        }
      } catch (error) {
        logger.warn('Failed to edit manager message', { 
          error, 
          messageId: originalMessage?.message_id,
          chatId: originalMessage?.chat?.id,
          hasPhoto: !!originalMessage?.photo,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Не прерываем выполнение, если не удалось отредактировать сообщение
        // Главное - callback query уже отвечен
      }
    }
  } catch (error) {
    logger.error('Failed to handle payment callback', {
      error,
      callbackData,
      orderId,
      action,
      managerId: manager?.id,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // ВАЖНО: Всегда отвечаем на callback query, даже при ошибке
    try {
      await ctx.answerCbQuery('Не удалось обновить статус. Попробуйте позже.');
    } catch (answerError) {
      logger.error('Failed to answer callback query', answerError);
      // Если не удалось ответить через answerCbQuery, пробуем через editMessageText
      try {
        if ('message' in (ctx.callbackQuery as any)) {
          const originalMessage = (ctx.callbackQuery as any).message;
          if (originalMessage) {
            await ctx.telegram.sendMessage(
              originalMessage.chat.id,
              '❌ Произошла ошибка при обработке. Попробуйте позже.'
            );
          }
        }
      } catch (sendError) {
        logger.error('Failed to send error message', sendError);
      }
    }
  }
}
