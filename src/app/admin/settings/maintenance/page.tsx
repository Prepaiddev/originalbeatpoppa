"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Loader2, Info, AlertTriangle, MessageSquare, Clock, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';
import { useSettingsStore } from '@/store/useSettingsStore';
import { logActivity } from '@/lib/supabase/audit';

export default function AdminMaintenanceSettingsPage() {
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
    maintenance_mode: false,
    maintenance_message: 'BeatPoppa is currently undergoing scheduled maintenance. We will be back online shortly.',
    expected_back_at: '',
    show_platform_alert: false,
    platform_alert_message: 'Welcome to the new BeatPoppa marketplace!',
    platform_alert_type: 'info' // 'info', 'warning', 'success'
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
          .eq('key', 'maintenance_settings')
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
      message: 'Updating maintenance and alert configuration...'
    });

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'maintenance_settings',
          value: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      
      // Log settings update
      await logActivity('settings_updated', 'maintenance_settings', 'platform', { 
        maintenance_mode: settings.maintenance_mode,
        show_platform_alert: settings.show_platform_alert
      });

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'Maintenance settings updated successfully.'
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
        <p className="text-zinc-400 animate-pulse font-medium">Loading System Status...</p>
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
              System <span className="text-primary">Maintenance</span>
            </h1>
            <p className="text-zinc-500 font-medium italic">Manage platform uptime and global notifications</p>
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
          {/* Maintenance Mode */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Maintenance Mode</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Take the platform offline for updates</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <label className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 cursor-pointer group hover:border-zinc-700 transition-all">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Activate Maintenance Mode</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Redirects all non-admin users to a maintenance page</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({...settings, maintenance_mode: e.target.checked})}
                  className="w-6 h-6 rounded-lg accent-primary"
                />
              </label>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Maintenance Message</label>
                <textarea 
                  rows={3}
                  value={settings.maintenance_message}
                  onChange={(e) => setSettings({...settings, maintenance_message: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Expected Back At (Optional Display)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={settings.expected_back_at}
                    onChange={(e) => setSettings({...settings, expected_back_at: e.target.value})}
                    placeholder="e.g. 2:00 PM EST"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all pl-12"
                  />
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={18} />
                </div>
              </div>
            </div>
          </section>

          {/* Platform Alerts */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <MessageSquare size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Global Platform Alert</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Show a notification banner to all users</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <label className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 cursor-pointer group hover:border-zinc-700 transition-all">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Show Alert Banner</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Toggle the visibility of the global alert</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.show_platform_alert}
                  onChange={(e) => setSettings({...settings, show_platform_alert: e.target.checked})}
                  className="w-6 h-6 rounded-lg accent-primary"
                />
              </label>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Alert Message</label>
                <input 
                  type="text" 
                  value={settings.platform_alert_message}
                  onChange={(e) => setSettings({...settings, platform_alert_message: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Alert Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {['info', 'warning', 'success'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSettings({...settings, platform_alert_type: type})}
                      className={`py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${settings.platform_alert_type === type ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-600 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
