"use client";

import Header from '@/components/Header';
import { Trash2, ArrowRight, ShoppingCart, Tag, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { supabase } from '@/lib/supabase/client';
import clsx from 'clsx';

export default function CartPage() {
  const { items, removeFromCart, total, subtotal, coupon, applyCoupon, removeCoupon } = useCartStore();
  const { currency, exchangeRates } = useUIStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplying(true);
    setCouponError('');
    
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        setCouponError('Invalid or expired coupon code');
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCouponError('This coupon has expired');
        return;
      }

      // Check max uses
      if (data.max_uses && data.used_count >= data.max_uses) {
        setCouponError('This coupon has reached its maximum usage limit');
        return;
      }

      applyCoupon(data.code, data.discount_percent);
      setCouponCode('');
    } catch (err) {
      setCouponError('Error applying coupon');
    } finally {
      setIsApplying(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black pb-24">
        <Header />
        <main className="pt-[80px] max-w-7xl mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
            <ShoppingCart size={32} className="text-zinc-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-zinc-400 mb-8">Looks like you haven't added any beats yet.</p>
          <Link 
            href="/explore"
            className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-red-600 transition-colors"
          >
            Explore Beats
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const isBeat = item.type === 'beat';
              const track = isBeat ? item.item as any : null;
              const bundle = !isBeat ? item.item as any : null;
              
              return (
                <div key={item.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                    <Image 
                      src={isBeat ? track.coverUrl : (bundle.cover_url || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop")} 
                      alt={isBeat ? track.title : bundle.title} 
                      fill 
                      className="object-cover" 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-white truncate">{isBeat ? track.title : bundle.title}</h3>
                    <p className="text-zinc-400 text-sm mb-1">{isBeat ? track.artist : (bundle.artist || 'Bundle Pack')}</p>
                    <span className="inline-block px-2 py-0.5 bg-zinc-800 rounded text-xs text-primary font-medium">
                      {isBeat ? item.license?.name : 'Bundle'}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-4">
                    <span className="font-bold text-lg">{formatPrice(item.price, currency, exchangeRates)}</span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove from cart"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 sticky top-24">
              <h3 className="font-bold text-xl mb-6">Order Summary</h3>
              
              <div className="space-y-3 mb-6 border-b border-zinc-800 pb-6">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal, currency, exchangeRates)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-green-500 text-sm">
                    <span className="flex items-center gap-1">
                      <Tag size={12} /> Discount ({coupon.code})
                    </span>
                    <span>-{formatPrice(subtotal - total, currency, exchangeRates)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Taxes (Est.)</span>
                  <span>{formatPrice(0, currency, exchangeRates)}</span>
                </div>
              </div>

              {/* Coupon Input */}
              {!coupon ? (
                <div className="mb-6">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Coupon Code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary uppercase"
                    />
                    <button 
                      onClick={handleApplyCoupon}
                      disabled={isApplying || !couponCode}
                      className="px-4 py-2 bg-zinc-800 text-white text-sm font-bold rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-all"
                    >
                      {isApplying ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-red-500 text-[10px] mt-1 font-bold">{couponError}</p>}
                </div>
              ) : (
                <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-500">
                    <Tag size={14} />
                    <span className="text-xs font-bold">{coupon.code} Applied</span>
                  </div>
                  <button onClick={removeCoupon} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center mb-8">
                <span className="font-bold text-lg">Total</span>
                <span className="font-black text-2xl text-primary">{formatPrice(total, currency, exchangeRates)}</span>
              </div>

              <Link 
                href="/checkout"
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Checkout <ArrowRight size={18} />
              </Link>
              
              <p className="text-center text-xs text-zinc-500 mt-4">
                Secure payment via Stripe / PayPal
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
