"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Loader2, Layout, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getAdminLink } from '@/constants/admin';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import StatusModal from '@/components/StatusModal';
import clsx from 'clsx';

interface GenreItem {
  label: string;
  icon: string;
}

interface GenreSettings {
  is_enabled: boolean;
  items: GenreItem[];
}

interface BannerSettings {
  is_enabled: boolean;
  auto_slide: boolean;
  slide_duration: number;
}

export default function AdminUISettingsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, isInitialized } = useAuthStore();
  const { adminPath, fetchAdminPath } = useSettingsStore();
  
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genreSettings, setGenreSettings] = useState<GenreSettings>({
    is_enabled: true,
    items: []
  });
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>({
    is_enabled: true,
    auto_slide: true,
    slide_duration: 5
  });

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    // Only redirect if we are sure the user is not an admin after auth has loaded
    if (!authLoading && isInitialized) {
      if (!user || profile?.role !== 'admin') {
        router.push('/');
        return;
      }
    }

    async function fetchSettings() {
      if (hasLoaded) return;
      
      try {
        console.log('Fetching UI settings...');
        const { data, error } = await supabase
          .from('platform_settings')
          .select('*')
          .in('key', ['genre_bar', 'banner_settings']);

        if (error) throw error;

        if (data) {
          const genreData = data.find(d => d.key === 'genre_bar');
          if (genreData?.value) setGenreSettings(genreData.value);

          const bannerData = data.find(d => d.key === 'banner_settings');
          if (bannerData?.value) setBannerSettings(bannerData.value);
        }
        setHasLoaded(true);
      } catch (error) {
        console.error('Error fetching UI settings:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user && isInitialized) {
      fetchSettings();
      fetchAdminPath();
    }
  }, [user?.id, profile?.role, authLoading, isInitialized, router, fetchAdminPath, hasLoaded]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: genreError } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'genre_bar',
          value: genreSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (genreError) throw genreError;

      const { error: bannerError } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'banner_settings',
          value: bannerSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (bannerError) throw bannerError;

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'UI configuration updated successfully.'
      });
    } catch (error) {
      console.error('Error saving UI settings:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to update UI settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setGenreSettings({
      ...genreSettings,
      items: [...genreSettings.items, { label: 'New Genre', icon: '✨' }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...genreSettings.items];
    newItems.splice(index, 1);
    setGenreSettings({ ...genreSettings, items: newItems });
  };

  const updateItem = (index: number, updates: Partial<GenreItem>) => {
    const newItems = [...genreSettings.items];
    newItems[index] = { ...newItems[index], ...updates };
    setGenreSettings({ ...genreSettings, items: newItems });
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-primary animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <Header />
      
      <main className="pt-24 px-4 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Layout className="text-primary" /> UI Customization
            </h1>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Configure homepage elements and navigation</p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>

        <div className="space-y-8">
          {/* Promotional Banners Global Settings */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] overflow-hidden">
            <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between bg-gradient-to-br from-primary/5 to-transparent">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Promotional Banners</h2>
                <p className="text-zinc-500 text-xs mt-1 font-medium italic">Global settings for your marketing banners & popups</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.push(getAdminLink('/banners', adminPath))}
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline bg-primary/5 px-4 py-2 rounded-xl border border-primary/20 transition-all"
                >
                  Manage Banner Content
                </button>
                <button 
                  onClick={() => setBannerSettings({ ...bannerSettings, is_enabled: !bannerSettings.is_enabled })}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-black uppercase tracking-widest text-[10px]",
                    bannerSettings.is_enabled 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                  )}
                >
                  {bannerSettings.is_enabled ? (
                    <><ToggleRight className="text-primary" size={20} /> Enabled</>
                  ) : (
                    <><ToggleLeft size={20} /> Disabled</>
                  )}
                </button>
              </div>
            </div>

            {bannerSettings.is_enabled && (
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Auto-Slide Carousel</label>
                    <button 
                      onClick={() => setBannerSettings({ ...bannerSettings, auto_slide: !bannerSettings.auto_slide })}
                      className={clsx(
                        "w-12 h-6 rounded-full transition-all relative",
                        bannerSettings.auto_slide ? "bg-primary" : "bg-zinc-800"
                      )}
                    >
                      <div className={clsx(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        bannerSettings.auto_slide ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                  
                  {bannerSettings.auto_slide && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Slide Duration (Seconds)</label>
                        <span className="text-primary font-black text-xs">{bannerSettings.slide_duration}s</span>
                      </div>
                      <input 
                        type="range" 
                        min="2" 
                        max="15" 
                        step="1"
                        value={bannerSettings.slide_duration}
                        onChange={(e) => setBannerSettings({ ...bannerSettings, slide_duration: parseInt(e.target.value) })}
                        className="w-full accent-primary bg-zinc-800 rounded-lg appearance-none h-2"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col justify-center">
                  <h4 className="text-white font-black text-sm mb-2 flex items-center gap-2">
                    <Info size={16} className="text-primary" /> Banner Layouts
                  </h4>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    You can customize individual banner designs (Floating, Chat Bubble, or Full Screen) in the <span className="text-primary font-bold">Banner Content</span> section.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Genre Bar Settings */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] overflow-hidden">
            <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Genre Filter Bar</h2>
                <p className="text-zinc-500 text-xs mt-1 font-medium italic">The sticky horizontal genre list on the home page</p>
              </div>
              <button 
                onClick={() => setGenreSettings({ ...genreSettings, is_enabled: !genreSettings.is_enabled })}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-black uppercase tracking-widest text-[10px]",
                  genreSettings.is_enabled 
                    ? "bg-primary/10 border-primary/30 text-primary" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-500"
                )}
              >
                {genreSettings.is_enabled ? (
                  <><ToggleRight className="text-primary" size={20} /> Enabled</>
                ) : (
                  <><ToggleLeft size={20} /> Disabled</>
                )}
              </button>
            </div>

            {genreSettings.is_enabled && (
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Manage Genre Items</span>
                  <button 
                    onClick={addItem}
                    className="flex items-center gap-2 text-primary hover:text-primary/80 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    <Plus size={14} /> Add New
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {genreSettings.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-black/40 border border-zinc-800 p-3 rounded-2xl group hover:border-zinc-700 transition-all">
                      <div className="text-zinc-700 group-hover:text-zinc-500 transition-colors">
                        <GripVertical size={16} />
                      </div>
                      <div className="w-10">
                        <input 
                          type="text" 
                          value={item.icon}
                          onChange={(e) => updateItem(index, { icon: e.target.value })}
                          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:border-primary"
                          placeholder="Emoji"
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={item.label}
                          onChange={(e) => updateItem(index, { label: e.target.value })}
                          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-primary"
                          placeholder="Genre Name"
                        />
                      </div>
                      <button 
                        onClick={() => removeItem(index)}
                        className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {genreSettings.items.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-[32px]">
                    <p className="text-zinc-500 text-sm font-medium">No genre items added yet.</p>
                    <button onClick={addItem} className="text-primary text-xs font-black uppercase tracking-widest mt-2 hover:underline">Click to add your first genre</button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-zinc-800/20 p-6 flex items-start gap-4">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                <Info size={16} />
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed font-medium">
                Tip: The order here determines how they appear on the homepage. Use emojis to make them pop! 
                If disabled, the entire genre filter bar will be hidden from the storefront.
              </p>
            </div>
          </div>
        </div>
      </main>

      <StatusModal 
        {...statusModal} 
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })} 
      />
    </div>
  );
}