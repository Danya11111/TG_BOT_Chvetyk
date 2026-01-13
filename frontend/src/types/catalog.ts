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
  attributes?: Record<string, unknown>;
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number;
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
  products_count?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
