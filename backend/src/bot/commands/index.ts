import { Telegraf } from 'telegraf';
import { handleStart } from './start';
import { handleHelp } from './help';
import { handleMenu } from './menu';
import { logger } from '../../utils/logger';

export function setupCommands(bot: Telegraf): void {
  bot.command('start', async (ctx) => {
    logger.info('Command /start received');
    await handleStart(ctx);
  });
  bot.command('help', handleHelp);
  bot.command('menu', handleMenu);
  logger.info('Commands /start, /help, /menu registered');
}
