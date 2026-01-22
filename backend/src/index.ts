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
