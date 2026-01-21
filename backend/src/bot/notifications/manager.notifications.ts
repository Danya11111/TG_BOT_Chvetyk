import { Markup } from 'telegraf';
import { getBot } from '../bot';
import { config } from '../../config';
import { logger } from '../../utils/logger';

interface NewOrderNotification {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  itemsCount: number;
  deliveryType: string;
}

export async function notifyManagerNewOrder(order: NewOrderNotification): Promise<void> {
  try {
    const bot = getBot();
    
    const message = 
      `🆕 НОВЫЙ ЗАКАЗ\n\n` +
      `📦 Номер заказа: #${order.orderNumber}\n` +
      `👤 Клиент: ${order.customerName}\n` +
      `📱 Телефон: ${order.customerPhone}\n` +
      `💰 Сумма: ${order.total.toFixed(2)} ₽\n` +
      `📦 Товаров: ${order.itemsCount}\n` +
      `🚚 Тип доставки: ${order.deliveryType === 'delivery' ? 'Доставка' : 'Самовывоз'}\n\n` +
      `Заказ создан через Telegram Bot.`;

    // Отправка уведомления всем менеджерам
    for (const managerId of config.managers.telegramIds) {
      try {
        await bot.telegram.sendMessage(parseInt(managerId), message);
        logger.info(`New order notification sent to manager ${managerId}`);
      } catch (error) {
        logger.error(`Failed to send notification to manager ${managerId}:`, error);
      }
    }
  } catch (error) {
    logger.error('Failed to send manager notification:', error);
  }
}

interface PaymentRequestNotification {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerTelegramId?: number;
  customerTelegramUsername?: string;
  deliveryType: string;
  deliveryAddress?: {
    city: string;
    street: string;
    house: string;
    apartment?: string;
  };
  deliveryDate: string;
  deliveryTime: string;
  recipientName: string;
  recipientPhone: string;
  cardText: string;
  comment?: string;
  total: number;
  items: Array<{
    productId: number;
    productName: string;
    price: number;
    quantity: number;
    image?: string | null;
  }>;
}

interface PaymentReceiptNotification {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerTelegramId?: number;
  customerTelegramUsername?: string;
  imageBuffer: Buffer;
  fileName?: string;
}

const formatAddress = (address?: PaymentRequestNotification['deliveryAddress']): string => {
  if (!address) {
    return 'Самовывоз';
  }
  const parts = [address.city, address.street, address.house].filter(Boolean);
  if (address.apartment) {
    parts.push(`кв. ${address.apartment}`);
  }
  return parts.join(', ');
};

const formatTelegramContact = (telegramId?: number, telegramUsername?: string): string | null => {
  if (telegramUsername) {
    return `@${telegramUsername}`;
  }
  if (telegramId) {
    return `tg://user?id=${telegramId}`;
  }
  return null;
};

export async function notifyManagerPaymentRequest(order: PaymentRequestNotification): Promise<void> {
  try {
    const chatId = Number(config.managers.groupChatId);
    const bot = getBot();
    const itemsText = order.items
      .map(
        (item) =>
          `• ${item.productName} × ${item.quantity} = ${(item.price * item.quantity).toFixed(2)} ₽`
      )
      .join('\n');

    const message =
      `💳 ОЖИДАНИЕ ОПЛАТЫ\n` +
      `Клиент приступил к оплате.\n\n` +
      `📦 Заказ: #${order.orderNumber}\n` +
      `👤 Клиент: ${order.customerName}\n` +
      `📱 Телефон: ${order.customerPhone}\n` +
      `${formatTelegramContact(order.customerTelegramId, order.customerTelegramUsername)
        ? `💬 Telegram: ${formatTelegramContact(order.customerTelegramId, order.customerTelegramUsername)}\n`
        : ''}` +
      `${order.customerEmail ? `✉️ Email: ${order.customerEmail}\n` : ''}` +
      `🚚 Получение: ${order.deliveryType === 'delivery' ? 'Доставка' : 'Самовывоз'}\n` +
      `📍 Адрес: ${formatAddress(order.deliveryAddress)}\n` +
      `🗓 Дата/время: ${order.deliveryDate} ${order.deliveryTime}\n` +
      `🎁 Получатель: ${order.recipientName} (${order.recipientPhone})\n` +
      `💌 Текст открытки: ${order.cardText || '—'}\n` +
      `${order.comment ? `📝 Комментарий: ${order.comment}\n` : ''}` +
      `\n🧾 Состав заказа:\n${itemsText}\n\n` +
      `💰 Итого: ${order.total.toFixed(2)} ₽\n\n` +
      `После получения оплаты подтвердите статус.`;

    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback('✅ Подтвердить оплату', `payment_confirm:${order.orderId}`),
      Markup.button.callback('❌ Не оплачено', `payment_reject:${order.orderId}`),
    ]);

    const sendToManagers = async () => {
      if (!config.managers.telegramIds.length) {
        logger.warn('Manager telegram ids are not configured');
        return;
      }
      for (const managerId of config.managers.telegramIds) {
        try {
          await bot.telegram.sendMessage(parseInt(managerId, 10), message, keyboard);
        } catch (error) {
          logger.error(`Failed to send payment request to manager ${managerId}:`, error);
        }
      }
    };

    if (!Number.isFinite(chatId)) {
      logger.warn('Manager group chat id is not configured');
      await sendToManagers();
      return;
    }

    try {
      await bot.telegram.sendMessage(chatId, message, keyboard);
      logger.info(`Payment request sent to manager group for order ${order.orderNumber}`);
    } catch (error) {
      logger.error('Failed to send payment request to manager group:', error);
      await sendToManagers();
    }
  } catch (error) {
    logger.error('Failed to send payment request to managers:', error);
  }
}

export async function notifyManagerPaymentReceipt(
  receipt: PaymentReceiptNotification
): Promise<void> {
  try {
    const chatId = Number(config.managers.groupChatId);
    const bot = getBot();
    const caption =
      `🧾 ЧЕК ПО ОПЛАТЕ\n` +
      `Заказ: #${receipt.orderNumber}\n` +
      `👤 Клиент: ${receipt.customerName}\n` +
      `📱 Телефон: ${receipt.customerPhone}\n` +
      `${formatTelegramContact(receipt.customerTelegramId, receipt.customerTelegramUsername)
        ? `💬 Telegram: ${formatTelegramContact(receipt.customerTelegramId, receipt.customerTelegramUsername)}\n`
        : ''}` +
      `Проверьте оплату и подтвердите заказ.`;

    const sendToManagers = async () => {
      if (!config.managers.telegramIds.length) {
        logger.warn('Manager telegram ids are not configured');
        return;
      }
      for (const managerId of config.managers.telegramIds) {
        try {
          await bot.telegram.sendPhoto(
            parseInt(managerId, 10),
            { source: receipt.imageBuffer, filename: receipt.fileName || 'receipt.jpg' },
            { caption }
          );
        } catch (error) {
          logger.error(`Failed to send receipt to manager ${managerId}:`, error);
        }
      }
    };

    if (!Number.isFinite(chatId)) {
      logger.warn('Manager group chat id is not configured');
      await sendToManagers();
      return;
    }

    try {
      await bot.telegram.sendPhoto(
        chatId,
        { source: receipt.imageBuffer, filename: receipt.fileName || 'receipt.jpg' },
        { caption }
      );
      logger.info(`Payment receipt sent to manager group for order ${receipt.orderNumber}`);
    } catch (error) {
      logger.error('Failed to send payment receipt to manager group:', error);
      await sendToManagers();
    }
  } catch (error) {
    logger.error('Failed to send payment receipt to managers:', error);
  }
}
