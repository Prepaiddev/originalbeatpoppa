"use client";

import { Menu, Bell, Search, Play, User, X, Clock, Trash2, UserCog } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import Sidebar from './Sidebar';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { getAdminLink } from '@/constants/admin';
import { getInitials } from '@/lib/utils';
import NotificationDropdown from './NotificationDropdown';
import { useSearchHistory } from '@/hooks/useSearchHistory';

export default function Header() {
  const { toggleMenu, currency, fetchExchangeRates, setCurrency } = useUIStore();
  const { user, profile, initialize, isImpersonating, stopImpersonating, originalUser } = useAuthStore();
  const { items } = useCartStore();
  const { adminPath, fetchAdminPath, general, fetchSettings, maintenance } = useSettingsStore();
  const router = useRouter();
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const searchRef = useRef<HTMLDivElement>(null);

  const handleStopImpersonating = async () => {
    await stopImpersonating();
    router.push(getAdminLink('/users', adminPath));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    addToHistory(query);
    router.push(`/explore?q=${encodeURIComponent(query)}`);
    setIsSearchFocused(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

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
    ? getAdminLink('/', adminPath) 
    : `/dashboard/${userRole}`;

  return (
    <>
      <Sidebar />
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-primary text-black text-[10px] font-black uppercase tracking-[0.2em] py-1.5 px-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <UserCog size={14} strokeWidth={3} />
            <span>Impersonating: {profile?.display_name || 'User'}</span>
          </div>
          <button 
            onClick={handleStopImpersonating}
            className="bg-black text-white px-3 py-0.5 rounded-full hover:bg-zinc-800 transition-colors"
          >
            Stop
          </button>
        </div>
      )}
      {maintenance?.maintenance_mode && profile?.role === 'admin' && !isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center shadow-lg">
          Maintenance Mode Active • Visible only to Admins
        </div>
      )}
      <header className={clsx(
        "fixed left-0 right-0 z-40 bg-black/60 backdrop-blur-xl transition-all duration-300 border-b border-white/5",
        (maintenance?.maintenance_mode && profile?.role === 'admin') || isImpersonating ? "top-[28px]" : "top-0"
      )}>
        <div className="max-w-screen-2xl mx-auto px-4 h-[72px] md:h-[88px] flex flex-col justify-center">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
            <Link href="/" className="flex items-center">
              {general?.logo_url ? (
                <div className="relative w-8 h-8 md:w-10 md:h-10">
                  <Image 
                    src={general.logo_url} 
                    alt={general.site_name || "Logo"} 
                    fill 
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-primary">
                  <Play fill="currentColor" size={24} className="md:size-[32px]" />
                </div>
              )}
            </Link>
          </div>

          <div className="flex-1 max-w-xl hidden md:block" ref={searchRef}>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search for beats, artists, or moods..." 
                className="w-full h-10 bg-zinc-900/40 border border-zinc-800/50 rounded-full pl-11 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:bg-zinc-800/60 focus:border-zinc-700 transition-all focus:ring-1 focus:ring-primary/20"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}

              {/* Search History Dropdown */}
              {isSearchFocused && (history.length > 0 || searchQuery.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  {history.length > 0 && !searchQuery && (
                    <div className="p-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recent Searches</span>
                        <button 
                          onClick={clearHistory}
                          className="text-[10px] font-black text-zinc-600 hover:text-red-500 transition-colors uppercase tracking-widest"
                        >
                          Clear
                        </button>
                      </div>
                      {history.map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between group/item px-3 py-2 hover:bg-white/[0.03] rounded-xl cursor-pointer transition-colors"
                          onClick={() => handleSearch(item)}
                        >
                          <div className="flex items-center gap-3">
                            <Clock size={14} className="text-zinc-600 group-hover/item:text-zinc-400" />
                            <span className="text-sm text-zinc-400 group-hover/item:text-white transition-colors">{item}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromHistory(item);
                            }}
                            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery && (
                    <div className="p-2">
                      <div 
                        className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.03] rounded-xl cursor-pointer transition-colors group/search"
                        onClick={() => handleSearch(searchQuery)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/search:scale-110 transition-transform">
                          <Search size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Search for "{searchQuery}"</p>
                          <p className="text-[10px] text-zinc-500">In Beats, Producers, and Moods</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 px-4 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">Trending:</span>
              {['Afrobeats', 'Trap', 'Amapiano', 'Drake Type', 'Chill'].map((tag) => (
                <Link 
                  key={tag} 
                  href={`/search?q=${tag.toLowerCase()}`}
                  className="text-[11px] font-bold text-zinc-500 hover:text-primary transition-colors whitespace-nowrap"
                >
                  #{tag}
                </Link>
              ))}
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
                  ) : general?.logo_url ? (
                    <div className="relative w-full h-full bg-zinc-900 group-hover/avatar:bg-zinc-800 transition-colors p-1.5">
                      <Image 
                        src={general.logo_url} 
                        alt="Default Profile" 
                        fill 
                        className="object-contain p-1.5 opacity-80 group-hover/avatar:opacity-100 group-hover/avatar:scale-110 transition-all duration-500"
                      />
                    </div>
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
      </div>
    </header>
  </>
);
}
