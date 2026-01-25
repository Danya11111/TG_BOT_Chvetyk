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
  
  // ВСЕГДА сначала очищаем webhook, чтобы использовать polling
  try {
    const webhookInfo = await botInstance.telegram.getWebhookInfo();
    if (webhookInfo.url) {
      logger.info('Webhook found, clearing it to use polling mode:', { url: webhookInfo.url });
      await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.info('Webhook cleared, starting polling...');
    } else {
      logger.info('No webhook set, attempting to start polling...');
    }
  } catch (webhookError) {
    logger.debug('Webhook info check failed, attempting polling:', webhookError);
  }
  
  // Пытаемся запустить polling с агрессивными retry
  let pollingSuccess = false;
  const maxRetries = 5;
  const retryDelays = [5, 10, 15, 20, 30]; // секунды
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting to start bot in polling mode (attempt ${attempt}/${maxRetries})...`);
      
      // Очищаем webhook перед каждой попыткой
      try {
        await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (deleteError) {
        // Игнорируем ошибки удаления webhook
      }
      
      await botInstance.launch();
      logger.info('🚀 Telegram Bot started (polling mode)');
      pollingSuccess = true;
      break;
    } catch (error: any) {
      // Логируем информацию об ошибке
      const is409Error = 
        error?.response?.error_code === 409 || 
        error?.response?.description?.includes('Conflict') ||
        error?.response?.description?.includes('getUpdates') ||
        error?.message?.includes('409') || 
        error?.message?.includes('Conflict') ||
        String(error).includes('409');
      
      if (is409Error) {
        logger.warn(`Bot conflict detected (409) on attempt ${attempt}/${maxRetries}:`, {
          errorMessage: error?.message,
          errorCode: error?.response?.error_code,
        });
        
        if (attempt < maxRetries) {
          const delay = retryDelays[attempt - 1];
          logger.info(`Waiting ${delay} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
          continue; // Пробуем снова
        } else {
          logger.error('Failed to start bot after all polling retries');
        }
      } else {
        logger.error('Bot launch error (non-409):', {
          errorMessage: error?.message,
          errorCode: error?.response?.error_code,
          errorDescription: error?.response?.description,
        });
        break; // Для не-409 ошибок не retry
      }
    }
  }
  
  // Если polling не удался, пробуем webhook как последний вариант
  if (!pollingSuccess) {
    logger.warn('Polling failed, attempting to use webhook as last resort...');
    try {
      const webhookUrl = `${config.apiUrl}/api/telegram/webhook`;
      logger.info(`Setting webhook to: ${webhookUrl}`);
      
      await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const setWebhookResult = await botInstance.telegram.setWebhook(webhookUrl, {
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query', 'inline_query', 'chosen_inline_result'],
      });
      
      logger.info('Webhook set result:', { result: setWebhookResult });
      
      // Проверяем через 3 секунды
      await new Promise(resolve => setTimeout(resolve, 3000));
      const verifyWebhook = await botInstance.telegram.getWebhookInfo();
      if (verifyWebhook.url === webhookUrl) {
        logger.info(`✅ Webhook set as fallback: ${webhookUrl}`);
        logger.warn('⚠️ Note: Webhook may be removed by Telegram if endpoint is not accessible');
      } else {
        logger.error('❌ Webhook fallback failed:', {
          expected: webhookUrl,
          actual: verifyWebhook.url || '(empty)',
        });
        logger.error('❌ Bot cannot start. Please check:');
        logger.error('   1. No other bot instances are running with the same token');
        logger.error('   2. Webhook endpoint is publicly accessible');
        logger.error('   3. Server firewall allows incoming connections');
      }
    } catch (webhookError: any) {
      logger.error('Failed to set webhook (final attempt):', {
        errorMessage: webhookError?.message,
        errorCode: webhookError?.response?.error_code,
        errorDescription: webhookError?.response?.description,
      });
      logger.error('❌ Bot cannot start. Please check for other bot instances or network issues.');
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
