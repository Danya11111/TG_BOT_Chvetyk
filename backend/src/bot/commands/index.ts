import { Telegraf } from 'telegraf';
import { handleStart } from './start';
import { handleHelp } from './help';
import { handleMenu } from './menu';

export function setupCommands(bot: Telegraf): void {
  bot.command('start', handleStart);
  bot.command('help', handleHelp);
  bot.command('menu', handleMenu);
}
