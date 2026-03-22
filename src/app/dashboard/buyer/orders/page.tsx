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
import StatusModal from '@/components/StatusModal';

export default function MyOrdersPage() {
  const { user } = useAuthStore();
  const { currency, exchangeRates } = useUIStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'error' as const, title: '', message: '' });
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
          .from('orders')
          .select(`
            id,
            created_at,
            status,
            total_amount,
            payment_provider,
            transaction_id,
            order_items(
              id,
              beat_id,
              license_type,
              price,
              beats(
                id,
                title,
                cover_url,
                audio_url,
                profiles:artist_id(display_name)
              )
            )
          `)
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const flattened: any[] = [];
        (data || []).forEach((o: any) => {
          (o.order_items || []).forEach((i: any) => {
            flattened.push({ ...i, order: o });
          });
        });

        const licenseTypeIds = Array.from(
          new Set(
            flattened
              .map((i: any) => i.license_type)
              .filter((x: any) => typeof x === 'string' && x.length > 0)
          )
        );

        const { data: licenseTypes } = await supabase.from('license_types').select('id, name').in('id', licenseTypeIds);
        const licenseTypeMap = new Map<string, string>((licenseTypes || []).map((l: any) => [l.id, l.name]));

        setOrders(flattened.map((i: any) => ({ ...i, license_name: licenseTypeMap.get(i.license_type) || i.license_type })));
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user?.id]);

  const downloadBlob = async (res: Response, filename: string) => {
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadLicense = async (orderItemId: string, title?: string) => {
    try {
      const res = await fetch(`/api/licenses/${orderItemId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setStatusModal({ isOpen: true, type: 'error', title: 'License Failed', message: json?.error || 'Unable to generate license.' });
        return;
      }
      await downloadBlob(res, `${(title || 'License').replaceAll('/', '-')}_License.pdf`);
    } catch (err: any) {
      setStatusModal({ isOpen: true, type: 'error', title: 'License Failed', message: err?.message || 'Unable to generate license.' });
    }
  };

  const handleViewInvoice = async (orderId: string) => {
    try {
      const res = await fetch(`/api/invoices/${orderId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setStatusModal({ isOpen: true, type: 'error', title: 'Receipt Failed', message: json?.error || 'Unable to generate receipt.' });
        return;
      }
      await downloadBlob(res, `Invoice_${orderId.slice(0, 8)}.pdf`);
    } catch (err: any) {
      setStatusModal({ isOpen: true, type: 'error', title: 'Receipt Failed', message: err?.message || 'Unable to generate receipt.' });
    }
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
          <p className="text-zinc-400">Manage your purchases, licenses, and receipts</p>
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
              const title = item.beats?.title;
              const coverUrl = item.beats?.cover_url;
              const artist = item.beats?.profiles?.display_name;
              const order = item.order;

              return (
                <div key={item.id} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center gap-6 group hover:border-zinc-700 transition-colors">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-lg">
                    <Image 
                      src={coverUrl || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop"} 
                      alt={title || "Item"} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  
                  <div className="flex-1 text-center md:text-left min-w-0 w-full">
                    <h3 className="font-bold text-white text-lg truncate">{title}</h3>
                    <p className="text-zinc-500 text-sm mb-2">{artist || 'Unknown Artist'}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={14} className="text-zinc-600" />
                        Purchased {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck size={14} className="text-zinc-600" />
                        {`${item.license_name || item.license_type} License`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto justify-center">
                    <button 
                      onClick={() => handleDownloadLicense(item.id, title)}
                      className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      License
                    </button>
                    <button
                      onClick={() => handleViewInvoice(order.id)}
                      className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      Receipt
                    </button>
                    <Link 
                      href={`/beat/${item.beat_id}`}
                      className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      View Beat
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

        <StatusModal
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
          type={statusModal.type}
          title={statusModal.title}
          message={statusModal.message}
        />
      </main>
    </div>
  );
}
