import cron from 'node-cron';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { syncFloriaProductsToSnapshot } from './sync.service';

let isRunning = false;

async function runSync(): Promise<void> {
  if (isRunning) {
    logger.warn('Floria sync: previous job still running, skip this tick');
    return;
  }

  isRunning = true;
  try {
    await syncFloriaProductsToSnapshot();
  } catch (error) {
    logger.error('Floria sync failed', error);
  } finally {
    isRunning = false;
  }
}

export function startFloriaScheduler(): void {
  const fallbackCron = '0,20,40 * * * *';
  const cronExpression =
    config.floria.syncCron && cron.validate(config.floria.syncCron)
      ? config.floria.syncCron
      : fallbackCron;
  if (cronExpression !== config.floria.syncCron) {
    logger.warn('Floria sync: invalid cron expression, using fallback', {
      configured: config.floria.syncCron,
      fallback: fallbackCron,
    });
  }
  logger.info(`Floria products sync scheduled: "${cronExpression}"`);
  cron.schedule(cronExpression, runSync);

  if (config.floria.syncOnStartup) {
    const startupDelayMs = 8000;
    setTimeout(() => {
      runSync().catch((error) => logger.error('Floria sync initial run failed', error));
    }, startupDelayMs);
  }
}
