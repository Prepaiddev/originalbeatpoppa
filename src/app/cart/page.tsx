"use client";

import Header from '@/components/Header';
import { Trash2, ArrowRight, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';

export default function CartPage() {
  const { items, removeFromCart, total } = useCartStore();
  const { currency, exchangeRates } = useUIStore();

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
            {items.map((item) => (
              <div key={item.beatId} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                  <Image src={item.beat.coverUrl} alt={item.beat.title} fill className="object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-white truncate">{item.beat.title}</h3>
                  <p className="text-zinc-400 text-sm mb-1">{item.beat.artist}</p>
                  <span className="inline-block px-2 py-0.5 bg-zinc-800 rounded text-xs text-primary font-medium">
                    {item.license.name}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-4">
                  <span className="font-bold text-lg">{formatPrice(item.license.price, currency, exchangeRates)}</span>
                  <button 
                    onClick={() => removeFromCart(item.beatId)}
                    className="text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 sticky top-24">
              <h3 className="font-bold text-xl mb-6">Order Summary</h3>
              
              <div className="space-y-3 mb-6 border-b border-zinc-800 pb-6">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(total, currency, exchangeRates)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Taxes (Est.)</span>
                  <span>{formatPrice(0, currency, exchangeRates)}</span>
                </div>
              </div>

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
