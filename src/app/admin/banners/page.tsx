"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Layout, Plus, Trash2, Music, User, Trophy, Image as ImageIcon, Link as LinkIcon, Loader2, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';
import Image from 'next/image';
import clsx from 'clsx';

interface BannerItem {
  id: string;
  type: 'producer' | 'beat' | 'artist';
  design_type: 'floating' | 'chat' | 'large';
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  order_index: number;
  beat_id?: string;
  beat_data?: any;
}

export default function AdminBannerManagementPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, isInitialized } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'loading' | 'auth',
    title: '',
    message: ''
  });
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, bannerId: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be under 5MB');
      return;
    }

    setUploadingId(bannerId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${bannerId}-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      updateBanner(bannerId, { image_url: publicUrl });
    } catch (error: any) {
      console.error('Error uploading banner image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploadingId(null);
    }
  };

  useEffect(() => {
    // Only act when initialization is complete
    if (!isInitialized || authLoading) return;

    console.log('AdminBanner Auth Check:', { isInitialized, authLoading, user: !!user, role: profile?.role });

    if (!user || profile?.role !== 'admin') {
      console.log('Redirecting from AdminBanner because:', { noUser: !user, notAdmin: profile?.role !== 'admin' });
      router.push('/');
      return;
    }

    async function fetchData() {
      try {
        console.log('AdminBanner: Fetching data...');
        setLoading(true);
        
        // Fetch banners
        const { data: bannerData, error: bannerError } = await supabase
          .from('promotional_banners')
          .select('*')
          .order('order_index', { ascending: true });

        if (bannerError) {
          console.warn('promotional_banners table might not exist yet');
          setBanners([]);
        } else {
          setBanners(bannerData || []);
        }

        // Fetch beats for linking
        const { data: beatsData } = await supabase
          .from('beats')
          .select('id, title, profiles(display_name), cover_url, audio_url, price')
          .limit(100);

        setBeats(beatsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchData();
  }, [user, profile, authLoading, isInitialized, router]);

  const handleAddBanner = () => {
    const newBanner: BannerItem = {
      id: crypto.randomUUID(),
      type: 'producer',
      design_type: 'floating',
      title: 'New Spotlight',
      subtitle: 'Description of this spotlight...',
      image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop',
      link_url: '/',
      is_active: true,
      order_index: banners.length
    };
    setBanners([...banners, newBanner]);
  };

  const handleRemoveBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  const updateBanner = (id: string, updates: Partial<BannerItem>) => {
    setBanners(banners.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare data for upsert - only send database columns
      const dataToSave = banners.map((b, idx) => ({
        id: b.id,
        type: b.type,
        design_type: b.design_type || 'floating',
        title: b.title,
        subtitle: b.subtitle,
        image_url: b.image_url,
        link_url: b.link_url,
        is_active: b.is_active,
        order_index: idx,
        beat_id: b.beat_id,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('promotional_banners')
        .upsert(dataToSave);

      if (error) throw error;
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Banners Saved',
        message: 'Promotional banners updated successfully.'
      });
    } catch (err) {
      console.error('Error saving banners:', err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error Saving',
        message: 'Failed to save banners. Make sure the "promotional_banners" table exists.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[100px] max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Banner Management</h1>
            <p className="text-zinc-500 font-medium">Configure promotional spotlights and auto-playing beat banners</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleAddBanner}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              <Plus size={20} />
              Add Banner
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save Changes
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {banners.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-[32px] text-zinc-600">
              <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">No promotional banners configured.</p>
              <p className="text-sm">Click "Add Banner" to create your first spotlight.</p>
            </div>
          )}

          {banners.map((banner, index) => (
            <div key={banner.id} className="relative group overflow-hidden bg-zinc-900/40 border border-zinc-800 rounded-[32px] transition-all hover:border-zinc-700">
              {/* Glass Reflection */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="p-8 relative z-10">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Image Preview & Upload */}
                  <div className="w-full lg:w-1/3">
                    <div className={clsx(
                      "relative aspect-video overflow-hidden border transition-all duration-700",
                      banner.type === 'beat' ? "rounded-2xl" : "rounded-full aspect-square w-48 mx-auto",
                      "bg-zinc-800 border-zinc-700 group-hover:border-primary/30 shadow-2xl"
                    )}>
                      <Image src={banner.image_url} alt="Preview" fill className="object-cover transition-transform group-hover:scale-105" />
                      <div className={clsx(
                        "absolute inset-0 bg-black/40 transition-all flex items-center justify-center backdrop-blur-sm",
                        uploadingId === banner.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}>
                        {uploadingId === banner.id ? (
                          <Loader2 className="animate-spin text-white" size={32} />
                        ) : (
                          <label className="cursor-pointer bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
                            Change
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, banner.id)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="mt-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Image URL</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={banner.image_url}
                          onChange={(e) => updateBanner(banner.id, { image_url: e.target.value })}
                          className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-[10px] text-zinc-400 focus:outline-none focus:border-primary transition-all"
                          placeholder="https://..."
                        />
                        <ImageIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Content Type</label>
                        <select 
                          value={banner.type}
                          onChange={(e) => updateBanner(banner.id, { type: e.target.value as any })}
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary appearance-none"
                        >
                          <option value="producer">Producer Spotlight</option>
                          <option value="beat">Beat Spotlight</option>
                          <option value="artist">Artist Spotlight</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Design Layout</label>
                        <select 
                          value={banner.design_type || 'floating'}
                          onChange={(e) => updateBanner(banner.id, { design_type: e.target.value as any })}
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary appearance-none"
                        >
                          <option value="floating">Floating (Bottom Center)</option>
                          <option value="chat">Chat Bubble (Bottom Right)</option>
                          <option value="large">Full Screen (Centered)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Status</label>
                        <button 
                          onClick={() => updateBanner(banner.id, { is_active: !banner.is_active })}
                          className={clsx(
                            "w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
                            banner.is_active ? "bg-primary/10 border-primary/50 text-primary" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                          )}
                        >
                          {banner.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Title</label>
                      <input 
                        type="text" 
                        value={banner.title}
                        onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-primary"
                        placeholder="e.g., Top Producer This Week"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Subtitle / Description</label>
                      <textarea 
                        value={banner.subtitle}
                        onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary h-20 resize-none"
                        placeholder="Add some catchy description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block flex items-center gap-2">
                          <LinkIcon size={12} /> Link URL
                        </label>
                        <input 
                          type="text" 
                          value={banner.link_url}
                          onChange={(e) => updateBanner(banner.id, { link_url: e.target.value })}
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400 focus:outline-none focus:border-primary"
                          placeholder="/producers/username"
                        />
                      </div>
                      {banner.type === 'beat' && (
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block flex items-center gap-2">
                            <Music size={12} /> Link to Beat (Auto-play)
                          </label>
                          <select 
                            value={banner.beat_id || ''}
                            onChange={(e) => {
                              const beat = beats.find(b => b.id === e.target.value);
                              updateBanner(banner.id, { 
                                beat_id: e.target.value,
                                beat_data: beat 
                              });
                            }}
                            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary appearance-none"
                          >
                            <option value="">Select a beat...</option>
                            {beats.map(beat => (
                              <option key={beat.id} value={beat.id}>{beat.title} - {beat.profiles?.display_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col justify-end gap-2">
                    <button 
                      onClick={() => handleRemoveBanner(banner.id)}
                      className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
    </div>
  );
}
