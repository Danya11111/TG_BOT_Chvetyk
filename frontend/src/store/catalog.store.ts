import { create } from 'zustand';
import {
  fetchCategories as loadCategories,
  fetchProducts as loadProducts,
} from '../services/catalog.service';
import { Category, Product } from '../types/catalog';
import { filterProductsByQuery } from '../utils/product-filter';

interface CatalogState {
  products: Product[];
  categories: Category[];
  selectedCategoryId?: number;
  searchQuery: string;
  loading: boolean;
  error?: string;
  fetchCategories: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  setCategory: (categoryId?: number) => void;
  setSearchQuery: (query: string) => void;
  getFilteredProducts: () => Product[];
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  categories: [],
  searchQuery: '',
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
        limit: 50,
      });
      set({ products });
    } catch (_error) {
      set({ error: 'Не удалось загрузить товары' });
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

  getFilteredProducts() {
    const { products, searchQuery } = get();
    return filterProductsByQuery(products, searchQuery);
  },
}));
