"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Loader2, Lock, UserPlus, Shield, Key, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function AdminAuthSettingsPage() {
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
    allow_signup: true,
    require_email_verification: true,
    enable_google_login: false,
    enable_apple_login: false,
    default_role: 'user',
    admin_emails: [] as string[],
    new_admin_email: ''
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
          .eq('key', 'auth_settings')
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
      message: 'Updating authentication configuration...'
    });

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'auth_settings',
          value: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'Authentication settings updated successfully.'
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

  const addAdminEmail = () => {
    if (!settings.new_admin_email || !settings.new_admin_email.includes('@')) return;
    if (settings.admin_emails.includes(settings.new_admin_email)) return;
    
    setSettings({
      ...settings,
      admin_emails: [...settings.admin_emails, settings.new_admin_email],
      new_admin_email: ''
    });
  };

  const removeAdminEmail = (email: string) => {
    setSettings({
      ...settings,
      admin_emails: settings.admin_emails.filter(e => e !== email)
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 animate-pulse font-medium">Loading Auth Guard...</p>
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
              Auth <span className="text-primary">& Permissions</span>
            </h1>
            <p className="text-zinc-500 font-medium italic">Configure how users access and interact with BeatPoppa</p>
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
          {/* Registration Control */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <UserPlus size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Registration Control</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Manage user onboarding</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <label className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 cursor-pointer group hover:border-zinc-700 transition-all">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Allow New Signups</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">When disabled, no new accounts can be created</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.allow_signup}
                  onChange={(e) => setSettings({...settings, allow_signup: e.target.checked})}
                  className="w-6 h-6 rounded-lg accent-primary"
                />
              </label>

              <label className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 cursor-pointer group hover:border-zinc-700 transition-all">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Require Email Verification</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Users must confirm their email before accessing the platform</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.require_email_verification}
                  onChange={(e) => setSettings({...settings, require_email_verification: e.target.checked})}
                  className="w-6 h-6 rounded-lg accent-primary"
                />
              </label>
            </div>
          </section>

          {/* Social Authentication */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                <Key size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Social Authentication</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Enable OAuth providers (Requires Supabase Config)</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 cursor-pointer group hover:border-zinc-700 transition-all">
                <span className="text-sm font-black text-white uppercase tracking-tight">Google Login</span>
                <input 
                  type="checkbox" 
                  checked={settings.enable_google_login}
                  onChange={(e) => setSettings({...settings, enable_google_login: e.target.checked})}
                  className="w-6 h-6 rounded-lg accent-primary"
                />
              </label>
              <label className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl border border-zinc-800 cursor-pointer group hover:border-zinc-700 transition-all">
                <span className="text-sm font-black text-white uppercase tracking-tight">Apple Login</span>
                <input 
                  type="checkbox" 
                  checked={settings.enable_apple_login}
                  onChange={(e) => setSettings({...settings, enable_apple_login: e.target.checked})}
                  className="w-6 h-6 rounded-lg accent-primary"
                />
              </label>
            </div>
          </section>

          {/* Role Management */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Role Management</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Configure default access and admin whitelist</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Default Role for New Users</label>
                <select 
                  value={settings.default_role}
                  onChange={(e) => setSettings({...settings, default_role: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none appearance-none"
                >
                  <option value="user">User</option>
                  <option value="creator">Creator</option>
                  <option value="producer">Producer</option>
                </select>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 ml-4">Administrator Whitelist</h4>
                
                <div className="flex gap-2 mb-6">
                  <input 
                    type="email" 
                    placeholder="New admin email..."
                    value={settings.new_admin_email}
                    onChange={(e) => setSettings({...settings, new_admin_email: e.target.value})}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-6 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                  />
                  <button 
                    type="button"
                    onClick={addAdminEmail}
                    className="bg-white text-black px-6 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary transition-all"
                  >
                    Add Admin
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {settings.admin_emails.length === 0 ? (
                    <p className="text-[10px] text-zinc-600 italic px-4">No additional admins whitelisted</p>
                  ) : (
                    settings.admin_emails.map((email) => (
                      <div key={email} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-full">
                        <span className="text-[10px] font-bold text-zinc-400">{email}</span>
                        <button 
                          type="button"
                          onClick={() => removeAdminEmail(email)}
                          className="text-zinc-600 hover:text-red-500"
                        >
                          <AlertTriangle size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
