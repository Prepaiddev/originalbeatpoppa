"use client";

import Header from '@/components/Header';
import { CreditCard, Globe, Bell, Shield, Sliders, ArrowRight, Search, Lock, Info, AlertCircle, Layout } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getAdminLink } from '@/constants/admin';
import { useSettingsStore } from '@/store/useSettingsStore';
import StatusModal from '@/components/StatusModal';

export default function AdminSettingsPage() {
  const { adminPath: globalAdminPath, fetchAdminPath } = useSettingsStore();
  const [adminPath, setAdminPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
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

  const settingsCategories = [
    {
      id: 'ui',
      title: 'UI Customization',
      description: 'Configure homepage elements like the genre bar and navigation.',
      icon: Layout,
      href: getAdminLink('/settings/ui', globalAdminPath),
      color: 'text-pink-500',
      bg: 'bg-pink-500/10'
    },
    {
      id: 'content',
      title: 'Content Management',
      description: 'Arrange beats in frontend sections and manage homepage content.',
      icon: Layout,
      href: getAdminLink('/content', globalAdminPath),
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    },
    {
      id: 'payments',
      title: 'Payment Settings',
      description: 'Configure payment providers, currency, and platform commissions.',
      icon: CreditCard,
      href: getAdminLink('/settings/payments', globalAdminPath),
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      id: 'account',
      title: 'BeatPoppa Account',
      description: 'Change your administrative username, email, and password.',
      icon: Shield,
      href: getAdminLink('/settings/account', globalAdminPath),
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    {
      id: 'general',
      title: 'General Settings',
      description: 'Site title, logo, contact information, and meta tags.',
      icon: Globe,
      href: getAdminLink('/settings/general', globalAdminPath),
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      id: 'seo',
      title: 'SEO & Analytics',
      description: 'Manage search engine optimization and platform tracking.',
      icon: Search,
      href: getAdminLink('/settings/seo', globalAdminPath),
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      id: 'auth',
      title: 'Authentication',
      description: 'Configure user signup, login methods, and role permissions.',
      icon: Lock,
      href: getAdminLink('/settings/auth', globalAdminPath),
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      description: 'Enable maintenance mode and platform-wide alerts.',
      icon: Info,
      href: getAdminLink('/settings/maintenance', globalAdminPath),
      color: 'text-zinc-500',
      bg: 'bg-zinc-500/10'
    },
    {
      id: 'licenses',
      title: 'License Management',
      description: 'Manage license types, prices, and features for creators.',
      icon: Sliders,
      href: getAdminLink('/settings/licenses', globalAdminPath),
      color: 'text-primary',
      bg: 'bg-primary/10'
    }
  ];

  useEffect(() => {
    async function init() {
      const path = await fetchAdminPath();
      setAdminPath(path);
    }
    init();
  }, [fetchAdminPath]);

  const handleSavePath = async () => {
    setStatusModal({
      isOpen: true,
      type: 'loading',
      title: 'Updating Portal',
      message: 'Securing your new administrative path...'
    });
    
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert(
          { 
            key: 'admin_config', 
            value: { path: adminPath }, 
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'key' }
        );

      if (error) throw error;
      
      // Update global store
      useSettingsStore.setState({ adminPath });
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Portal Path Secured',
        message: `Your new secret path is now active: /${adminPath}`
      });
      
      setTimeout(() => setStatusModal(prev => ({ ...prev, isOpen: false })), 3000);
    } catch (error: any) {
      console.error('Error saving path:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'An unexpected error occurred while updating the path.'
      });
    }
  };

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
      
      <main className="pt-[100px] max-w-5xl mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">
            Platform <span className="text-primary">Settings</span>
          </h1>
          <p className="text-zinc-500 font-medium italic">Configure the core engine of your marketplace</p>
        </div>

        {/* Dynamic Admin Path Security */}
        <div className="mb-12 bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Security & Stealth</h2>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Protect the admin portal from automated scans</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Secret Portal Path</label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 font-black">/</span>
                <input
                  type="text"
                  value={adminPath}
                  onChange={(e) => setAdminPath(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. beatpoppa-secured"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-10 pr-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-zinc-600 italic px-4">
                Current URL: <span className="text-zinc-400">localhost:3000/{adminPath || '...'}</span>
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSavePath}
                disabled={loading || !adminPath}
                className="bg-primary text-black font-black py-4 px-8 rounded-2xl hover:scale-[1.02] transition-all active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Save Secret Path'}
              </button>
              {saveMessage && (
                <p className="text-green-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                  {saveMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsCategories.map((category) => (
            <Link 
              key={category.id}
              href={category.href}
              className={`group relative p-8 rounded-[32px] border border-zinc-800 bg-zinc-900/40 hover:border-primary/50 transition-all ${category.comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:translate-y-[-4px]'}`}
              onClick={(e) => category.comingSoon && e.preventDefault()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl ${category.bg} ${category.color}`}>
                  <category.icon size={28} />
                </div>
                {!category.comingSoon && (
                  <div className="p-2 rounded-full bg-zinc-800 text-zinc-500 group-hover:bg-primary group-hover:text-black transition-all">
                    <ArrowRight size={20} />
                  </div>
                )}
                {category.comingSoon && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-500 px-3 py-1.5 rounded-full border border-zinc-700">
                    Coming Soon
                  </span>
                )}
              </div>
              
              <h2 className="text-2xl font-black mb-2 group-hover:text-primary transition-colors uppercase tracking-tight">
                {category.title}
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                {category.description}
              </p>
              
              {!category.comingSoon && (
                <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sliders size={40} className="text-primary/10" />
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
