import { syncCatalogFromPosiflora } from './catalog.service';
import { syncCustomersFromPosiflora } from './customers.service';
import { logger } from '../../utils/logger';

const timeoutMs = parseInt(process.env.POSIFLORA_SYNC_TIMEOUT_MS || '300000', 10);

async function run(): Promise<void> {
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => reject(new Error('Posiflora manual sync timeout')), timeoutMs);
  });

  try {
    await Promise.race([
      (async () => {
        await syncCatalogFromPosiflora();
        await syncCustomersFromPosiflora();
      })(),
      timeoutPromise,
    ]);
  } catch (error) {
    logger.error('Posiflora manual sync failed', error);
  }
}

run()
  .catch((error) => {
    logger.error('Posiflora manual sync crash', error);
  })
  .finally(() => {
    process.exit(0);
  });
