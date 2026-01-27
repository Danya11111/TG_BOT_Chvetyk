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

interface BouquetAttributes {
  title?: string;
  description?: string | null;
  amount?: number | string | null;
  saleAmount?: number | string | null;
  trueSaleAmount?: number | string | null;
  status?: string;
  public?: boolean;
}

interface Bouquet {
  id: string;
  type: 'bouquets';
  attributes?: BouquetAttributes;
  relationships?: {
    store?: { data: { id: string; type: 'stores' } | null };
    logo?: { data: { id: string; type: 'images' } | null };
    image?: { data: { id: string; type: 'images' } | null };
    images?: { data: { id: string; type: 'images' }[] };
  };
}

interface IncludedResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
}

interface BouquetsResponse {
  data: Bouquet[];
  included?: IncludedResource[];
  meta?: {
    page?: { number?: number; size?: number };
    total?: number;
  };
}

interface InventoryItemAttributes {
  title?: string;
  description?: string | null;
  itemType?: string;
  priceMin?: number | string | null;
  priceMax?: number | string | null;
  public?: boolean;
}

interface InventoryItem {
  id: string;
  type: 'inventory-items';
  attributes?: InventoryItemAttributes;
  relationships?: {
    category?: { data: { id: string; type: 'categories' } | null };
    logo?: { data: { id: string; type: 'images' } | null };
  };
}

interface InventoryItemsResponse {
  data: InventoryItem[];
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
      priceMin?: number | string | null;
      priceMax?: number | string | null;
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

const resolvePrice = (minPrice?: number | string | null, maxPrice?: number | string | null): number => {
  const normalize = (value?: number | string | null): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const min = normalize(minPrice);
  const max = normalize(maxPrice);
  if (min > 0) return min;
  if (max > 0) return max;
  return 0;
};

const resolveBouquetPrice = (value?: number | string | null): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

const extractQuotedTitle = (value?: string | null): string | null => {
  if (!value) return null;
  const match = value.match(/[«"“„](.+?)[»"”]/);
  return match?.[1]?.trim() || null;
};

const resolvePosifloraImageUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  try {
    const base = new URL(config.posiflora.apiUrl);
    const path = value.startsWith('/') ? value : `/${value}`;
    return `${base.origin}${path}`;
  } catch {
    return value;
  }
};

const pickImageUrl = (attributes?: Record<string, unknown>): string | null => {
  if (!attributes) return null;
  const candidates = [
    'url',
    'link',
    'path',
    'original',
    'preview',
    'medium',
    'small',
    'thumb',
    'thumbnail',
    'fileUrl',
    'downloadUrl',
  ];
  for (const key of candidates) {
    const value = attributes[key];
    if (typeof value === 'string' && value.trim()) {
      return resolvePosifloraImageUrl(value.trim());
    }
  }
  const sizes = attributes.sizes;
  if (sizes && typeof sizes === 'object') {
    const sizeCandidates = ['original', 'large', 'medium', 'small', 'thumb'];
    for (const sizeKey of sizeCandidates) {
      const sizeValue = (sizes as Record<string, unknown>)[sizeKey];
      if (typeof sizeValue === 'string' && sizeValue.trim()) {
        return resolvePosifloraImageUrl(sizeValue.trim());
      }
      if (sizeValue && typeof sizeValue === 'object') {
        const nestedUrl = (sizeValue as Record<string, unknown>).url;
        if (typeof nestedUrl === 'string' && nestedUrl.trim()) {
          return resolvePosifloraImageUrl(nestedUrl.trim());
        }
      }
    }
  }
  return null;
};

const extractImageUrls = (imageIds: string[], included?: IncludedResource[]): string[] => {
  if (!imageIds.length || !included?.length) {
    return [];
  }
  const includedMap = new Map<string, IncludedResource>();
  included.forEach((resource) => {
    if (resource.type === 'images') {
      includedMap.set(resource.id, resource);
    }
  });
  const urls = new Map<string, string>();
  for (const imageId of imageIds) {
    const resource = includedMap.get(imageId);
    const url = pickImageUrl(resource?.attributes);
    if (url) {
      urls.set(url, url);
    }
  }
  return Array.from(urls.values());
};

async function fetchCatalogCategories(): Promise<CatalogCategory[]> {
  const response = await posifloraApiClient.request<CatalogCategoryResponse>({
    method: 'GET',
    url: '/catalog/categories',
  });
  return response.data || [];
}

async function fetchCategories(): Promise<CatalogCategory[]> {
  const response = await posifloraApiClient.request<CatalogCategoryResponse>({
    method: 'GET',
    url: '/categories',
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

async function fetchBouquets(): Promise<{ items: Bouquet[]; included: IncludedResource[] }> {
  const items: Bouquet[] = [];
  const included: IncludedResource[] = [];
  const pageSize = config.posiflora.catalogPageSize;
  let page = 1;
  let total = 0;

  do {
    const response = await posifloraApiClient.request<BouquetsResponse>({
      method: 'GET',
      url: '/bouquets',
      params: {
        'page[number]': page,
        'page[size]': pageSize,
        include: 'logo,image,images',
        ...(config.posiflora.storeId ? { 'filter[store]': config.posiflora.storeId } : {}),
      },
    });

    items.push(...(response.data || []));
    if (response.included?.length) {
      included.push(...response.included);
    }
    total = response.meta?.total || items.length;
    const size = response.meta?.page?.size || pageSize;
    const number = response.meta?.page?.number || page;

    if (items.length >= total || !response.data?.length) {
      break;
    }

    page = number + 1;
    if (size === 0) break;
  } while (items.length < total);

  return { items, included };
}
async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const items: InventoryItem[] = [];
  const pageSize = config.posiflora.catalogPageSize;
  let page = 1;
  let total = 0;

  do {
    const response = await posifloraApiClient.request<InventoryItemsResponse>({
      method: 'GET',
      url: '/inventory-items',
      params: {
        'page[number]': page,
        'page[size]': pageSize,
        'filter[dataSource]': 'both',
        'filter[store]': config.posiflora.storeId || undefined,
        'filter[hasActivePrices]': true,
        public: true,
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
      url: `/catalog/inventory-items/${itemId}`,
    });
  } catch (error) {
    try {
      const fallback = await posifloraApiClient.request<InventoryItemsResponse>({
        method: 'GET',
        url: '/inventory-items',
        params: {
          'page[number]': 1,
          'page[size]': 1,
          'filter[id]': [itemId],
          'filter[dataSource]': 'both',
          'filter[store]': config.posiflora.storeId || undefined,
        },
      });
      const item = fallback.data?.[0];
      if (item) {
        return { data: item };
      }
    } catch (fallbackError) {
      logger.warn('Posiflora: failed to load inventory item details', {
        itemId,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
    }
    return null;
  }
}

export async function syncCatalogFromPosiflora(): Promise<void> {
  if (!config.posiflora.enabled) {
    logger.info('Posiflora catalog sync skipped: integration disabled');
    return;
  }

  logger.info('Posiflora catalog sync started');
  const categoryClient = await pool.connect();
  let defaultCategoryId: number | null = null;
  try {
    await categoryClient.query('BEGIN');
    const result = await categoryClient.query(
      `
        INSERT INTO categories (posiflora_id, name, slug, sort_order, is_active, updated_at)
        VALUES (NULL, $1, $2, 0, true, NOW())
        ON CONFLICT (slug) DO UPDATE
          SET name = EXCLUDED.name,
              is_active = true,
              updated_at = NOW()
        RETURNING id;
      `,
      ['Букеты', 'bouquets']
    );
    defaultCategoryId = result.rows[0]?.id ?? null;
    await categoryClient.query(
      `
        UPDATE categories
        SET is_active = CASE WHEN slug = 'bouquets' THEN true ELSE false END,
            updated_at = NOW()
      `
    );
    await categoryClient.query('COMMIT');
  } catch (error) {
    await categoryClient.query('ROLLBACK');
    logger.error('Posiflora catalog sync: failed to upsert default category', error);
    throw error;
  } finally {
    categoryClient.release();
  }

  const productsClient = await pool.connect();
  try {
    await productsClient.query('BEGIN');

    const seenPosifloraIds = new Set<string>();
    const { items, included } = await fetchBouquets();

    for (const item of items) {
      const posifloraId = item.id;
      if (!posifloraId || seenPosifloraIds.has(posifloraId)) continue;
      seenPosifloraIds.add(posifloraId);

      const rawDescription = item.attributes?.description || null;
      const description = stripHtml(rawDescription);
      const composition = extractComposition(rawDescription) || null;
      const rawTitle = item.attributes?.title || 'Без названия';
      const name = extractQuotedTitle(rawTitle) || rawTitle;
      const dbCategoryId = defaultCategoryId;
      const price =
        resolveBouquetPrice(item.attributes?.trueSaleAmount) ||
        resolveBouquetPrice(item.attributes?.saleAmount) ||
        resolveBouquetPrice(item.attributes?.amount);
      if (price <= 0) {
        continue;
      }
      const inStock =
        typeof item.attributes?.public === 'boolean'
          ? item.attributes.public
          : item.attributes?.status !== 'off';
      const imageIds = [
        item.relationships?.logo?.data?.id,
        item.relationships?.image?.data?.id,
        ...(item.relationships?.images?.data || []).map((image) => image.id),
      ].filter((id): id is string => Boolean(id));
      const images = extractImageUrls(imageIds, included);

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
          JSON.stringify(images),
          inStock,
          inStock ? 1 : 0,
          JSON.stringify({
            source: 'posiflora-bouquets',
            imageIds,
            composition,
            descriptionRaw: rawDescription,
            status: item.attributes?.status || null,
          }),
        ]
      );
    }

    if (seenPosifloraIds.size) {
      const idsArray = Array.from(seenPosifloraIds);
      await productsClient.query(
        `
          DELETE FROM products
          WHERE (attributes->>'source' IS DISTINCT FROM 'posiflora-bouquets')
             OR (posiflora_id IS NOT NULL AND posiflora_id NOT IN (${idsArray
               .map((_, index) => `$${index + 1}`)
               .join(', ')}))
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
