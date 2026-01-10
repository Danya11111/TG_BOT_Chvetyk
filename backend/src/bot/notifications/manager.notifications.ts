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
