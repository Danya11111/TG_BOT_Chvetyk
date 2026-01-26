import { syncCatalogFromPosiflora } from './catalog.service';
import { syncCustomersFromPosiflora } from './customers.service';
import { logger } from '../../utils/logger';

async function run(): Promise<void> {
  try {
    await syncCatalogFromPosiflora();
    await syncCustomersFromPosiflora();
  } catch (error) {
    logger.error('Posiflora manual sync failed', error);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  logger.error('Posiflora manual sync crash', error);
  process.exit(1);
});
