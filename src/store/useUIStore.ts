import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

export type Currency = 'USD' | 'NGN' | 'GHS' | 'KSH' | 'ZAR' | 'GBP' | 'EUR';
export type UserRole = 'guest' | 'buyer' | 'creator' | 'admin';

interface User {
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
}

interface UIState {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;

  isCurrencyModalOpen: boolean;
  toggleCurrencyModal: () => void;
  
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  
  exchangeRates: Record<string, number>;
  fetchExchangeRates: () => Promise<void>;
}

export const useUIStore = create<UIState>((set) => ({
  isMenuOpen: false,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
  closeMenu: () => set({ isMenuOpen: false }),

  isCurrencyModalOpen: false,
  toggleCurrencyModal: () => set((state) => ({ isCurrencyModalOpen: !state.isCurrencyModalOpen })),
  
  currency: 'USD',
  setCurrency: (currency) => set({ currency }),
  
  user: null,
  login: (role) => set({ 
    user: { 
      name: 'Sdsd User', 
      email: 'user@example.com', 
      role,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'
    } 
  }),
  logout: () => set({ user: null }),

  // Simplified exchange rates relative to USD (1 USD = X Currency)
  exchangeRates: {
    USD: 1,
    NGN: 1500,
    GHS: 15,
    KSH: 130,
    ZAR: 19,
    GBP: 0.79,
    EUR: 0.92,
  },
  fetchExchangeRates: async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'currency_settings')
        .maybeSingle();

      if (error) {
        if (error.message === 'Failed to fetch') {
          console.warn('Network connection issue fetching exchange rates. Check your internet or ad-blocker.');
        } else if (error.code !== 'PGRST116') {
          console.error('Error fetching exchange rates:', error.message || error);
        }
        return;
      }

      if (data?.value?.currencies) {
        const rates: Record<string, number> = {};
        data.value.currencies.forEach((c: any) => {
          rates[c.code] = c.rate;
        });
        set({ exchangeRates: rates });
      } else {
        console.log('No exchange rates found in platform_settings, using defaults');
      }
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        console.warn('Network connection issue fetching exchange rates. Check your internet or ad-blocker.');
      } else {
        console.error('Error in fetchExchangeRates:', error);
      }
    }
  }
}));

export const formatPrice = (priceInUSD: number, currency: string, rates: Record<string, number>, showFree: boolean = false) => {
  if (showFree && priceInUSD === 0) return 'Free';
  const rate = rates[currency] || 1;
  const convertedPrice = priceInUSD * rate;
  
  // Try to find the symbol for this currency if we had a more complex store, 
  // but for now Intl.NumberFormat handles most standard ones.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(convertedPrice);
};
