import cron from 'node-cron';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { syncCatalogFromPosiflora } from './catalog.service';
import { syncCustomersFromPosiflora } from './customers.service';

let isRunning = false;

async function runSync(): Promise<void> {
  if (isRunning) {
    logger.warn('Posiflora sync: previous job still running, skip this tick');
    return;
  }

  isRunning = true;
  try {
    await syncCatalogFromPosiflora();
    await syncCustomersFromPosiflora();
  } catch (error) {
    logger.error('Posiflora sync failed', error);
  } finally {
    isRunning = false;
  }
}

export function startPosifloraScheduler(): void {
  if (!config.posiflora.enabled || !config.posiflora.syncEnabled) {
    logger.info('Posiflora sync scheduler disabled');
    return;
  }

  logger.info(`Posiflora sync scheduled: "${config.posiflora.syncCron}"`);
  cron.schedule(config.posiflora.syncCron, runSync);

  if (config.posiflora.syncOnStartup) {
    runSync().catch((error) => logger.error('Posiflora sync initial run failed', error));
  }
}
