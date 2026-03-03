"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Loader2, Globe, Mail, Type, Image as ImageIcon, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';
import { useSettingsStore } from '@/store/useSettingsStore';
import { logActivity } from '@/lib/supabase/audit';

export default function AdminGeneralSettingsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  const { adminPath: globalAdminPath } = useSettingsStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
    site_name: 'BeatPoppa',
    site_description: 'Premium Beats Marketplace',
    contact_email: 'admin@beatpoppa.com',
    support_email: 'support@beatpoppa.com',
    logo_url: '',
    favicon_url: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      router.push('/');
      return;
    }

    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('*')
          .eq('key', 'general_settings')
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

    if (user) {
      fetchSettings();
    }
  }, [user, profile, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusModal({
      isOpen: true,
      type: 'loading',
      title: 'Saving Settings',
      message: 'Updating general platform configuration...'
    });

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'general_settings',
          value: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      
      // Log settings update
      await logActivity('settings_updated', 'general_settings', 'platform', { 
        site_name: settings.site_name,
        contact_email: settings.contact_email 
      });

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'General settings updated successfully.'
      });
      
      setTimeout(() => setStatusModal(prev => ({ ...prev, isOpen: false })), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'An error occurred while saving settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be under 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { data, error } = await supabase.storage
        .from('platform')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('platform')
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 animate-pulse font-medium">Loading General Settings...</p>
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
              General <span className="text-primary">Settings</span>
            </h1>
            <p className="text-zinc-500 font-medium italic">Basic identity and contact information for your site</p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-black font-black py-4 px-10 rounded-2xl hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Settings
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Site Identity */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <Type size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Site Identity</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Name and branding details</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Site Name</label>
                <input 
                  type="text" 
                  value={settings.site_name || ''}
                  onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Site Tagline/Description</label>
                <input 
                  type="text" 
                  value={settings.site_description || ''}
                  onChange={(e) => setSettings({...settings, site_description: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Logo & Favicon */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                <ImageIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Visual Assets</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Logo and favicon URLs</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Logo URL</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 overflow-hidden relative">
                      {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon size={32} />
                      )}
                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={24} className="animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-block px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all cursor-pointer">
                        {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                      </label>
                      <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Recommended: 512x512px PNG</p>
                    </div>
                  </div>
                  <div className="relative">
                    <ImageIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text" 
                      value={settings.logo_url || ''}
                      onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
                      placeholder="Or enter logo URL..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 pl-11 pr-4 text-white font-bold focus:border-primary outline-none transition-all font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Favicon URL</label>
                <input 
                  type="text" 
                  value={settings.favicon_url || ''}
                  onChange={(e) => setSettings({...settings, favicon_url: e.target.value})}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all font-mono text-xs"
                />
              </div>
            </div>
          </section>

          {/* Contact Info */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
                <Mail size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Contact Information</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Communication channels</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Admin Email</label>
                <input 
                  type="email" 
                  value={settings.contact_email || ''}
                  onChange={(e) => setSettings({...settings, contact_email: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Support Email</label>
                <input 
                  type="email" 
                  value={settings.support_email || ''}
                  onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
