"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Check, Info, Loader2, ArrowLeft } from 'lucide-react';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import Link from 'next/link';

interface LicenseType {
  id: string;
  name: string;
  description: string;
  default_price: number;
  features: string[];
  is_active: boolean;
}

export default function LicensingPage() {
  const { currency, exchangeRates } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<LicenseType[]>([]);

  useEffect(() => {
    fetchLicenses();
  }, []);

  async function fetchLicenses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('license_types')
        .select('*')
        .eq('is_active', true)
        .order('default_price', { ascending: true });

      if (error) throw error;
      setLicenses(data || []);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />
      
      <main className="flex-grow pt-[120px] pb-24 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 uppercase">
            License <span className="text-primary">Comparison</span>
          </h1>
          <p className="text-zinc-500 text-lg md:text-xl font-medium max-w-2xl mx-auto">
            Choose the right license for your project. All licenses are royalty-free and come with high-quality files.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {licenses.map((license, index) => (
            <div 
              key={license.id}
              className={`relative bg-zinc-900/40 backdrop-blur-xl border rounded-[2.5rem] p-8 md:p-10 flex flex-col shadow-2xl transition-all duration-500 hover:scale-[1.02] ${
                index === 1 ? 'border-primary shadow-[0_30px_60px_rgba(225,29,72,0.15)]' : 'border-white/5'
              }`}
            >
              {index === 1 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-xl">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{license.name}</h2>
                <p className="text-zinc-500 text-sm font-medium line-clamp-2">{license.description}</p>
              </div>

              <div className="mb-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                    {formatPrice(license.default_price, currency, exchangeRates, true)}
                  </span>
                  {license.default_price > 0 && <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Starting at</span>}
                </div>
              </div>

              <div className="space-y-4 mb-10 flex-grow">
                {license.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-primary" strokeWidth={4} />
                    </div>
                    <span className="text-zinc-300 text-sm font-bold uppercase tracking-wide leading-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/explore"
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-center transition-all duration-300 ${
                  index === 1 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-rose-600' 
                    : 'bg-white/5 text-white border border-white/5 hover:bg-white/10'
                }`}
              >
                Browse Beats
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-20 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Info size={32} className="text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Still have questions?</h3>
              <p className="text-zinc-400 font-medium mb-6 leading-relaxed">
                If you need a custom license or have specific usage requirements not covered here, please reach out to our support team or the creator directly.
              </p>
              <Link 
                href="/legal/terms"
                className="text-primary font-black uppercase tracking-widest text-sm hover:underline"
              >
                Read Full Licensing Terms
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
