import { create } from 'zustand';
import {
  fetchCategories as loadCategories,
  fetchProducts as loadProducts,
} from '../services/catalog.service';
import { Category, Pagination, Product } from '../types/catalog';

const CATALOG_CACHE_KEY = 'catalog_cache';

interface CatalogCacheParams {
  categoryId?: number;
  search: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  sort: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  page: number;
  limit: number;
}

interface CatalogCacheEntry {
  products: Product[];
  pagination?: Pagination;
  fetchedAt: number;
  params: CatalogCacheParams;
}

function getCurrentParams(get: () => CatalogState): CatalogCacheParams {
  const state = get();
  return {
    categoryId: state.selectedCategoryId,
    search: state.searchQuery,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
    inStockOnly: state.inStockOnly,
    sort: state.sort,
    page: 1,
    limit: 10,
  };
}

function paramsMatch(a: CatalogCacheParams, b: CatalogCacheParams): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readCatalogCache(): CatalogCacheEntry | null {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogCacheEntry;
    if (!parsed?.products?.length || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCatalogCache(entry: CatalogCacheEntry): void {
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota or parse errors
  }
}

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
  lastFetchedAt: number | null;
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
  lastFetchedAt: null,

  async fetchCategories() {
    const categories = await loadCategories();
    set({ categories });
  },

  async fetchProducts() {
    const currentParams = getCurrentParams(get);
    const cached = readCatalogCache();
    const hasMatchingCache = cached && paramsMatch(cached.params, currentParams);

    if (hasMatchingCache && cached) {
      const totalPages = cached.pagination?.totalPages ?? 1;
      set({
        products: cached.products,
        page: 1,
        hasMore: totalPages > 1 && cached.products.length > 0,
        lastFetchedAt: cached.fetchedAt,
        error: undefined,
        loading: true,
      });
    } else {
      set({ loading: true, error: undefined, page: 1, hasMore: true, products: [] });
    }

    try {
      const { products, pagination } = await loadProducts({
        categoryId: currentParams.categoryId,
        search: currentParams.search,
        minPrice: currentParams.minPrice,
        maxPrice: currentParams.maxPrice,
        inStock: currentParams.inStockOnly ? true : undefined,
        sort: currentParams.sort,
        page: 1,
        limit: 10,
      });
      const totalPages = pagination?.totalPages ?? 1;
      const now = Date.now();
      set({
        products,
        page: 1,
        hasMore: totalPages > 1 && products.length > 0,
        lastFetchedAt: now,
        error: undefined,
      });
      writeCatalogCache({
        products,
        pagination,
        fetchedAt: now,
        params: currentParams,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить товары';
      const finalMessage = message || 'Не удалось загрузить товары';
      if (get().products.length > 0) {
        set({ error: finalMessage });
      } else {
        set({ error: finalMessage, hasMore: false });
      }
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
