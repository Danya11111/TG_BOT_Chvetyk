import { pool } from '../database/connection';
import { cache } from '../database/redis';
import { logger } from '../utils/logger';
import { scrapeCatalog } from './site-scraper';
import { ScrapedCategory, ScrapedProduct } from './types';

function now() {
  return new Date();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function upsertCategories(categories: ScrapedCategory[]): Promise<Map<string, number>> {
  const client = await pool.connect();
  const slugToId = new Map<string, number>();

  try {
    await client.query('BEGIN');

    for (const category of categories) {
      const slug = category.slug || slugify(category.name);
      const result = await client.query(
        `
          INSERT INTO categories (name, slug, description, image_url, sort_order, is_active, updated_at)
          VALUES ($1, $2, $3, $4, $5, true, $6)
          ON CONFLICT (slug) DO UPDATE
            SET name = EXCLUDED.name,
                description = EXCLUDED.description,
                image_url = COALESCE(EXCLUDED.image_url, categories.image_url),
                sort_order = COALESCE(EXCLUDED.sort_order, categories.sort_order),
                is_active = true,
                updated_at = EXCLUDED.updated_at
          RETURNING id;
        `,
        [category.name, slug, null, category.image || null, category.sort || 0, now()]
      );
      slugToId.set(slug, result.rows[0].id);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Scraper sync: failed to upsert categories', error);
    throw error;
  } finally {
    client.release();
  }

  return slugToId;
}

async function upsertProducts(products: ScrapedProduct[], categoryMap: Map<string, number>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const product of products) {
      const categoryId = product.categorySlug ? categoryMap.get(product.categorySlug) : null;
      const posId = product.url; // используем URL как уникальный идентификатор до подключения Posiflora

      await client.query(
        `
        INSERT INTO products (
          posiflora_id,
          name,
          description,
          price,
          old_price,
          currency,
          category_id,
          images,
          in_stock,
          stock_quantity,
          attributes,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'RUB', $6, $7, $8, $9, $10, $11
        )
        ON CONFLICT (posiflora_id) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              price = EXCLUDED.price,
              old_price = EXCLUDED.old_price,
              category_id = EXCLUDED.category_id,
              images = EXCLUDED.images,
              in_stock = EXCLUDED.in_stock,
              stock_quantity = EXCLUDED.stock_quantity,
              attributes = EXCLUDED.attributes,
              updated_at = EXCLUDED.updated_at;
      `,
        [
          posId,
          product.name,
          product.description || null,
          product.price,
          product.oldPrice || null,
          categoryId,
          JSON.stringify(product.images || []),
          product.inStock,
          product.inStock ? 1 : 0,
          JSON.stringify(product.attributes || { sourceUrl: product.url }),
          now(),
        ]
      );
    }

    // помечаем отсутствующие товары как не в наличии
    const currentUrls = products.map((p) => p.url);
    await client.query(
      `
        UPDATE products
        SET in_stock = false, updated_at = $1
        WHERE posiflora_id NOT IN (${currentUrls.map((_, i) => `$${i + 2}`).join(', ')})
      `,
      [now(), ...currentUrls]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Scraper sync: failed to upsert products', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function syncCatalogWithSite(): Promise<void> {
  logger.info('Scraper: start sync with client site');
  const { categories, products } = await scrapeCatalog();

  if (!products.length) {
    logger.warn('Scraper: no products parsed, skip DB update');
    return;
  }

  const categoryMap = await upsertCategories(categories);
  await upsertProducts(products, categoryMap);

  // очистка кэша
  await cache.clearPattern('products:*');
  await cache.clearPattern('categories:*');

  logger.info(`Scraper: sync done. Categories: ${categories.length}, products: ${products.length}`);
}
