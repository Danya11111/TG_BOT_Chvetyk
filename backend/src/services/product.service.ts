import { NotFoundError } from '../utils/errors';
import { db } from '../database/connection';
import { PaginationResult } from '../types/pagination';
import { getFloriaProducts, getFloriaProductById } from '../integrations/floria/client';
import { mapFloriaProductToProduct } from '../integrations/floria/mapper';
import { syncFloriaProductsToSnapshot } from '../integrations/floria/sync.service';
import { logger } from '../utils/logger';

export interface Product {
  id: number;
  posiflora_id?: string;
  name: string;
  description?: string;
  price: number;
  old_price?: number;
  currency: string;
  category_id?: number;
  category_name?: string;
  images: string[];
  in_stock: boolean;
  stock_quantity?: number;
  article?: string;
  sku?: string;
  bonus_percent?: number;
  weight?: number;
  composition?: string;
  attributes?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ProductFilters {
  categoryId?: number;
  categorySlug?: string;
  search?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
}

export interface ProductsResponse {
  data: Product[];
  pagination: PaginationResult;
}

function rowToProduct(row: {
  floria_id: number;
  name: string;
  price: string;
  old_price: string | null;
  currency: string;
  category_name: string | null;
  images: unknown;
  in_stock: boolean;
  composition: string | null;
  attributes: unknown;
  synced_at: Date;
}): Product {
  const images = Array.isArray(row.images)
    ? (row.images as string[])
    : typeof row.images === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(row.images);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
  const attributes =
    row.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes)
      ? (row.attributes as Record<string, unknown>)
      : {};
  const synced = row.synced_at ? new Date(row.synced_at) : new Date();
  return {
    id: row.floria_id,
    name: row.name,
    price: parseFloat(String(row.price)) || 0,
    old_price: row.old_price != null ? parseFloat(String(row.old_price)) : undefined,
    currency: row.currency || 'RUB',
    category_name: row.category_name ?? undefined,
    images,
    in_stock: Boolean(row.in_stock),
    composition: row.composition ?? undefined,
    attributes,
    created_at: synced,
    updated_at: synced,
  };
}

function orderByClause(sort: string): string {
  switch (sort) {
    case 'price_asc':
      return 'price ASC NULLS LAST';
    case 'price_desc':
      return 'price DESC NULLS LAST';
    case 'oldest':
      return 'synced_at ASC NULLS LAST';
    case 'newest':
    default:
      return 'synced_at DESC NULLS LAST';
  }
}

export class ProductService {
  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    const {
      categoryId,
      search,
      page = 1,
      limit = 20,
      sort = 'newest',
    } = filters;

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (categoryId === -1) {
      conditions.push(`in_showcase = true`);
    }

    if (search && search.trim()) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    const whereSql = conditions.join(' AND ');
    const orderSql = orderByClause(sort);
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM floria_products_snapshot WHERE ${whereSql}`,
      params
    );
    const total = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const dataResult = await db.query(
      `SELECT floria_id, name, price, old_price, currency, category_name, images, in_stock, composition, attributes, synced_at
       FROM floria_products_snapshot
       WHERE ${whereSql}
       ORDER BY ${orderSql}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    let products: Product[] = dataResult.rows.map(rowToProduct);

    if (products.length === 0 && page === 1 && !(search && search.trim()) && (categoryId === undefined || categoryId === 0)) {
      try {
        const raw = await getFloriaProducts({
          categoryId: categoryId ?? 0,
          limit,
          offset: 0,
          needComposition: 0,
        });
        products = raw.map((item) => {
          const mapped = mapFloriaProductToProduct(item);
          const synced = new Date();
          return {
            id: mapped.id,
            name: mapped.name,
            price: mapped.price,
            old_price: mapped.old_price,
            currency: mapped.currency,
            category_name: mapped.category_name,
            images: mapped.images,
            in_stock: mapped.in_stock,
            composition: mapped.composition,
            attributes: mapped.attributes ?? {},
            created_at: synced,
            updated_at: synced,
          };
        });
        const totalFromFloria = products.length < limit ? products.length : products.length + 1;
        syncFloriaProductsToSnapshot().catch((err) => logger.error('Background Floria sync failed', err));
        return {
          data: products,
          pagination: {
            page: 1,
            limit,
            total: products.length < limit ? products.length : totalFromFloria,
            totalPages: products.length < limit ? 1 : Math.ceil(totalFromFloria / limit),
          },
        };
      } catch (fallbackErr) {
        logger.warn('Floria fallback fetch failed', fallbackErr);
      }
    }

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getProductById(id: number): Promise<Product> {
    const result = await db.query(
      `SELECT floria_id, name, price, old_price, currency, category_name, images, in_stock, composition, attributes, synced_at
       FROM floria_products_snapshot
       WHERE floria_id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (row) {
      return rowToProduct(row);
    }
    try {
      const raw = await getFloriaProductById(id);
      if (!raw) {
        throw new NotFoundError(`Product with id ${id} not found`);
      }
      const mapped = mapFloriaProductToProduct(raw);
      const synced = new Date();
      return {
        id: mapped.id,
        name: mapped.name,
        price: mapped.price,
        old_price: mapped.old_price,
        currency: mapped.currency,
        category_name: mapped.category_name,
        images: mapped.images,
        in_stock: mapped.in_stock,
        composition: mapped.composition,
        attributes: mapped.attributes ?? {},
        created_at: synced,
        updated_at: synced,
      };
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      logger.warn('Floria fallback getProductById failed', err);
      throw new NotFoundError(`Product with id ${id} not found`);
    }
  }
}

export const productService = new ProductService();
