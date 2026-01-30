import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';
import { getFloriaProducts } from './client';
import { mapFloriaProductToProduct } from './mapper';
import type { FloriaProductRaw } from './types';

const PAGE_SIZE = 100;
const NOW = new Date();

function mappedToRow(mapped: ReturnType<typeof mapFloriaProductToProduct>) {
  return {
    floria_id: mapped.id,
    name: mapped.name,
    price: mapped.price,
    old_price: mapped.old_price ?? null,
    currency: mapped.currency,
    category_name: mapped.category_name ?? null,
    images: JSON.stringify(mapped.images),
    in_stock: mapped.in_stock,
    composition: mapped.composition ?? null,
    attributes: JSON.stringify(mapped.attributes ?? {}),
    synced_at: NOW,
  };
}

/**
 * Sync Floria catalog into floria_products_snapshot table.
 * Fetches all products (categoryId 0), then marks showcase products (categoryId -1).
 */
export async function syncFloriaProductsToSnapshot(): Promise<void> {
  logger.info('Floria products sync started');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let offset = 0;
    let totalUpserted = 0;

    do {
      const raw: FloriaProductRaw[] = await getFloriaProducts({
        categoryId: 0,
        limit: PAGE_SIZE,
        offset,
        needComposition: 0,
      });

      for (const item of raw) {
        const mapped = mapFloriaProductToProduct(item);
        const row = mappedToRow(mapped);
        await client.query(
          `
          INSERT INTO floria_products_snapshot (
            floria_id, name, price, old_price, currency, category_name,
            images, in_stock, composition, attributes, in_showcase, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, false, $11)
          ON CONFLICT (floria_id) DO UPDATE SET
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            old_price = EXCLUDED.old_price,
            currency = EXCLUDED.currency,
            category_name = EXCLUDED.category_name,
            images = EXCLUDED.images,
            in_stock = EXCLUDED.in_stock,
            composition = EXCLUDED.composition,
            attributes = EXCLUDED.attributes,
            synced_at = EXCLUDED.synced_at
          `,
          [
            row.floria_id,
            row.name,
            row.price,
            row.old_price,
            row.currency,
            row.category_name,
            row.images,
            row.in_stock,
            row.composition,
            row.attributes,
            row.synced_at,
          ]
        );
      }
      totalUpserted += raw.length;
      if (raw.length < PAGE_SIZE) break;
      offset += raw.length;
    } while (true);

    const showcaseIds: number[] = [];
    offset = 0;
    do {
      const raw: FloriaProductRaw[] = await getFloriaProducts({
        categoryId: -1,
        limit: PAGE_SIZE,
        offset,
        needComposition: 0,
      });
      for (const item of raw) {
        const id = Number(item.id);
        if (Number.isFinite(id)) showcaseIds.push(id);
      }
      if (raw.length < PAGE_SIZE) break;
      offset += raw.length;
    } while (true);

    await client.query('UPDATE floria_products_snapshot SET in_showcase = false');
    if (showcaseIds.length > 0) {
      await client.query(
        'UPDATE floria_products_snapshot SET in_showcase = true, synced_at = $1 WHERE floria_id = ANY($2)',
        [NOW, showcaseIds]
      );
    }

    await client.query('COMMIT');
    logger.info('Floria products sync finished', { totalUpserted, showcaseCount: showcaseIds.length });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Floria products sync failed', error);
    throw error;
  } finally {
    client.release();
  }
}
