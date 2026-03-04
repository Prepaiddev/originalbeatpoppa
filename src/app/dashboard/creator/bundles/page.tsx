"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import { Plus, Package, Music, Trash2, Edit, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';

export default function BundlesPage() {
  const { user } = useAuthStore();
  const { currency, exchangeRates } = useUIStore();
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBundles() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('bundles')
        .select(`
          *,
          bundle_beats(
            beat_id,
            beats(*)
          )
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBundles(data);
      }
      setLoading(false);
    }

    fetchBundles();
  }, [user]);

  const deleteBundle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;
    
    const { error } = await supabase
      .from('bundles')
      .delete()
      .eq('id', id);

    if (!error) {
      setBundles(bundles.filter(b => b.id !== id));
    } else {
      alert('Error deleting bundle: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black mb-2">Beat Bundles</h1>
            <p className="text-zinc-400">Create collections of beats to sell at a discounted price.</p>
          </div>
          <Link 
            href="/dashboard/creator/bundles/new" 
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors self-start"
          >
            <Plus size={20} />
            Create New Bundle
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : bundles.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package size={40} className="text-zinc-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Bundles Yet</h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-8">
              Start selling collections of your beats. Bundles are a great way to increase your average order value.
            </p>
            <Link 
              href="/dashboard/creator/bundles/new" 
              className="px-8 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors inline-block"
            >
              Create Your First Bundle
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => (
              <div key={bundle.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group">
                <div className="relative h-48 w-full">
                  <Image 
                    src={bundle.cover_url || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop"} 
                    alt={bundle.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white line-clamp-1">{bundle.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Music size={12} />
                      {bundle.bundle_beats?.length || 0} Beats Included
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-primary text-white text-xs font-black px-3 py-1 rounded-full shadow-lg">
                    {formatPrice(bundle.price, currency, exchangeRates)}
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-6 h-10">
                    {bundle.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-auto">
                    <button 
                      onClick={() => deleteBundle(bundle.id)}
                      className="p-2.5 bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 text-zinc-400 rounded-xl transition-all"
                      title="Delete Bundle"
                    >
                      <Trash2 size={18} />
                    </button>
                    <Link 
                      href={`/dashboard/creator/bundles/edit/${bundle.id}`}
                      className="p-2.5 bg-zinc-800 hover:bg-primary/10 hover:text-primary text-zinc-400 rounded-xl transition-all"
                      title="Edit Bundle"
                    >
                      <Edit size={18} />
                    </Link>
                    <Link 
                      href={`/bundle/${bundle.id}`}
                      className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl text-center transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={16} />
                      View Public Page
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
