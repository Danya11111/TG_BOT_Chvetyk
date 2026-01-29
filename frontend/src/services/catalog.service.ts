import { isAxiosError } from 'axios';
import { getCategories, getProducts } from '../api/products.api';
import { Category, Pagination, Product } from '../types/catalog';

const RETRY_DELAYS_MS = [1000, 2000];
const MAX_RETRIES = 2;

export interface ProductListResult {
  products: Product[];
  pagination?: Pagination;
}

export type CatalogQueryParams = {
  categoryId?: number;
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  page?: number;
  limit?: number;
};

function cleanParams(params?: CatalogQueryParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return true;
    })
  ) as Record<string, unknown>;
}

export async function fetchProducts(params?: CatalogQueryParams): Promise<ProductListResult> {
  const cleanedParams = cleanParams(params);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await getProducts(cleanedParams as CatalogQueryParams);
      return {
        products: response.data ?? [],
        pagination: response.pagination,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
    }
  }
  const errorMessage = lastError && isAxiosError(lastError)
    ? lastError.response?.data?.error?.message ||
      lastError.response?.data?.message ||
      (lastError.response?.status ? `API error: ${lastError.response.status}` : lastError.message)
    : lastError instanceof Error
      ? lastError.message
      : 'Неизвестная ошибка';
  throw new Error(errorMessage);
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const response = await getCategories();
    return response.data ?? [];
  } catch (_error) {
    return [];
  }
}
