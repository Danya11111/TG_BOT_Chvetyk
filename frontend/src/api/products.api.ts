import apiClient from './client';

export interface Product {
  id: number;
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
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
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
