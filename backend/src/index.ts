import { createApp } from './api/app';
import { config } from './config';
import { logger } from './utils/logger';
import { testConnection } from './database/connection';
import { runMigrations } from './database/migrate';
import { startBot } from './bot/bot';
import { startScraperScheduler } from './scraper/scheduler';

async function startServer(): Promise<void> {
  try {
    // Обработка необработанных исключений
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      // Не завершаем процесс сразу, даем время на логирование
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Проверка подключения к БД с повторными попытками
    logger.info('Connecting to database...');
    let dbConnected = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      dbConnected = await testConnection();
      if (dbConnected) {
        logger.info('✅ Database connection established');
        break;
      }
      logger.warn(`Database connection attempt ${attempt}/5 failed, retrying in 3s...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    
    if (!dbConnected) {
      logger.error('❌ Failed to connect to database after 5 attempts');
      logger.warn('Continuing anyway, but database operations may fail...');
    }

    if (config.migrations.enabled) {
      logger.info('Running database migrations...');
      try {
        await runMigrations();
      } catch (error) {
        logger.error('Migration failed:', error);
        // Не завершаем процесс, возможно миграции уже применены
      }
    }

    // Запуск API сервера
    const app = createApp();
    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📍 API URL: ${config.apiUrl}`);
      logger.info(`🌐 Environment: ${config.nodeEnv}`);
    });

    // Обработка ошибок сервера
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
    });

    // Запуск Telegram Bot (не блокируем запуск сервера при ошибке бота)
    logger.info('Starting Telegram Bot...');
    try {
      await startBot();
      
      // Периодическая проверка webhook (каждую минуту для более быстрого восстановления)
      setInterval(async () => {
        try {
          const { getBot } = await import('./bot/bot');
          const bot = getBot();
          const webhookInfo = await bot.telegram.getWebhookInfo();
          const expectedWebhookUrl = `${config.apiUrl}/api/telegram/webhook`;
          
          if (!webhookInfo.url || webhookInfo.url !== expectedWebhookUrl) {
            logger.warn('⚠️ Webhook was removed or changed, re-setting...', {
              currentUrl: webhookInfo.url || '(empty)',
              expectedUrl: expectedWebhookUrl,
              pendingUpdates: webhookInfo.pending_update_count,
            });
            
            try {
              // Очищаем старый webhook
              await bot.telegram.deleteWebhook({ drop_pending_updates: false });
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Устанавливаем новый
              const setResult = await bot.telegram.setWebhook(expectedWebhookUrl, {
                drop_pending_updates: false,
                allowed_updates: ['message', 'callback_query', 'inline_query', 'chosen_inline_result'],
              });
              
              logger.info('✅ Webhook re-set:', { 
                url: expectedWebhookUrl,
                result: setResult,
              });
              
              // Проверяем через 5 секунд (больше времени для Telegram)
              await new Promise(resolve => setTimeout(resolve, 5000));
              const verifyInfo = await bot.telegram.getWebhookInfo();
              if (verifyInfo.url === expectedWebhookUrl) {
                logger.info('✅ Webhook verified after re-set', {
                  url: verifyInfo.url,
                  pendingUpdates: verifyInfo.pending_update_count,
                });
              } else {
                logger.error('❌ Webhook re-set but verification failed:', {
                  expected: expectedWebhookUrl,
                  actual: verifyInfo.url || '(empty)',
                  pendingUpdates: verifyInfo.pending_update_count,
                });
                logger.warn('💡 This may indicate that Telegram cannot reach the endpoint or it responds incorrectly');
              }
            } catch (setError: any) {
              logger.error('❌ Failed to re-set webhook:', {
                errorMessage: setError?.message,
                errorCode: setError?.response?.error_code,
                errorDescription: setError?.response?.description,
              });
            }
          } else {
            logger.debug('✅ Webhook is correctly set:', { 
              url: webhookInfo.url,
              pendingUpdates: webhookInfo.pending_update_count,
            });
          }
        } catch (error) {
          logger.warn('⚠️ Webhook check failed:', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }, 60 * 1000); // Каждую минуту для более быстрого восстановления
    } catch (error) {
      logger.error('Failed to start Telegram Bot:', error);
      logger.warn('Continuing without bot...');
    }

    // Запуск скрейпера каталога (ежечасно)
    try {
      startScraperScheduler();
    } catch (error) {
      logger.error('Failed to start scraper scheduler:', error);
      logger.warn('Continuing without scraper...');
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // Принудительное завершение через 10 секунд
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // Принудительное завершение через 10 секунд
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Даем время на логирование перед завершением
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  }
}

// Запуск приложения
startServer();
