import { isAxiosError } from 'axios';
import { getCategories, getProducts } from '../api/products.api';
import { Category, Pagination, Product } from '../types/catalog';

export interface ProductListResult {
  products: Product[];
  pagination?: Pagination;
}

export async function fetchProducts(params?: {
  categoryId?: number;
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  page?: number;
  limit?: number;
}): Promise<ProductListResult> {
  try {
    const response = await getProducts(params);
    return {
      products: response.data ?? [],
      pagination: response.pagination,
    };
  } catch (error) {
    const errorMessage = isAxiosError(error)
      ? error.response?.data?.error?.message ||
        error.response?.data?.message ||
        (error.response?.status ? `API error: ${error.response.status}` : error.message)
      : error instanceof Error
        ? error.message
        : 'Неизвестная ошибка';
    throw new Error(errorMessage);
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await getCategories();
    return response.data ?? [];
  } catch (_error) {
    return [];
  }
}
