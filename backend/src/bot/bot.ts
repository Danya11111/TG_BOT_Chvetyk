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
  
  // Проверяем, установлен ли webhook
  try {
    const webhookInfo = await botInstance.telegram.getWebhookInfo();
    if (webhookInfo.url) {
      logger.info('✅ Webhook already set, bot will receive updates via webhook:', { url: webhookInfo.url });
      // Если webhook установлен, не пытаемся запустить polling
      return;
    }
    logger.info('No webhook set, attempting to start polling...');
  } catch (webhookError) {
    logger.debug('Webhook info check failed, attempting polling:', webhookError);
  }
  
  // Если webhook не установлен, пытаемся запустить polling
  try {
    await botInstance.launch();
    logger.info('🚀 Telegram Bot started (polling mode)');
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
      
      // Пробуем несколько раз с увеличивающейся задержкой
      let retrySuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Очищаем webhook еще раз
          await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
          logger.info(`Webhook cleared during conflict resolution (attempt ${attempt}/3)`);
          
          // Ждем с увеличивающейся задержкой: 10, 20, 30 секунд
          const waitTime = attempt * 10;
          logger.info(`Waiting ${waitTime} seconds before retry (attempt ${attempt}/3)...`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          
          // Пробуем запустить снова
          logger.info(`Retrying bot launch (attempt ${attempt}/3)...`);
          await botInstance.launch();
          logger.info('🚀 Telegram Bot started after conflict resolution');
          retrySuccess = true;
          break;
        } catch (retryError: any) {
          logger.warn(`Bot launch retry ${attempt}/3 failed:`, {
            errorMessage: retryError?.message,
            errorCode: retryError?.response?.error_code,
            errorDescription: retryError?.response?.description,
          });
          
          if (attempt === 3) {
            logger.error('Failed to start bot after 3 retry attempts:', {
              errorMessage: retryError?.message,
              errorCode: retryError?.response?.error_code,
              errorDescription: retryError?.response?.description,
            });
            logger.warn('⚠️ Bot will not be available. Another bot instance is likely running elsewhere.');
            logger.warn('⚠️ Check for other servers/containers using the same bot token.');
          }
        }
      }
      
      if (!retrySuccess) {
        // Пробуем использовать webhook как fallback
        logger.warn('Polling failed, attempting to use webhook instead...');
        try {
          const webhookUrl = `${config.apiUrl}/api/telegram/webhook`;
          logger.info(`Setting webhook to: ${webhookUrl}`);
          
          const setWebhookResult = await botInstance.telegram.setWebhook(webhookUrl, {
            drop_pending_updates: true,
          });
          
          logger.info('Webhook set result:', { result: setWebhookResult });
          
          // Проверяем, что webhook действительно установлен
          const verifyWebhook = await botInstance.telegram.getWebhookInfo();
          if (verifyWebhook.url === webhookUrl) {
            logger.info(`✅ Webhook verified and set successfully: ${webhookUrl}`);
            logger.info('🚀 Bot will receive updates via webhook instead of polling');
          } else {
            logger.warn('Webhook set but verification failed:', { 
              expected: webhookUrl, 
              actual: verifyWebhook.url 
            });
          }
        } catch (webhookError: any) {
          logger.error('Failed to set webhook:', {
            errorMessage: webhookError?.message,
            errorCode: webhookError?.response?.error_code,
            errorDescription: webhookError?.response?.description,
            webhookUrl: `${config.apiUrl}/api/telegram/webhook`,
          });
          logger.warn('Bot will not be available, but server continues running');
          logger.error('❌ CRITICAL: Bot cannot start due to 409 conflict.');
          logger.error('❌ Another bot instance is running elsewhere with the same token.');
          logger.error('❌ To fix this, you need to:');
          logger.error('   1. Find and stop the other bot instance');
          logger.error('   2. Check other servers/containers using this bot token');
          logger.error('   3. Or wait for the other instance to stop naturally');
          logger.warn('💡 Manual webhook setup:');
          logger.warn(`   curl -X POST "https://api.telegram.org/bot${config.telegram.botToken.substring(0, 10)}.../setWebhook?url=${config.apiUrl}/api/telegram/webhook&drop_pending_updates=true"`);
        }
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
