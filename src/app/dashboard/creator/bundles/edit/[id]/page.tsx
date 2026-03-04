"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import { ChevronLeft, Plus, Music, X, Search, Check, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import clsx from 'clsx';
import Image from 'next/image';

interface Beat {
  id: string;
  title: string;
  price: number;
  cover_url: string;
  genre: string;
}

export default function EditBundlePage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuthStore();
  const { currency, exchangeRates } = useUIStore();
  
  const [loading, setLoading] = useState(false);
  const [fetchingBundle, setFetchingBundle] = useState(true);
  const [beatsLoading, setBeatsLoading] = useState(true);
  const [myBeats, setMyBeats] = useState<Beat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    cover_url: ''
  });
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !id) return;
      
      // Fetch bundle data
      const { data: bundle, error: bundleError } = await supabase
        .from('bundles')
        .select(`
          *,
          bundle_beats(beat_id)
        `)
        .eq('id', id)
        .eq('creator_id', user.id)
        .single();

      if (bundleError || !bundle) {
        console.error('Error fetching bundle:', bundleError);
        router.push('/dashboard/creator/bundles');
        return;
      }

      setFormData({
        title: bundle.title || '',
        description: bundle.description || '',
        price: bundle.price?.toString() || '',
        cover_url: bundle.cover_url || ''
      });
      setCoverPreview(bundle.cover_url || null);
      setSelectedBeatIds(bundle.bundle_beats.map((bb: any) => bb.beat_id));
      setFetchingBundle(false);

      // Fetch user's beats
      setBeatsLoading(true);
      const { data: beats, error: beatsError } = await supabase
        .from('beats')
        .select('id, title, price, cover_url, genre')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false });

      if (!beatsError && beats) {
        setMyBeats(beats);
      }
      setBeatsLoading(false);
    }

    fetchData();
  }, [user, id, router]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleBeat = (id: string) => {
    setSelectedBeatIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredBeats = myBeats.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateRegularPrice = () => {
    return selectedBeatIds.reduce((sum, id) => {
      const beat = myBeats.find(b => b.id === id);
      return sum + (beat?.price || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    
    if (selectedBeatIds.length < 2) {
      alert('A bundle must contain at least 2 beats.');
      return;
    }

    if (!formData.title || !formData.price) {
      alert('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      let finalCoverUrl = formData.cover_url || (myBeats.find(b => b.id === selectedBeatIds[0])?.cover_url);

      // Upload cover file if provided
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${user.id}/bundle-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('covers')
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('covers')
          .getPublicUrl(fileName);
        
        finalCoverUrl = publicUrl;
      }

      // 1. Update the bundle
      const { error: bundleError } = await supabase
        .from('bundles')
        .update({
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          cover_url: finalCoverUrl,
        })
        .eq('id', id);

      if (bundleError) throw bundleError;

      // 2. Remove old bundle_beats
      const { error: deleteError } = await supabase
        .from('bundle_beats')
        .delete()
        .eq('bundle_id', id);

      if (deleteError) throw deleteError;

      // 3. Add new bundle_beats
      const bundleBeats = selectedBeatIds.map(beatId => ({
        bundle_id: id,
        beat_id: beatId
      }));

      const { error: insertError } = await supabase
        .from('bundle_beats')
        .insert(bundleBeats);

      if (insertError) throw insertError;

      router.push('/dashboard/creator/bundles');
      router.refresh();
    } catch (error: any) {
      alert('Error updating bundle: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingBundle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );
  }

  const regularPrice = calculateRegularPrice();
  const savings = regularPrice - (parseFloat(formData.price) || 0);
  const savingsPercent = regularPrice > 0 ? Math.round((savings / regularPrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <Link 
            href="/dashboard/creator/bundles" 
            className="text-zinc-500 hover:text-white flex items-center gap-2 mb-4 transition-colors"
          >
            <ChevronLeft size={20} />
            Back to Bundles
          </Link>
          <h1 className="text-4xl font-black">Edit Bundle</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Bundle Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                  Bundle Title *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Afrobeats Summer Pack 2024"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                  Description
                </label>
                <textarea 
                  rows={4}
                  placeholder="Tell your customers what's inside this collection..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                    Bundle Price * ({currency})
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="49.99"
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                    Cover Image
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex flex-col items-center justify-center h-[50px] border-2 border-dashed border-zinc-800 hover:border-primary hover:bg-primary/5 rounded-xl cursor-pointer transition-all group">
                      <div className="flex items-center gap-2 text-zinc-500 group-hover:text-primary transition-colors">
                        <Plus size={18} />
                        <span className="text-sm font-bold">Upload Cover</span>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleCoverChange}
                      />
                    </label>
                    {coverPreview && (
                      <div className="relative w-[50px] h-[50px] rounded-lg overflow-hidden border border-zinc-800">
                        <Image src={coverPreview} alt="Preview" fill className="object-cover" />
                        <button 
                          type="button"
                          onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <input 
                      type="text"
                      placeholder="Or paste URL: https://..."
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                      value={formData.cover_url}
                      onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Select Beats Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold">Included Beats</h3>
                  <p className="text-sm text-zinc-500">Choose at least 2 beats to include in this bundle.</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Search your beats..."
                    className="bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {beatsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : filteredBeats.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
                  <p className="text-zinc-500">No beats found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredBeats.map((beat) => {
                    const isSelected = selectedBeatIds.includes(beat.id);
                    return (
                      <div 
                        key={beat.id}
                        onClick={() => toggleBeat(beat.id)}
                        className={clsx(
                          "flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all",
                          isSelected 
                            ? "bg-primary/10 border-primary" 
                            : "bg-black border-zinc-800 hover:border-zinc-700"
                        )}
                      >
                        <div className="w-12 h-12 relative rounded-lg overflow-hidden mr-3 flex-shrink-0">
                          <Image src={beat.cover_url} alt={beat.title} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate">{beat.title}</h4>
                          <p className="text-xs text-zinc-500">{beat.genre} • {formatPrice(beat.price, currency, exchangeRates)}</p>
                        </div>
                        <div className={clsx(
                          "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary text-white" : "border-2 border-zinc-800"
                        )}>
                          {isSelected && <Check size={14} strokeWidth={4} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary & Action */}
          <div className="lg:col-span-1">
            <div className="sticky top-[100px] space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-xl font-bold mb-6">Bundle Summary</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-zinc-400">
                    <span>Beats Selected</span>
                    <span className="text-white font-bold">{selectedBeatIds.length}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Regular Total</span>
                    <span className="text-white font-bold line-through">
                      {formatPrice(regularPrice, currency, exchangeRates)}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Bundle Price</span>
                    <span className="text-primary font-black">
                      {formatPrice(parseFloat(formData.price) || 0, currency, exchangeRates)}
                    </span>
                  </div>
                  
                  {savings > 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mt-4">
                      <div className="flex justify-between text-green-500 font-bold text-sm">
                        <span>Total Savings</span>
                        <span>{formatPrice(savings, currency, exchangeRates)} ({savingsPercent}%)</span>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={loading || selectedBeatIds.length < 2}
                  className={clsx(
                    "w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg",
                    loading || selectedBeatIds.length < 2
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save size={20} />
                      Update Bundle
                    </>
                  )}
                </button>
                
                {selectedBeatIds.length < 2 && (
                  <p className="text-center text-xs text-red-500 mt-3">
                    Add at least 2 beats to continue.
                  </p>
                )}
              </div>

              {/* Preview Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden opacity-50">
                 <div className="p-4 border-b border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Live Preview</span>
                 </div>
                 <div className="relative h-40 w-full">
                    <Image 
                      src={coverPreview || formData.cover_url || (selectedBeatIds.length > 0 ? myBeats.find(b => b.id === selectedBeatIds[0])?.cover_url : "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop") || ""} 
                      alt="Preview" 
                      fill 
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                       <ImageIcon size={40} className="text-white/20" />
                    </div>
                 </div>
                 <div className="p-4">
                    <h4 className="font-bold text-white mb-1 truncate">{formData.title || 'Bundle Title'}</h4>
                    <p className="text-xs text-zinc-500 mb-3">{selectedBeatIds.length} Beats Included</p>
                    <div className="flex items-center justify-between">
                       <span className="text-primary font-black">{formatPrice(parseFloat(formData.price) || 0, currency, exchangeRates)}</span>
                       <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">Bundle</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
