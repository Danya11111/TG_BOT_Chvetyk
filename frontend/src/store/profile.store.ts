import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProfileStore {
  addresses: string[];
  addAddress: (address: string) => void;
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
    }
  )
);
