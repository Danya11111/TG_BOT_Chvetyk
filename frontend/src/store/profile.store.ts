import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ProfileAddress {
  city?: string;
  street: string;
  house: string;
  apartment?: string;
}

interface ProfileStore {
  addresses: ProfileAddress[];
  addAddress: (address: ProfileAddress) => void;
  updateAddress: (index: number, address: ProfileAddress) => void;
  removeAddress: (index: number) => void;
  clearAddresses: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      addresses: [],
      
      addAddress: (address) => {
        set((state) => ({
          addresses: [...state.addresses, address],
        }));
      },
      
      updateAddress: (index, address) => {
        set((state) => {
          const newAddresses = [...state.addresses];
          if (index >= 0 && index < newAddresses.length) {
            newAddresses[index] = address;
          }
          return { addresses: newAddresses };
        });
      },
      
      removeAddress: (index) => {
        set((state) => ({
          addresses: state.addresses.filter((_, i) => i !== index),
        }));
      },
      
      clearAddresses: () => {
        set({ addresses: [] });
      },
    }),
    {
      name: 'profile-storage',
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = persistedState as ProfileStore | undefined;
        if (!state?.addresses) {
          return persistedState;
        }
        const normalized = state.addresses
          .map((item) => {
            if (typeof item === 'string') {
              return { street: item, house: '', city: '' } as ProfileAddress;
            }
            return item as ProfileAddress;
          })
          .filter((item) => item.street);
        return { ...state, addresses: normalized } as ProfileStore;
      },
    }
  )
);
