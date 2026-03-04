"use client";

import Header from '@/components/Header';
import { Download, ShoppingBag, FileText, FileCheck, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import ReviewModal from '@/components/ReviewModal';

export default function MyOrdersPage() {
  const { user } = useAuthStore();
  const { currency, exchangeRates } = useUIStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean, beatId: string, beatTitle: string }>({
    isOpen: false,
    beatId: '',
    beatTitle: ''
  });

  useEffect(() => {
    async function fetchOrders() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            *,
            orders!inner(id, created_at, status),
            beats(id, title, cover_url, audio_url, profiles(display_name)),
            bundles(id, title, cover_url, creator_id, profiles:creator_id(display_name))
          `)
          .eq('orders.buyer_id', user.id)
          .order('created_at', { ascending: false, foreignTable: 'orders' });

        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user?.id]);

  const handleDownloadLicense = (item: any) => {
    alert(`Downloading ${item.license_type} License for "${item.beats?.title}"...`);
    // Logic to generate/download PDF would go here
  };

  const handleViewInvoice = (orderId: string) => {
    alert(`Viewing Invoice #${orderId.slice(0, 8)}...`);
    // Logic to open invoice view
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[80px] max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-zinc-400">Manage your purchases, downloads, and licenses</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-xl border border-zinc-800">
            <ShoppingBag className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">No orders yet</h3>
            <p className="text-zinc-500 mb-6">Start exploring beats to make your first purchase</p>
            <Link href="/explore" className="px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-red-600 transition-colors">
              Explore Beats
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((item) => {
              const isBundle = !!item.bundle_id;
              const title = isBundle ? item.bundles?.title : item.beats?.title;
              const coverUrl = isBundle ? item.bundles?.cover_url : item.beats?.cover_url;
              const artist = isBundle ? (item.bundles?.profiles?.display_name) : (item.beats?.profiles?.display_name);

              return (
                <div key={item.id} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center gap-6 group hover:border-zinc-700 transition-colors">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-lg">
                    <Image 
                      src={coverUrl || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop"} 
                      alt={title || "Item"} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {isBundle && (
                      <div className="absolute top-2 left-2 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                        Bundle
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center md:text-left min-w-0 w-full">
                    <h3 className="font-bold text-white text-lg truncate">{title}</h3>
                    <p className="text-zinc-500 text-sm mb-2">{artist || 'Unknown Artist'}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={14} className="text-zinc-600" />
                        Purchased {new Date(item.orders.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck size={14} className="text-zinc-600" />
                        {isBundle ? 'Full Pack License' : `${item.license_type} License`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto justify-center">
                    {!isBundle && (
                      <button 
                        onClick={() => setReviewModal({ isOpen: true, beatId: item.beat_id, beatTitle: title })}
                        className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <Star size={16} />
                        Review
                      </button>
                    )}
                    <button 
                      onClick={() => handleDownloadLicense(item)}
                      className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      License
                    </button>
                    <Link 
                      href={isBundle ? `/bundle/${item.bundle_id}` : `/beat/${item.beat_id}`}
                      className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      {isBundle ? 'View Pack' : 'View Beat'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ReviewModal 
          isOpen={reviewModal.isOpen} 
          onClose={() => setReviewModal({ ...reviewModal, isOpen: false })} 
          beatId={reviewModal.beatId} 
          beatTitle={reviewModal.beatTitle} 
        />
      </main>
    </div>
  );
}
