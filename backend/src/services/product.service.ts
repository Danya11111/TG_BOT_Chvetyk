import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { cache } from '../database/redis';
import { CACHE_TTL } from '../utils/constants';
import { PaginationResult } from '../types/pagination';

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
  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
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
      throw error;
    }
  }

  async getProductById(id: number): Promise<Product> {
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
      throw error;
    }
  }
}

export const productService = new ProductService();
