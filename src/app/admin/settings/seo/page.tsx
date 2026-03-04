"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Loader2, Search, BarChart2, Tag, Code, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function AdminSEOSettingsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  const { adminPath: globalAdminPath } = useSettingsStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading' | 'auth';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [settings, setSettings] = useState({
    meta_title: 'BeatPoppa | Premium Beats',
    meta_description: 'Buy and sell premium afrobeats.',
    meta_keywords: 'beats, afrobeats, music, marketplace',
    google_analytics_id: '',
    facebook_pixel_id: '',
    header_scripts: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      router.push('/');
      return;
    }

    async function fetchInitialSettings() {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('*')
          .eq('key', 'seo_settings')
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data?.value) {
          setSettings(data.value);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user && loading) {
      fetchInitialSettings();
    }
  }, [user, profile?.role, authLoading, router, loading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusModal({
      isOpen: true,
      type: 'loading',
      title: 'Saving Settings',
      message: 'Updating SEO and Analytics configuration...'
    });

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'seo_settings',
          value: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'SEO settings updated successfully.'
      });
      
      setTimeout(() => setStatusModal(prev => ({ ...prev, isOpen: false })), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 animate-pulse font-medium">Loading SEO Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
      <Header />
      
      <main className="pt-[100px] max-w-4xl mx-auto px-6">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">
              SEO <span className="text-primary">& Analytics</span>
            </h1>
            <p className="text-zinc-500 font-medium italic">Optimize your marketplace for search engines and track performance</p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-black font-black py-4 px-10 rounded-2xl hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save All Changes
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Metadata */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <Search size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Search Engine Optimization</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Manage global meta tags</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Default Meta Title</label>
                <input 
                  type="text" 
                  value={settings.meta_title}
                  onChange={(e) => setSettings({...settings, meta_title: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Default Meta Description</label>
                <textarea 
                  rows={3}
                  value={settings.meta_description}
                  onChange={(e) => setSettings({...settings, meta_description: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all resize-none"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Meta Keywords (Comma separated)</label>
                <input 
                  type="text" 
                  value={settings.meta_keywords}
                  onChange={(e) => setSettings({...settings, meta_keywords: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Analytics Tracking */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                <BarChart2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Tracking & Analytics</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Connect third-party tracking services</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Google Analytics ID</label>
                <input 
                  type="text" 
                  value={settings.google_analytics_id}
                  onChange={(e) => setSettings({...settings, google_analytics_id: e.target.value})}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all font-mono text-xs"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Facebook Pixel ID</label>
                <input 
                  type="text" 
                  value={settings.facebook_pixel_id}
                  onChange={(e) => setSettings({...settings, facebook_pixel_id: e.target.value})}
                  placeholder="XXXXXXXXXXXXXXXX"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all font-mono text-xs"
                />
              </div>
            </div>
          </section>

          {/* Custom Scripts */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
                <Code size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Advanced Scripts</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Inject custom code into the page header</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Header Scripts (HTML)</label>
              <textarea 
                rows={5}
                value={settings.header_scripts}
                onChange={(e) => setSettings({...settings, header_scripts: e.target.value})}
                placeholder="<script>...</script>"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all resize-none font-mono text-xs"
              />
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
