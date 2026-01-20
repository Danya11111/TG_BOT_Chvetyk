import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { cache } from '../database/redis';
import { CACHE_TTL } from '../utils/constants';
import { PaginationResult } from '../types/pagination';
import sampleCatalog from '../data/sample-catalog.json';

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

export class ProductService {
  private useSample = process.env.USE_SAMPLE_PRODUCTS === 'true';

  private filterAndPaginate(products: Product[], filters: ProductFilters): ProductsResponse {
    let result = [...products];
    const {
      categoryId,
      categorySlug,
      search,
      inStock,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
      sort = 'newest',
    } = filters;

    if (categoryId) {
      result = result.filter((p) => p.category_id === categoryId);
    }
    if (categorySlug) {
      // map slug via categories from sample
      const category = sampleCatalog.categories.find((c) => c.slug === categorySlug);
      if (category) {
        result = result.filter((p) => p.category_id === category.id);
      }
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.description || '').toLowerCase().includes(term)
      );
    }
    if (inStock !== undefined) {
      result = result.filter((p) => p.in_stock === inStock);
    }
    if (minPrice !== undefined) {
      result = result.filter((p) => p.price >= minPrice);
    }
    if (maxPrice !== undefined) {
      result = result.filter((p) => p.price <= maxPrice);
    }

    let order = (a: Product, b: Product) => b.id - a.id;
    if (sort === 'price_asc') order = (a, b) => a.price - b.price;
    if (sort === 'price_desc') order = (a, b) => b.price - a.price;
    if (sort === 'oldest') order = (a, b) => a.id - b.id;
    result = result.sort(order);

    const total = result.length;
    const start = (page - 1) * limit;
    const paged = result.slice(start, start + limit);

    return {
      data: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    if (this.useSample) {
      return this.filterAndPaginate(sampleCatalog.products as unknown as Product[], filters);
    }
    try {
      const {
        categoryId,
        categorySlug,
        search,
        inStock,
        minPrice,
        maxPrice,
        page = 1,
        limit = 20,
        sort = 'newest',
      } = filters;

      // Проверка кэша
      const cacheKey = `products:${JSON.stringify(filters)}`;
      const cached = await cache.get<ProductsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      let query = `
        SELECT 
          p.id,
          p.posiflora_id,
          p.name,
          p.description,
          p.price,
          p.old_price,
          p.currency,
          p.category_id,
          c.name as category_name,
          p.images,
          p.in_stock,
          p.stock_quantity,
          p.article,
          p.sku,
          p.bonus_percent,
          p.weight,
          p.attributes,
          p.created_at,
          p.updated_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (categoryId) {
        query += ` AND p.category_id = $${paramIndex++}`;
        params.push(categoryId);
      }

      if (categorySlug) {
        query += ` AND c.slug = $${paramIndex++}`;
        params.push(categorySlug);
      }

      if (search) {
        query += ` AND (p.name ILIKE $${paramIndex++} OR p.description ILIKE $${paramIndex++})`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (inStock !== undefined) {
        query += ` AND p.in_stock = $${paramIndex++}`;
        params.push(inStock);
      }

      if (minPrice !== undefined) {
        query += ` AND p.price >= $${paramIndex++}`;
        params.push(minPrice);
      }

      if (maxPrice !== undefined) {
        query += ` AND p.price <= $${paramIndex++}`;
        params.push(maxPrice);
      }

      // Подсчёт общего количества
      const countQuery = query.replace(
        /SELECT[\s\S]*?FROM/,
        'SELECT COUNT(*) as total FROM'
      );
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Добавление пагинации и сортировки
      let order = 'p.created_at DESC';
      if (sort === 'price_asc') order = 'p.price ASC';
      if (sort === 'price_desc') order = 'p.price DESC';
      if (sort === 'oldest') order = 'p.created_at ASC';

      query += ` ORDER BY ${order}, p.id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, (page - 1) * limit);

      const result = await pool.query(query, params);

      const products: Product[] = result.rows.map((row) => ({
        ...row,
        images: Array.isArray(row.images) ? row.images : [],
        attributes: row.attributes || {},
      }));

      const response: ProductsResponse = {
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Сохранение в кэш
      await cache.set(cacheKey, response, CACHE_TTL.PRODUCTS);

      return response;
    } catch (error) {
      logger.error('Error fetching products:', error);
      // fallback to sample data
      this.useSample = true;
      return this.filterAndPaginate(sampleCatalog.products as unknown as Product[], filters);
    }
  }

  async getProductById(id: number): Promise<Product> {
    if (this.useSample) {
      const sample = sampleCatalog.products.find((p) => p.id === id);
      if (sample) return sample as unknown as Product;
    }
    try {
      const cacheKey = `product:${id}`;
      const cached = await cache.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          p.id,
          p.posiflora_id,
          p.name,
          p.description,
          p.price,
          p.old_price,
          p.currency,
          p.category_id,
          c.name as category_name,
          p.images,
          p.in_stock,
          p.stock_quantity,
          p.article,
          p.sku,
          p.bonus_percent,
          p.weight,
          p.attributes,
          p.created_at,
          p.updated_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        throw new NotFoundError(`Product with id ${id} not found`);
      }

      const product: Product = {
        ...result.rows[0],
        images: Array.isArray(result.rows[0].images) ? result.rows[0].images : [],
        attributes: result.rows[0].attributes || {},
      };

      // Сохранение в кэш
      await cache.set(cacheKey, product, CACHE_TTL.PRODUCTS);

      return product;
    } catch (error) {
      logger.error(`Error fetching product ${id}:`, error);
      // fallback to sample
      const sample = sampleCatalog.products.find((p) => p.id === id);
      if (sample) {
        return sample as unknown as Product;
      }
      throw error;
    }
  }
}

export const productService = new ProductService();
