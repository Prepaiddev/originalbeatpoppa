"use client";

import { X, Check, DollarSign, Globe } from "lucide-react";
import { useUIStore, Currency } from "@/store/useUIStore";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase/client";
import clsx from "clsx";

export default function CurrencySelectionModal() {
  const { isCurrencyModalOpen, toggleCurrencyModal, currency, setCurrency } = useUIStore();
  const { user, profile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const currencies: { code: Currency; name: string; symbol: string; region: string }[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', region: 'Global' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', region: 'Nigeria' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', region: 'Ghana' },
    { code: 'KSH', name: 'Kenyan Shilling', symbol: 'KSh', region: 'Kenya' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', region: 'South Africa' },
    { code: 'GBP', name: 'British Pound', symbol: '£', region: 'UK' },
    { code: 'EUR', name: 'Euro', symbol: '€', region: 'Europe' },
  ];

  const handleSelect = async (code: Currency) => {
    setLoading(true);
    try {
      setCurrency(code);
      
      // If logged in, save preference to profile
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_currency: code })
          .eq('id', user.id);
      }
      
      // Close after a short delay for feedback
      setTimeout(() => {
        toggleCurrencyModal();
        setLoading(false);
      }, 300);
    } catch (error) {
      console.error('Error saving currency preference:', error);
      setLoading(false);
    }
  };

  if (!isCurrencyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={toggleCurrencyModal}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-zinc-900 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Globe className="text-primary" size={24} />
              Select <span className="text-primary">Currency</span>
            </h2>
            <p className="text-zinc-500 text-sm font-medium mt-1">Choose your preferred currency for browsing and checkout</p>
          </div>
          <button 
            onClick={toggleCurrencyModal}
            className="p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Currency List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-2">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => handleSelect(curr.code)}
                disabled={loading}
                className={clsx(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all group",
                  currency === curr.code 
                    ? "bg-primary/10 border-primary/50 text-white" 
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700 hover:text-white"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black transition-all",
                    currency === curr.code ? "bg-primary text-black" : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    {curr.symbol}
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase text-xs tracking-widest">{curr.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{curr.region} • {curr.code}</p>
                  </div>
                </div>
                
                {currency === curr.code && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-900/30 border-t border-zinc-900 text-center">
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">
            Note: All prices are converted based on real-time exchange rates.
          </p>
        </div>
      </div>
    </div>
  );
}
