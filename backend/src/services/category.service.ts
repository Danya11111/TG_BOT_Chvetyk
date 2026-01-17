import { pool } from '../database/connection';
import { logger } from '../utils/logger';
import { cache } from '../database/redis';
import { CACHE_TTL } from '../utils/constants';
import { NotFoundError } from '../utils/errors';
import sampleCatalog from '../data/sample-catalog.json';

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
  private useSample = process.env.USE_SAMPLE_PRODUCTS === 'true';

  async getCategories(): Promise<Category[]> {
    if (this.useSample) {
      const categories: Category[] = sampleCatalog.categories as unknown as Category[];
      await cache.set('categories:all', categories, CACHE_TTL.CATEGORIES);
      return categories;
    }
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
      const categories: Category[] = sampleCatalog.categories as unknown as Category[];
      await cache.set('categories:all', categories, CACHE_TTL.CATEGORIES);
      return categories;
    }
  }

  async getCategoryById(id: number): Promise<Category> {
    if (this.useSample) {
      const cat = (sampleCatalog.categories as unknown as Category[]).find((c) => c.id === id);
      if (cat) return cat;
    }
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
      const cat = (sampleCatalog.categories as unknown as Category[]).find((c) => c.id === id);
      if (cat) return cat;
      throw error;
    }
  }
}

export const categoryService = new CategoryService();
