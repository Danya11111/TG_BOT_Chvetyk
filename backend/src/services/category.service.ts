import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { cache } from '../database/redis';
import { CACHE_TTL } from '../utils/constants';
import { NotFoundError } from '../utils/errors';

export interface Category {
  id: number;
  posiflora_id?: string;
  name: string;
  slug: string;
  parent_id?: number;
  description?: string;
  image?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  products_count?: number;
  children?: Category[];
}

export class CategoryService {
  async getCategories(): Promise<Category[]> {
    try {
      // Проверка кэша
      const cacheKey = 'categories:all';
      const cached = await cache.get<Category[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const query = `
        SELECT 
          c.id,
          c.posiflora_id,
          c.name,
          c.slug,
          c.parent_id,
          c.description,
          c.image_url as image,
          c.sort_order,
          c.is_active,
          COUNT(p.id) as products_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.in_stock = true
        WHERE c.is_active = true
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.name ASC
      `;

      const result = await pool.query(query);
      const categories: Category[] = result.rows.map((row) => ({
        ...row,
        products_count: parseInt(row.products_count, 10) || 0,
      }));

      // Сохранение в кэш
      await cache.set('categories:all', categories, CACHE_TTL.CATEGORIES);

      return categories;
    } catch (error) {
      logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getCategoryById(id: number): Promise<Category> {
    try {
      const query = `
        SELECT 
          c.id,
          c.posiflora_id,
          c.name,
          c.slug,
          c.parent_id,
          c.description,
          c.image_url as image,
          c.sort_order,
          c.is_active,
          COUNT(p.id) as products_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.in_stock = true
        WHERE c.id = $1 AND c.is_active = true
        GROUP BY c.id
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        throw new NotFoundError(`Category with id ${id} not found`);
      }

      return {
        ...result.rows[0],
        products_count: parseInt(result.rows[0].products_count, 10) || 0,
      };
    } catch (error) {
      logger.error(`Error fetching category ${id}:`, error);
      throw error;
    }
  }
}

export const categoryService = new CategoryService();
