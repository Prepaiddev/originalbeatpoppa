"use client";

import { ShoppingCart, Music, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import VerifiedCheck from './VerifiedCheck';
import clsx from 'clsx';

interface BundleProps {
  bundle: {
    id: string;
    title: string;
    price: number;
    cover_url?: string;
    artist: string;
    username?: string;
    isVerified?: boolean;
    beatCount: number;
  };
}

export default function BundleCard({ bundle }: BundleProps) {
  const { addToCart, items } = useCartStore();
  const { currency, exchangeRates } = useUIStore();
  const isInCart = items.some((i) => i.id === bundle.id);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden hover:bg-zinc-900/60 transition-all group flex flex-col h-full">
      <Link href={`/bundle/${bundle.id}`} className="block relative aspect-square overflow-hidden">
        <Image 
          src={bundle.cover_url || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop"} 
          alt={bundle.title} 
          fill 
          className="object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
          Bundle
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center translate-y-4 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-bold text-white">
            <Music size={10} className="text-primary" />
            {bundle.beatCount} Beats
          </div>
        </div>
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <Link href={`/bundle/${bundle.id}`} className="block mb-1">
          <h3 className="font-bold text-white truncate hover:text-primary transition-colors">{bundle.title}</h3>
        </Link>
        
        <div className="flex items-center gap-1 mb-4">
          <Link 
            href={bundle.username ? `/creator/${bundle.username}` : "/creators"} 
            className="text-xs text-zinc-500 hover:text-white transition-colors truncate"
          >
            {bundle.artist}
          </Link>
          {bundle.isVerified && <VerifiedCheck size={12} />}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Bundle Price</span>
            <span className="text-lg font-black text-white">{formatPrice(bundle.price, currency, exchangeRates)}</span>
          </div>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToCart(bundle as any, 'bundle');
            }}
            className={clsx(
              "p-3 rounded-xl transition-all flex items-center justify-center gap-2",
              isInCart 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "bg-white text-black hover:bg-primary hover:text-white"
            )}
          >
            <ShoppingCart size={18} />
            <span className="text-xs font-bold">{isInCart ? 'In Cart' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
