"use client";

import { Menu, Bell, Search, Play, User } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import Sidebar from './Sidebar';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import clsx from 'clsx';
import { getAdminLink } from '@/constants/admin';
import { getInitials } from '@/lib/utils';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
  const { toggleMenu, currency, fetchExchangeRates, setCurrency } = useUIStore();
  const { user, profile, initialize } = useAuthStore();
  const { items } = useCartStore();
  const { adminPath, fetchAdminPath, general, fetchSettings, maintenance } = useSettingsStore();

  useEffect(() => {
    initialize();
    fetchExchangeRates();
    fetchSettings();
    if (profile?.role === 'admin') {
      fetchAdminPath();
    }
  }, [initialize, profile?.role, fetchAdminPath, fetchExchangeRates, fetchSettings]);

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const userRole = profile?.role || 'buyer';
  const dashboardLink = userRole === 'admin' 
    ? (adminPath ? `/${adminPath}` : '/admin') 
    : `/dashboard/${userRole}`;

  return (
    <>
      <Sidebar />
      {maintenance?.maintenance_mode && profile?.role === 'admin' && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center shadow-lg">
          Maintenance Mode Active • Visible only to Admins
        </div>
      )}
      <header className={clsx(
        "fixed left-0 right-0 z-40 bg-black/60 backdrop-blur-xl transition-all duration-300 border-b border-white/5",
        maintenance?.maintenance_mode && profile?.role === 'admin' ? "top-[24px]" : "top-0"
      )}>
        <div className="max-w-screen-2xl mx-auto px-4 h-[64px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              {general?.logo_url ? (
                <div className="relative w-10 h-10">
                  <Image 
                    src={general.logo_url} 
                    alt={general.site_name || "Logo"} 
                    fill 
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center text-primary">
                  <Play fill="currentColor" size={32} />
                </div>
              )}
            </Link>
          </div>

          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search for beats, artists, or moods..." 
                className="w-full h-10 bg-zinc-900/40 border border-zinc-800/50 rounded-full pl-11 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:bg-zinc-800/60 focus:border-zinc-700 transition-all focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4 border-r border-zinc-800 pr-4 mr-2">
              {/* Currency Selector */}
              <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 transition-colors group/curr">
                <span className="text-[10px] font-black text-zinc-500 uppercase group-hover/curr:text-zinc-400 transition-colors">Currency</span>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  {['USD', 'NGN', 'GHS', 'KSH', 'ZAR', 'GBP', 'EUR'].map(c => (
                    <option key={c} value={c} className="bg-zinc-900">{c}</option>
                  ))}
                </select>
              </div>

              {/* Cart */}
              <Link href="/cart" className="relative p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:border-zinc-700 transition-all group/cart shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover/cart:scale-110 transition-transform">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black animate-in zoom-in duration-300 shadow-xl">
                    {items.length}
                  </span>
                )}
              </Link>
            </div>

            <button className="p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-full text-zinc-400 hover:text-white md:hidden transition-all active:scale-95 shadow-lg">
              <Search size={20} />
            </button>
            <NotificationDropdown isAdmin={profile?.role === 'admin'} />
            
            {user ? (
              <div className="flex items-center gap-3">
                <Link href={dashboardLink} className="relative w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 hover:border-primary transition-all shadow-xl group/avatar">
                  {avatarUrl ? (
                    <Image 
                      src={avatarUrl} 
                      alt="Profile" 
                      fill 
                      className="object-cover group-hover/avatar:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-zinc-500 bg-zinc-900 group-hover/avatar:text-primary transition-colors uppercase">
                      {getInitials(profile?.display_name || user?.email || 'User')}
                    </div>
                  )}
                </Link>
                <button 
                  onClick={toggleMenu}
                  className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 shadow-lg group"
                >
                  <Menu size={22} className="text-zinc-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-3">
                  <Link href="/auth/login" className="text-sm font-black text-zinc-400 hover:text-white transition-colors uppercase tracking-widest px-2">
                    Login
                  </Link>
                  <Link href="/auth/signup" className="px-6 py-2 bg-primary text-white text-sm font-black rounded-full hover:bg-rose-600 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 uppercase tracking-wider">
                    Register
                  </Link>
                </div>
                <button 
                  onClick={toggleMenu}
                  className="p-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 shadow-lg group"
                >
                  <Menu size={22} className="text-zinc-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
