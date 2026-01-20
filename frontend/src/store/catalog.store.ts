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
  error?: string;
  fetchCategories: () => Promise<void>;
  fetchProducts: () => Promise<void>;
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
  error: undefined,

  async fetchCategories() {
    const categories = await loadCategories();
    set({ categories });
  },

  async fetchProducts() {
    set({ loading: true, error: undefined });
    try {
      const { products } = await loadProducts({
        categoryId: get().selectedCategoryId,
        search: get().searchQuery,
        minPrice: get().minPrice,
        maxPrice: get().maxPrice,
        inStock: get().inStockOnly ? true : undefined,
        sort: get().sort,
        limit: 100,
      });
      set({ products });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить товары';
      set({ error: message || 'Не удалось загрузить товары' });
    } finally {
      set({ loading: false });
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
