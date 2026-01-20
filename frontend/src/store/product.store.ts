import { create } from 'zustand';
import { getProduct } from '../api/products.api';
import { Product } from '../types/catalog';

interface ProductState {
  product: Product | null;
  loading: boolean;
  error?: string;
  fetchProduct: (id: number) => Promise<void>;
  reset: () => void;
}

export const useProductStore = create<ProductState>((set) => ({
  product: null,
  loading: false,
  error: undefined,

  async fetchProduct(id: number) {
    set({ loading: true, error: undefined });
    try {
      const response = await getProduct(id);
      set({ product: response.data });
    } catch (_error) {
      set({ error: 'Не удалось загрузить товар', product: null });
    } finally {
      set({ loading: false });
    }
  },

  reset() {
    set({ product: null, error: undefined, loading: false });
  },
}));
