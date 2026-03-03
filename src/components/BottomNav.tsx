"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Plus, ShoppingBag, User, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCartStore } from '@/store/useCartStore';
import clsx from 'clsx';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, profile } = useAuthStore();
  const { adminPath } = useSettingsStore();
  const { items } = useCartStore();

  const userRole = profile?.role || 'buyer';
  const dashboardLink = userRole === 'admin' 
    ? (adminPath ? `/${adminPath}` : '/admin') 
    : `/dashboard/${userRole}`;

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/upload', label: 'Create', icon: Plus, isCenter: true },
    { href: '/cart', label: 'Cart', icon: ShoppingBag, badge: items.length },
    ...(user ? [
      { href: dashboardLink, label: 'Dashboard', icon: LayoutDashboard }
    ] : [
      { href: '/auth/login', label: 'Profile', icon: User }
    ]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-zinc-900 h-[64px] sm:h-[72px] flex items-center justify-around z-50 px-2 pb-safe">
      {navItems.map(({ href, label, icon: Icon, isCenter, badge }) => {
        const isActive = pathname === href;
        
        if (isCenter) {
          return (
            <Link 
              key={label} 
              href={href} 
              className="relative -top-4 sm:-top-6 flex flex-col items-center group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FF3B5C] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,59,92,0.4)] transition-transform group-active:scale-90">
                <Icon className="size-7 sm:size-8 text-white" strokeWidth={3} />
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium mt-1 text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
            </Link>
          );
        }

        return (
          <Link 
            key={label} 
            href={href} 
            className={clsx(
              "flex flex-col items-center justify-center w-full h-full gap-0.5 sm:gap-1 transition-all active:scale-95",
              isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <div className="relative">
              <Icon className="size-5 sm:size-6" strokeWidth={isActive ? 2.5 : 2} />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] sm:min-w-[16px] h-[14px] sm:h-[16px] flex items-center justify-center bg-primary text-white text-[8px] sm:text-[10px] font-bold rounded-full px-1 shadow-lg shadow-primary/20 animate-in zoom-in duration-300">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
