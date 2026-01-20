import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';
import { syncCatalogWithSite } from './sync-catalog';

let isRunning = false;

async function runOnce(): Promise<void> {
  if (isRunning) {
    logger.warn('Scraper: previous job still running, skip this tick');
    return;
  }
  isRunning = true;
  try {
    await syncCatalogWithSite();
  } catch (error) {
    logger.error('Scraper: job failed', error);
  } finally {
    isRunning = false;
  }
}

export function startScraperScheduler(): void {
  if (!config.scraper.enabled) {
    logger.info('Scraper: disabled by config');
    return;
  }

  logger.info(`Scraper: scheduling cron job with pattern "${config.scraper.cron}"`);
  cron.schedule(config.scraper.cron, runOnce);

  // первый запуск при старте
  runOnce().catch((err) => logger.error('Scraper: initial run failed', err));
}
