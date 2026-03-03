"use client";

import { X, Globe, User, LogOut, ChevronRight, ShoppingBag, Music, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Currency, useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import clsx from 'clsx';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getInitials } from '@/lib/utils';
import ConfirmationModal from './ConfirmationModal';
import { getAdminLink } from '@/constants/admin';

export default function Sidebar() {
  const { isMenuOpen, closeMenu, currency, setCurrency } = useUIStore();
  const { user, profile, signOut } = useAuthStore();
  const { adminPath, fetchAdminPath, general, fetchSettings } = useSettingsStore();
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      fetchSettings();
      if (profile?.role === 'admin') {
        fetchAdminPath();
      }
    }
  }, [isMenuOpen, profile?.role, fetchAdminPath, fetchSettings]);

  const currencies: Currency[] = ['USD', 'NGN', 'GHS', 'KSH', 'ZAR', 'GBP', 'EUR'];

  const handleLogout = async () => {
    await signOut();
    closeMenu();
    setShowLogoutConfirm(false);
    router.push('/');
  };

  const userRole = profile?.role || 'buyer';

  const links = [
    { href: '/', label: 'Home', icon: Globe },
    { href: '/explore', label: 'Explore Beats', icon: Music },
    { href: '/creators', label: 'Top Creators', icon: User },
    // Only show dashboard link if logged in
    ...(user ? [
      { 
        href: userRole === 'admin' ? getAdminLink('/', adminPath) : `/dashboard/${userRole}`, 
        label: userRole === 'admin' ? 'BeatPoppa Portal' : 'My Dashboard', 
        icon: userRole === 'admin' ? Shield : ShoppingBag 
      }
    ] : []),
  ];

  if (!isMenuOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={closeMenu}
      />

      {/* Sidebar Panel */}
      <div className="fixed top-0 right-0 h-full w-[85%] max-w-[320px] bg-zinc-950 border-l border-zinc-800 z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            {general?.logo_url ? (
              <div className="relative w-6 h-6 rounded-md overflow-hidden">
                <Image src={general.logo_url} alt={general.site_name || "Logo"} fill className="object-contain" />
              </div>
            ) : (
              <div className="w-6 h-6 bg-gradient-to-br from-primary to-purple-600 rounded-md flex items-center justify-center">
                <span className="font-bold text-white text-xs">{(general?.site_name || 'A')[0]}</span>
              </div>
            )}
            <h2 className="text-lg font-black tracking-tight uppercase">
              {general?.site_name ? (
                <>
                  {general.site_name.split(' ')[0]}
                  {general.site_name.split(' ').length > 1 && (
                    <span className="text-primary text-[10px] align-top ml-0.5">
                      {general.site_name.split(' ').slice(1).join(' ')}
                    </span>
                  )}
                </>
              ) : (
                <>
                  BEAT <span className="text-primary text-[10px] align-top ml-0.5">POPPA</span>
                </>
              )}
            </h2>
          </div>
          <button 
            onClick={closeMenu}
            className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* Auth Section */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Account</h3>
            <div className="space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg mb-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-black text-zinc-400 overflow-hidden relative border border-zinc-800 uppercase">
                      {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                        <Image 
                          src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
                          alt={profile?.display_name || "User"} 
                          fill 
                          className="object-cover"
                        />
                      ) : (
                        getInitials(profile?.display_name || user?.email || 'User')
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-white">{profile?.display_name || user.email}</p>
                      <p className="text-xs text-zinc-500 truncate capitalize">{userRole}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowLogoutConfirm(true)}
                    className="block w-full text-center py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-lg hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth/login" 
                    className="block w-full text-center py-3 bg-primary text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
                    onClick={closeMenu}
                  >
                    Log In
                  </Link>
                  <Link 
                    href="/auth/signup" 
                    className="block w-full text-center py-3 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-800 transition-colors"
                    onClick={closeMenu}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Menu</h3>
            <nav className="space-y-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link 
                  key={href} 
                  href={href}
                  onClick={closeMenu}
                  className={clsx(
                    "flex items-center justify-between p-3 rounded-lg transition-colors group",
                    pathname === href ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={clsx(pathname === href ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300")} />
                    <span className="font-medium">{label}</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Currency Switcher */}
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Currency</h3>
            <div className="grid grid-cols-3 gap-2">
              {currencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={clsx(
                    "py-2 px-1 rounded-md text-xs font-bold border transition-all",
                    currency === c 
                      ? "bg-primary border-primary text-white" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-zinc-600 text-center">
              Prices are estimates. Checkout in {currency}.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-900 text-center">
          <p className="text-xs text-zinc-600">© 2026 {general?.site_name || 'BeatPoppa'}</p>
          <div className="flex justify-center gap-4 mt-2 text-xs text-zinc-500">
             <Link href="/legal/terms">Terms</Link>
             <Link href="/legal/privacy">Privacy</Link>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        variant="primary"
      />
    </>
  );
}
