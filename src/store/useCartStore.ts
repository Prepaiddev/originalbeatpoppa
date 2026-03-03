import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from './usePlayerStore';

export interface License {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export interface CartItem {
  beatId: string;
  beat: Track;
  license: License;
}

interface CartState {
  items: CartItem[];
  addToCart: (beat: Track, license?: License) => void;
  removeFromCart: (beatId: string) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      addToCart: (beat, license) => {
        const items = get().items;
        
        // Default license if none provided
        const finalLicense = license || {
          id: 'basic',
          name: 'Basic License',
          price: beat.price || 29.99,
          features: ['MP3 File', 'Standard Usage']
        };

        // Check if beat is already in cart, if so, replace license
        const existingIndex = items.findIndex((item) => item.beatId === beat.id);
        
        let newItems;
        if (existingIndex >= 0) {
          newItems = [...items];
          newItems[existingIndex] = { beatId: beat.id, beat, license: finalLicense };
        } else {
          newItems = [...items, { beatId: beat.id, beat, license: finalLicense }];
        }

        const total = newItems.reduce((sum, item) => sum + (item.license?.price || 0), 0);
        set({ items: newItems, total });
      },
      removeFromCart: (beatId) => {
        const newItems = get().items.filter((item) => item.beatId !== beatId);
        const total = newItems.reduce((sum, item) => sum + (item.license?.price || 0), 0);
        set({ items: newItems, total });
      },
      clearCart: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'cart-storage',
    }
  )
);
