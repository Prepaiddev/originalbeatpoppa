import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from './usePlayerStore';

export interface License {
  id: string;
  name: string;
  price: number;
  features: string[];
}

export interface Bundle {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  price: number;
  cover_url?: string;
  beats?: Track[];
}

export type CartItemType = 'beat' | 'bundle';

export interface CartItem {
  id: string; // beatId or bundleId
  type: CartItemType;
  item: Track | Bundle;
  license?: License; // only for beats
  price: number;
}

interface CartState {
  items: CartItem[];
  coupon: { code: string; discount: number } | null;
  addToCart: (item: Track | Bundle, type: CartItemType, license?: License) => void;
  removeFromCart: (id: string) => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      total: 0,
      subtotal: 0,
      addToCart: (item, type, license) => {
        const { items, coupon } = get();
        
        let finalPrice = 0;
        let finalLicense = license;

        if (type === 'beat') {
          const beat = item as Track;
          finalLicense = license || {
            id: 'basic',
            name: 'Basic License',
            price: beat.price || 29.99,
            features: ['MP3 File', 'Standard Usage']
          };
          finalPrice = finalLicense.price;
        } else {
          finalPrice = (item as Bundle).price;
        }

        const existingIndex = items.findIndex((i) => i.id === item.id);
        let newItems = [...items];
        
        if (existingIndex >= 0) {
          newItems[existingIndex] = { id: item.id, type, item, license: finalLicense, price: finalPrice };
        } else {
          newItems.push({ id: item.id, type, item, license: finalLicense, price: finalPrice });
        }

        const subtotal = newItems.reduce((sum, i) => sum + i.price, 0);
        const total = coupon ? subtotal * (1 - coupon.discount / 100) : subtotal;
        
        set({ items: newItems, subtotal, total });
      },
      removeFromCart: (id) => {
        const { items, coupon } = get();
        const newItems = items.filter((item) => item.id !== id);
        const subtotal = newItems.reduce((sum, i) => sum + i.price, 0);
        const total = coupon ? subtotal * (1 - coupon.discount / 100) : subtotal;
        set({ items: newItems, subtotal, total });
      },
      applyCoupon: (code, discount) => {
        const { subtotal } = get();
        set({ 
          coupon: { code, discount },
          total: subtotal * (1 - discount / 100)
        });
      },
      removeCoupon: () => {
        const { subtotal } = get();
        set({ coupon: null, total: subtotal });
      },
      clearCart: () => set({ items: [], total: 0, subtotal: 0, coupon: null }),
    }),
    {
      name: 'cart-storage',
    }
  )
);
