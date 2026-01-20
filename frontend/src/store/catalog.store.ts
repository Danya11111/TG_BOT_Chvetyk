import { create } from 'zustand';
import {
  fetchCategories as loadCategories,
  fetchProducts as loadProducts,
} from '../services/catalog.service';
import { Category, Product } from '../types/catalog';

interface CatalogState {
  products: Product[];
  categories: Category[];
  selectedCategoryId?: number;
  searchQuery: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  sort: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  loading: boolean;
  loadingMore: boolean;
  page: number;
  hasMore: boolean;
  error?: string;
  fetchCategories: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchMoreProducts: () => Promise<void>;
  setCategory: (categoryId?: number) => void;
  setSearchQuery: (query: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setInStockOnly: (value: boolean) => void;
  setSort: (value: 'price_asc' | 'price_desc' | 'newest' | 'oldest') => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  categories: [],
  searchQuery: '',
  minPrice: undefined,
  maxPrice: undefined,
  inStockOnly: false,
  sort: 'newest',
  loading: false,
  loadingMore: false,
  page: 1,
  hasMore: true,
  error: undefined,

  async fetchCategories() {
    const categories = await loadCategories();
    set({ categories });
  },

  async fetchProducts() {
    set({ loading: true, error: undefined, page: 1, hasMore: true });
    try {
      const { products, pagination } = await loadProducts({
        categoryId: get().selectedCategoryId,
        search: get().searchQuery,
        minPrice: get().minPrice,
        maxPrice: get().maxPrice,
        inStock: get().inStockOnly ? true : undefined,
        sort: get().sort,
        page: 1,
        limit: 10,
      });
      const totalPages = pagination?.totalPages ?? 1;
      set({
        products,
        page: 1,
        hasMore: totalPages > 1 && products.length > 0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить товары';
      set({ error: message || 'Не удалось загрузить товары', hasMore: false });
    } finally {
      set({ loading: false });
    }
  },

  async fetchMoreProducts() {
    if (get().loadingMore || get().loading || !get().hasMore) {
      return;
    }
    const nextPage = get().page + 1;
    set({ loadingMore: true });
    try {
      const { products: newProducts, pagination } = await loadProducts({
        categoryId: get().selectedCategoryId,
        search: get().searchQuery,
        minPrice: get().minPrice,
        maxPrice: get().maxPrice,
        inStock: get().inStockOnly ? true : undefined,
        sort: get().sort,
        page: nextPage,
        limit: 10,
      });
      const totalPages = pagination?.totalPages ?? nextPage;
      set((state) => ({
        products: [...state.products, ...newProducts],
        page: nextPage,
        hasMore: nextPage < totalPages && newProducts.length > 0,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить товары';
      set({ error: message || 'Не удалось загрузить товары', hasMore: false });
    } finally {
      set({ loadingMore: false });
    }
  },

  setCategory(categoryId) {
    set({ selectedCategoryId: categoryId });
  },

  setSearchQuery(query) {
    set({ searchQuery: query });
  },

  setPriceRange(min, max) {
    set({ minPrice: min, maxPrice: max });
  },

  setInStockOnly(value) {
    set({ inStockOnly: value });
  },

  setSort(value) {
    set({ sort: value });
  },
}));
