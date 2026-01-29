import { logger } from '../utils/logger';
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

const FLORIA_STATIC_CATEGORIES: Category[] = [
  { id: 0, name: 'Все товары', slug: 'all', sort_order: 0, is_active: true },
  { id: -1, name: 'Онлайн-витрина', slug: 'online-showcase', sort_order: 1, is_active: true },
];

export class CategoryService {
  async getCategories(): Promise<Category[]> {
    try {
      return [...FLORIA_STATIC_CATEGORIES];
    } catch (error) {
      logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getCategoryById(id: number): Promise<Category> {
    const category = FLORIA_STATIC_CATEGORIES.find((c) => c.id === id);
    if (!category) {
      throw new NotFoundError(`Category with id ${id} not found`);
    }
    return { ...category };
  }
}

export const categoryService = new CategoryService();
