import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { cache } from '../database/redis';
import { CACHE_TTL } from '../utils/constants';
import { PaginationResult } from '../types/pagination';
import { getFloriaProducts, getFloriaProductById } from '../integrations/floria/client';
import { mapFloriaProductToProduct } from '../integrations/floria/mapper';

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
  composition?: string;
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
        search,
        page = 1,
        limit = 20,
      } = filters;

      const cacheKey = `products:floria:${JSON.stringify({ categoryId, search, page, limit })}`;
      const cached = await cache.get<ProductsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const offset = (page - 1) * limit;
      const raw = await getFloriaProducts({
        categoryId: categoryId ?? 0,
        limit,
        offset,
        searchQuery: search && search.trim() ? search.trim() : undefined,
        needComposition: 0,
      });

      const products: Product[] = raw.map((item) => {
        const mapped = mapFloriaProductToProduct(item);
        return {
          id: mapped.id,
          name: mapped.name,
          price: mapped.price,
          old_price: mapped.old_price,
          currency: mapped.currency,
          category_name: mapped.category_name,
          images: mapped.images,
          in_stock: mapped.in_stock,
          attributes: mapped.attributes,
          created_at: mapped.created_at,
          updated_at: mapped.updated_at,
        } as Product;
      });

      const total = (page - 1) * limit + products.length;
      const totalPages = products.length < limit ? page : page + 1;

      const response: ProductsResponse = {
        data: products,
        pagination: {
          page,
          limit,
          total: products.length < limit ? total : total + 1,
          totalPages,
        },
      };

      await cache.set(cacheKey, response, CACHE_TTL.PRODUCTS);

      return response;
    } catch (error) {
      logger.error('Error fetching products from Floria:', error);
      throw error;
    }
  }

  async getProductById(id: number): Promise<Product> {
    try {
      const cacheKey = `product:floria:${id}`;
      const cached = await cache.get<Product>(cacheKey);
      if (cached) {
        return cached;
      }

      const raw = await getFloriaProductById(id);
      if (!raw) {
        throw new NotFoundError(`Product with id ${id} not found`);
      }

      const mapped = mapFloriaProductToProduct(raw);
      const product: Product = {
        id: mapped.id,
        name: mapped.name,
        price: mapped.price,
        old_price: mapped.old_price,
        currency: mapped.currency,
        category_name: mapped.category_name,
        images: mapped.images,
        in_stock: mapped.in_stock,
        composition: mapped.composition,
        attributes: mapped.attributes,
        created_at: mapped.created_at,
        updated_at: mapped.updated_at,
      };

      await cache.set(cacheKey, product, CACHE_TTL.PRODUCTS);

      return product;
    } catch (error) {
      logger.error(`Error fetching product ${id} from Floria:`, error);
      throw error;
    }
  }
}

export const productService = new ProductService();
