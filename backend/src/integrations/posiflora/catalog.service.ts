import { pool } from '../../database/connection';
import { cache } from '../../database/redis';
import { logger } from '../../utils/logger';
import { posifloraApiClient } from './api-client';
import { config } from '../../config';

interface CatalogCategoryAttributes {
  title: string;
  status: string;
  path?: string[];
  pathIds?: string[];
  deleted?: boolean;
}

interface CatalogCategory {
  id: string;
  type: 'categories';
  attributes: CatalogCategoryAttributes;
  relationships?: {
    parent?: { data: { id: string; type: 'categories' } | null };
  };
}

interface CatalogCategoryResponse {
  data: CatalogCategory[];
}

interface CatalogItemAttributes {
  itemId: string;
  itemType: string;
  title: string;
  minPrice?: number;
  maxPrice?: number;
  public?: boolean;
  revision?: number;
}

interface CatalogItem {
  id: string;
  type: 'catalog-items';
  attributes: CatalogItemAttributes;
  relationships?: {
    category?: { data: { id: string; type: 'categories' } | null };
    logo?: { data: { id: string; type: 'images' } | null };
  };
}

interface CatalogItemsResponse {
  data: CatalogItem[];
  meta?: {
    page?: { number?: number; size?: number };
    total?: number;
  };
}

interface InventoryItemResponse {
  data: {
    id: string;
    type: 'inventory-items';
    attributes?: {
      title?: string;
      description?: string | null;
      priceMin?: number;
      priceMax?: number;
      public?: boolean;
    };
    relationships?: {
      logo?: { data: { id: string; type: 'images' } | null };
    };
  };
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const resolvePrice = (minPrice?: number, maxPrice?: number): number => {
  if (typeof minPrice === 'number' && minPrice > 0) return minPrice;
  if (typeof maxPrice === 'number' && maxPrice > 0) return maxPrice;
  return 0;
};

const stripHtml = (value?: string | null): string | null => {
  if (!value) return null;
  const withoutTags = value.replace(/<[^>]*>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim() || null;
};

const extractComposition = (value?: string | null): string | null => {
  if (!value) return null;
  const text = stripHtml(value) || '';
  const match = text.match(/состав[:\-]\s*(.+)/i);
  if (!match?.[1]) return null;
  const tail = match[1];
  const stop = tail.search(/\b(описание|размер|срок|условия|доставка)\b/i);
  return (stop >= 0 ? tail.slice(0, stop) : tail).trim() || null;
};

async function fetchCatalogCategories(): Promise<CatalogCategory[]> {
  const response = await posifloraApiClient.request<CatalogCategoryResponse>({
    method: 'GET',
    url: '/catalog/categories',
  });
  return response.data || [];
}

async function fetchCatalogItemsByCategory(categoryId: string): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  const pageSize = config.posiflora.catalogPageSize;
  let page = 1;
  let total = 0;

  do {
    const response = await posifloraApiClient.request<CatalogItemsResponse>({
      method: 'GET',
      url: `/catalog/${categoryId}`,
      params: {
        'page[number]': page,
        'page[size]': pageSize,
      },
    });

    items.push(...(response.data || []));
    total = response.meta?.total || items.length;
    const size = response.meta?.page?.size || pageSize;
    const number = response.meta?.page?.number || page;

    if (items.length >= total || !response.data?.length) {
      break;
    }

    page = number + 1;
    if (size === 0) break;
  } while (items.length < total);

  return items;
}

async function fetchInventoryItem(itemId: string): Promise<InventoryItemResponse | null> {
  try {
    return await posifloraApiClient.request<InventoryItemResponse>({
      method: 'GET',
      url: `/inventory-items/${itemId}`,
    });
  } catch (error) {
    logger.warn('Posiflora: failed to load inventory item details', {
      itemId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function syncCatalogFromPosiflora(): Promise<void> {
  if (!config.posiflora.enabled) {
    logger.info('Posiflora catalog sync skipped: integration disabled');
    return;
  }

  logger.info('Posiflora catalog sync started');
  const categories = (await fetchCatalogCategories()).filter(
    (category) =>
      category.attributes?.status !== 'off' &&
      !category.attributes?.deleted
  );
  const categoryIdMap = new Map<string, number>();

  if (!categories.length) {
    logger.warn('Posiflora catalog sync: no categories received');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const category of categories) {
      const name = category.attributes?.title?.trim() || 'Без категории';
      const slug = slugify(name);
      const result = await client.query(
        `
          INSERT INTO categories (posiflora_id, name, slug, sort_order, is_active, updated_at)
          VALUES ($1, $2, $3, 0, true, NOW())
          ON CONFLICT (posiflora_id) DO UPDATE
            SET name = EXCLUDED.name,
                slug = EXCLUDED.slug,
                is_active = true,
                updated_at = NOW()
          RETURNING id;
        `,
        [category.id, name, slug]
      );
      categoryIdMap.set(category.id, result.rows[0].id);
    }

    for (const category of categories) {
      const parentId = category.relationships?.parent?.data?.id;
      if (!parentId) continue;
      const dbCategoryId = categoryIdMap.get(category.id);
      const dbParentId = categoryIdMap.get(parentId);
      if (!dbCategoryId || !dbParentId) continue;
      await client.query('UPDATE categories SET parent_id = $1 WHERE id = $2', [
        dbParentId,
        dbCategoryId,
      ]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Posiflora catalog sync: failed to upsert categories', error);
    throw error;
  } finally {
    client.release();
  }

  const productsClient = await pool.connect();
  try {
    await productsClient.query('BEGIN');

    const seenPosifloraIds = new Set<string>();
    for (const category of categories) {
      const items = await fetchCatalogItemsByCategory(category.id);
      for (const item of items) {
        const posifloraId = item.attributes.itemId;
        if (!posifloraId || seenPosifloraIds.has(posifloraId)) continue;
        seenPosifloraIds.add(posifloraId);

        const inventoryDetails = config.posiflora.includeItemDetails
          ? await fetchInventoryItem(posifloraId)
          : null;
        const rawDescription = inventoryDetails?.data?.attributes?.description || null;
        const description = stripHtml(rawDescription);
        const composition = extractComposition(rawDescription);
        const name = inventoryDetails?.data?.attributes?.title || item.attributes.title;
        const categoryId = item.relationships?.category?.data?.id || category.id;
        const dbCategoryId = categoryIdMap.get(categoryId) || null;
        const catalogPrice = resolvePrice(item.attributes.minPrice, item.attributes.maxPrice);
        const inventoryPrice = resolvePrice(
          inventoryDetails?.data?.attributes?.priceMin,
          inventoryDetails?.data?.attributes?.priceMax
        );
        const price = catalogPrice > 0 ? catalogPrice : inventoryPrice;
        const inStock =
          typeof inventoryDetails?.data?.attributes?.public === 'boolean'
            ? inventoryDetails.data.attributes.public
            : Boolean(item.attributes.public);

        await productsClient.query(
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
            $1, $2, $3, $4, $5, 'RUB', $6, $7, $8, $9, $10, NOW()
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
                updated_at = NOW();
        `,
          [
            posifloraId,
            name,
            description,
            price,
            null,
            dbCategoryId,
            JSON.stringify([]),
            inStock,
            inStock ? 1 : 0,
            JSON.stringify({
              source: 'posiflora',
              itemType: item.attributes.itemType,
              revision: item.attributes.revision,
              logoId: item.relationships?.logo?.data?.id || null,
              composition,
              descriptionRaw: rawDescription,
            }),
          ]
        );
      }
    }

    if (seenPosifloraIds.size) {
      const idsArray = Array.from(seenPosifloraIds);
      await productsClient.query(
        `
          UPDATE products
          SET in_stock = false, updated_at = NOW()
          WHERE posiflora_id IS NOT NULL AND posiflora_id NOT IN (${idsArray
            .map((_, index) => `$${index + 1}`)
            .join(', ')})
        `,
        idsArray
      );
    }

    await productsClient.query('COMMIT');
  } catch (error) {
    await productsClient.query('ROLLBACK');
    logger.error('Posiflora catalog sync: failed to upsert products', error);
    throw error;
  } finally {
    productsClient.release();
  }

  await cache.clearPattern('products:*');
  await cache.clearPattern('categories:*');
  logger.info('Posiflora catalog sync finished', { categories: categories.length });
}
