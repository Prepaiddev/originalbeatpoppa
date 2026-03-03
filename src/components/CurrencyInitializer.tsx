"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase/client";

export default function CurrencyInitializer() {
  const { setCurrency, toggleCurrencyModal, fetchExchangeRates } = useUIStore();
  const { user, profile, initialize } = useAuthStore();

  useEffect(() => {
    // 1. Initial auth check
    initialize();

    // 2. Initial exchange rates fetch
    fetchExchangeRates();

    // 2. Check for currency preference
    const initializeCurrency = async () => {
      // If user is logged in, try to get currency from profile
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('preferred_currency')
          .eq('id', user.id)
          .single();

        if (profileData?.preferred_currency) {
          setCurrency(profileData.preferred_currency);
        }
      } else {
        // For guest users, check local storage or use default (USD)
        const savedCurrency = localStorage.getItem('preferred_currency');
        if (savedCurrency) {
          setCurrency(savedCurrency as any);
        }
      }
    };

    initializeCurrency();
  }, [user]);

  return null;
}
