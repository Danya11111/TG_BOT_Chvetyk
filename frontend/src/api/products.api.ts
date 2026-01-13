import apiClient from './client';
import { Category, Pagination, Product } from '../types/catalog';

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination?: Pagination;
}

// Получить список товаров
export const getProducts = async (params?: {
  categoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ProductsResponse> => {
  const response = await apiClient.get<ProductsResponse>('/api/products', { params });
  return response.data;
};

// Получить один товар
export const getProduct = async (id: number): Promise<{ success: boolean; data: Product }> => {
  const response = await apiClient.get(`/api/products/${id}`);
  return response.data;
};

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

// Получить список категорий
export const getCategories = async (): Promise<CategoriesResponse> => {
  const response = await apiClient.get<CategoriesResponse>('/api/categories');
  return response.data;
};
