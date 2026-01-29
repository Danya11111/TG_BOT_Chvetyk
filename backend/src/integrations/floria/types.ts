export interface FloriaImage {
  rank?: number;
  url: string;
}

export interface FloriaProductRaw {
  id: number;
  name: string;
  price: number;
  old_price?: number;
  images?: FloriaImage[];
  category?: string;
  parent_category?: string;
  composition?: string;
  not_available?: number;
  published?: number;
  deleted?: number;
  [key: string]: unknown;
}

export interface FloriaProductsParams {
  categoryId?: number;
  limit?: number;
  offset?: number;
  searchQuery?: string;
  needComposition?: 0 | 1;
  productId?: number;
}
