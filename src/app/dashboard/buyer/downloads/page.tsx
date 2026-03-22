"use client";

import Header from '@/components/Header';
import { Download, FileText, Music2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import StatusModal from '@/components/StatusModal';

export default function BuyerDownloadsPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'error' as const, title: '', message: '' });

  useEffect(() => {
    async function fetchDownloads() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            status,
            order_items(
              id,
              beat_id,
              license_type,
              beats(
                id,
                title,
                cover_url,
                profiles:artist_id(display_name)
              )
            )
          `)
          .eq('buyer_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const flattened: any[] = [];
        (data || []).forEach((o: any) => {
          (o.order_items || []).forEach((i: any) => {
            flattened.push({ ...i, order: o });
          });
        });
        setItems(flattened);
      } catch (err) {
        console.error('Error fetching downloads:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDownloads();
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

  const handleDownloadFiles = async (orderId: string, orderItemId: string, title?: string) => {
    setDownloadingId(orderItemId);
    setStatusModal({ isOpen: false, type: 'error', title: '', message: '' });

    const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');
    if (popup) {
      try {
        popup.document.title = 'Preparing download';
        popup.document.body.innerHTML = '<div style="font-family: system-ui; padding: 24px;"><h2>Preparing your download…</h2><p>You can close this tab if it stays here for more than a few seconds.</p></div>';
      } catch {}
    }

    try {
      const res = await fetch(`/api/downloads/${orderId}`);
      const json = await res.json();

      if (!res.ok) {
        const msg = json?.error || 'Unable to generate download link. Please try again.';
        setStatusModal({ isOpen: true, type: 'error', title: 'Download Failed', message: msg });
        if (popup) popup.close();
        return;
      }

      const link = (json?.links || []).find((l: any) => l.order_item_id === orderItemId);
      if (!link?.download_url) {
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'File Not Available',
          message: 'This beat file is not available for download yet.'
        });
        if (popup) popup.close();
        return;
      }

      if (popup) {
        popup.location.href = link.download_url;
      } else {
        window.location.href = link.download_url;
      }
    } catch (err: any) {
      const msg = err?.message || 'Download failed. Please try again.';
      setStatusModal({ isOpen: true, type: 'error', title: 'Download Failed', message: msg });
      if (popup) popup.close();
    } finally {
      setDownloadingId(null);
    }
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

  const handleDownloadReceipt = async (orderId: string) => {
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
          <h1 className="text-3xl font-bold mb-2">Downloads</h1>
          <p className="text-zinc-400">Download your purchased beats and license documents</p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-xl border border-zinc-800">
            <Music2 className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">No downloads yet</h3>
            <p className="text-zinc-500">Complete a purchase to unlock downloads here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item: any) => {
              const title = item.beats?.title || 'Beat';
              const artist = item.beats?.profiles?.display_name || 'Unknown Artist';
              const order = item.order;

              return (
                <div key={item.id} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="font-bold text-white text-lg truncate">{title}</h3>
                    <p className="text-zinc-500 text-sm mb-2">{artist}</p>
                    <p className="text-xs text-zinc-500">
                      Purchased {new Date(order.created_at).toLocaleDateString()} • {item.license_type} License
                    </p>
                  </div>

                  <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto justify-center">
                    <button
                      onClick={() => handleDownloadFiles(order.id, item.id, title)}
                      disabled={downloadingId === item.id}
                      className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      {downloadingId === item.id ? 'Preparing...' : 'Download'}
                    </button>
                    <button
                      onClick={() => handleDownloadLicense(item.id, title)}
                      className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      License
                    </button>
                    <button
                      onClick={() => handleDownloadReceipt(order.id)}
                      className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
    </div>
  );
}
