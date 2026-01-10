import { getBot } from '../bot';
import { logger } from '../../utils/logger';
import { ORDER_STATUSES } from '../../utils/constants';

interface OrderNotification {
  orderNumber: string;
  status: string;
  total: number;
  customerName?: string;
  customerPhone?: string;
}

export async function notifyOrderStatusUpdate(
  telegramId: number,
  order: OrderNotification
): Promise<void> {
  try {
    const bot = getBot();
    
    const statusMessages: Record<string, string> = {
      [ORDER_STATUSES.NEW]: 'Ваш заказ принят в обработку',
      [ORDER_STATUSES.CONFIRMED]: 'Ваш заказ подтверждён',
      [ORDER_STATUSES.PROCESSING]: 'Ваш заказ собирается',
      [ORDER_STATUSES.READY]: 'Ваш заказ готов к выдаче',
      [ORDER_STATUSES.SHIPPED]: 'Ваш заказ отправлен',
      [ORDER_STATUSES.IN_DELIVERY]: 'Ваш заказ в доставке',
      [ORDER_STATUSES.DELIVERED]: 'Ваш заказ доставлен',
      [ORDER_STATUSES.COMPLETED]: 'Ваш заказ выполнен',
      [ORDER_STATUSES.CANCELLED]: 'Ваш заказ отменён',
    };

    const statusMessage = statusMessages[order.status] || 'Статус вашего заказа изменён';

    await bot.telegram.sendMessage(
      telegramId,
      `📦 Заказ #${order.orderNumber}\n\n` +
      `📊 Статус: ${statusMessage}\n` +
      `💰 Сумма: ${order.total.toFixed(2)} ₽\n\n` +
      `Вы можете отслеживать статус заказа в приложении.`
    );

    logger.info(`Order status notification sent to user ${telegramId} for order ${order.orderNumber}`);
  } catch (error) {
    logger.error(`Failed to send order notification to user ${telegramId}:`, error);
  }
}
