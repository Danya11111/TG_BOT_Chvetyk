import { createApp } from './api/app';
import { config } from './config';
import { logger } from './utils/logger';
import { testConnection } from './database/connection';
import { startBot } from './bot/bot';

async function startServer(): Promise<void> {
  try {
    // Проверка подключения к БД
    logger.info('Connecting to database...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed, but continuing...');
    }

    // Запуск API сервера
    const app = createApp();
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📍 API URL: ${config.apiUrl}`);
      logger.info(`🌐 Environment: ${config.nodeEnv}`);
    });

    // Запуск Telegram Bot
    logger.info('Starting Telegram Bot...');
    await startBot();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Запуск приложения
startServer();
