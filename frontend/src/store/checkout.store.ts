import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DeliveryAddress {
  city: string;
  street: string;
  house: string;
  apartment?: string;
  postalCode?: string;
}

export interface CheckoutFormData {
  name: string;
  phone: string;
  email: string;
  deliveryType: 'delivery' | 'pickup';
  address: DeliveryAddress;
  pickupPointId?: number;
  deliveryDate?: string;
  deliveryTime?: string;
  comment: string;
  paymentType: 'cash' | 'card' | 'online';
}

interface CheckoutStore {
  formData: CheckoutFormData | null;
  saveFormData: (data: CheckoutFormData) => void;
  clearFormData: () => void;
}

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      formData: null,
      
      saveFormData: (data) => {
        set({ formData: data });
      },
      
      clearFormData: () => {
        set({ formData: null });
      },
    }),
    {
      name: 'checkout-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
