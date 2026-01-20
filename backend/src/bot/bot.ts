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
  try {
    await botInstance.launch();
    logger.info('🚀 Telegram Bot started');
  } catch (error) {
    logger.error('Failed to start bot:', error);
    throw error;
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
