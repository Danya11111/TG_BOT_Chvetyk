import { Telegraf, Context } from 'telegraf';
import { config } from '../config';
import { logger } from '../utils/logger';
import { setupCommands } from './commands';
import { setupHandlers } from './handlers';

let bot: Telegraf | null = null;

export function initBot(): Telegraf {
  if (bot) {
    return bot;
  }

  bot = new Telegraf(config.telegram.botToken);

  // Обработка ошибок
  bot.catch((err, ctx) => {
    logger.error('Bot error:', err);
    try {
      ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    } catch (e) {
      logger.error('Error sending error message:', e);
    }
  });

  // Настройка команд (должно быть ПЕРЕД обработчиками текста, чтобы команды обрабатывались первыми)
  setupCommands(bot);
  logger.info('Commands registered');

  // Настройка обработчиков
  setupHandlers(bot);
  logger.info('Handlers registered');

  logger.info('✅ Telegram Bot initialized');

  return bot;
}

export function getBot(): Telegraf {
  if (!bot) {
    return initBot();
  }
  return bot;
}

export async function startBot(): Promise<void> {
  const botInstance = getBot();
  
  // Сначала всегда очищаем webhook перед запуском (на случай если был установлен)
  try {
    await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
    logger.info('Webhook cleared before bot start');
  } catch (webhookError) {
    // Игнорируем ошибки при очистке webhook (может не быть установлен)
    logger.debug('Webhook clear attempt (may not exist):', webhookError);
  }
  
  // Если ошибка 409 (конфликт), сначала очищаем webhook и getUpdates
  try {
    await botInstance.launch();
    logger.info('🚀 Telegram Bot started');
  } catch (error: any) {
    // Логируем полную информацию об ошибке для диагностики
    logger.error('Bot launch error details:', {
      errorMessage: error?.message,
      errorCode: error?.response?.error_code,
      errorDescription: error?.response?.description,
      errorStack: error?.stack,
      errorType: typeof error,
      errorKeys: error ? Object.keys(error) : [],
    });
    
    // Проверяем, это ли ошибка 409 (конфликт getUpdates)
    const is409Error = 
      error?.response?.error_code === 409 || 
      error?.response?.description?.includes('Conflict') ||
      error?.response?.description?.includes('getUpdates') ||
      error?.message?.includes('409') || 
      error?.message?.includes('Conflict') ||
      String(error).includes('409');
    
    if (is409Error) {
      logger.warn('Bot conflict detected (409), attempting to resolve...');
      
      try {
        // Очищаем webhook еще раз
        await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
        logger.info('Webhook cleared during conflict resolution');
        
        // Ждем больше времени перед повторной попыткой
        logger.info('Waiting 5 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Пробуем запустить снова
        logger.info('Retrying bot launch...');
        await botInstance.launch();
        logger.info('🚀 Telegram Bot started after conflict resolution');
      } catch (retryError: any) {
        logger.error('Failed to start bot after conflict resolution:', {
          errorMessage: retryError?.message,
          errorCode: retryError?.response?.error_code,
          errorDescription: retryError?.response?.description,
        });
        // Не бросаем ошибку, чтобы сервер продолжал работать
        logger.warn('Bot will not be available, but server continues running');
      }
    } else {
      logger.error('Failed to start bot (non-409 error):', error);
      // Для других ошибок тоже не бросаем, чтобы сервер работал
      logger.warn('Bot will not be available, but server continues running');
    }
  }
}

export async function stopBot(): Promise<void> {
  if (bot) {
    bot.stop();
    logger.info('Telegram Bot stopped');
  }
}

// Graceful shutdown
process.once('SIGINT', () => stopBot());
process.once('SIGTERM', () => stopBot());
