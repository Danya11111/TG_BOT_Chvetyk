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
  /** По умолчанию true: доставка «по готовности», дата/время не выбираются */
  deliveryAsReady?: boolean;
  deliveryDate?: string;
  deliveryTime?: string;
  recipientName?: string;
  recipientPhone?: string;
  cardText?: string;
  comment: string;
  paymentType: 'card_requisites' | 'sbp_qr';
  useBonuses?: boolean;
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
