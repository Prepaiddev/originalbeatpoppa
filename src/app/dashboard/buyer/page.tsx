"use client";

import Header from '@/components/Header';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ShoppingBag, Heart, Download, Settings, ChevronRight, LogOut, FileText, Users, Music, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function BuyerDashboard() {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const signOut = useAuthStore(state => state.signOut);
  const initialize = useAuthStore(state => state.initialize);
  const { general } = useSettingsStore();
  const router = useRouter();
  const [stats, setStats] = useState({ orders: 0, favorites: 0, following: 0 });
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (!user) return;

      try {
        // Stats
        const [ordersRes, favoritesRes, followingRes] = await Promise.all([
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('buyer_id', user.id),
          supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id)
        ]);

        if (!isMounted) return;

        setStats({
          orders: ordersRes.count || 0,
          favorites: favoritesRes.count || 0,
          following: followingRes.count || 0
        });

        // Recent Purchases
        const { data: recentItems } = await supabase
          .from('order_items')
          .select(`
            *,
            orders!inner(buyer_id),
            beats(title, cover_url, profiles(display_name))
          `)
          .eq('orders.buyer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (isMounted && recentItems) {
          setRecentPurchases(recentItems);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    }

    if (user) fetchData();
    return () => { isMounted = false; };
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const quickActions = [
    { icon: ShoppingBag, label: 'My Orders', sub: `${stats.orders} purchases`, href: '/dashboard/buyer/orders', color: 'text-primary' },
    { icon: Music, label: 'My Playlists', sub: 'Your collections', href: '/dashboard/buyer/playlists', color: 'text-purple-400' },
    { icon: Heart, label: 'Favorites', sub: `${stats.favorites} saved beats`, href: '/dashboard/buyer/favorites', color: 'text-red-500' },
    { icon: Users, label: 'Following', sub: `${stats.following} creators`, href: '/dashboard/buyer/following', color: 'text-blue-400' },
    { icon: Download, label: 'Downloads', sub: `${stats.orders} files`, href: '/dashboard/buyer/downloads', color: 'text-green-500' },
    { icon: Settings, label: 'Account Settings', sub: 'Profile, email, password', href: '/profile/edit', color: 'text-zinc-400' },
  ];

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-4xl mx-auto px-4">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-black mb-2 tracking-tight">
            Welcome to {general?.site_name || 'BeatPoppa'}, {profile?.display_name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-zinc-400">Manage your music collection and favorite creators.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-black mb-4 shadow-xl bg-zinc-800">
                <Image 
                    src={profile?.avatar_url || user?.user_metadata?.avatar_url || general?.logo_url || "https://placehold.co/100x100"} 
                    alt="Profile" 
                    fill 
                    className="object-cover"
                    unoptimized={true}
                  />
              </div>
              <h2 className="text-xl font-bold mb-1">{profile?.display_name || user?.email?.split('@')[0]}</h2>
              <p className="text-zinc-500 text-sm mb-4">{user?.email}</p>
              <div className="flex gap-2 mb-6">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/20">
                  {profile?.role || "Buyer"}
                </span>
                {profile?.location && (
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-zinc-700">
                    {profile.location}
                  </span>
                )}
              </div>
              
              <Link href="/profile/edit" className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors border border-zinc-700">
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Stats & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              <Link href="/dashboard/buyer/orders" className="bg-zinc-900 rounded-2xl p-6 flex flex-col items-center border border-zinc-800 hover:border-primary/50 transition-all group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                  <ShoppingBag size={20} />
                </div>
                <span className="text-2xl font-black text-white">{stats.orders}</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Purchases</span>
              </Link>
              <Link href="/dashboard/buyer/favorites" className="bg-zinc-900 rounded-2xl p-6 flex flex-col items-center border border-zinc-800 hover:border-red-500/50 transition-all group">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-3 group-hover:scale-110 transition-transform">
                  <Heart size={20} />
                </div>
                <span className="text-2xl font-black text-white">{stats.favorites}</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Favorites</span>
              </Link>
              <Link href="/dashboard/buyer/following" className="bg-zinc-900 rounded-2xl p-6 flex flex-col items-center border border-zinc-800 hover:border-blue-500/50 transition-all group">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <span className="text-2xl font-black text-white">{stats.following}</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Following</span>
              </Link>
            </div>

            {/* Quick Actions List */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Account Management</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                {quickActions.map((action, i) => (
                  <Link 
                    key={i} 
                    href={action.href} 
                    className={`flex items-center p-6 hover:bg-zinc-800/50 transition-colors group ${action.isComingSoon ? 'cursor-not-allowed opacity-75' : ''}`}
                    onClick={(e) => action.isComingSoon && e.preventDefault()}
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-black flex items-center justify-center ${action.color} mr-4 group-hover:scale-110 transition-transform shadow-lg relative`}>
                      <action.icon size={24} />
                      {action.isComingSoon && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white group-hover:text-primary transition-colors">{action.label}</h3>
                        {action.isComingSoon && (
                          <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black uppercase">SOON</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{action.sub}</p>
                    </div>
                    <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Purchases */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em]">Recent Purchases</h2>
              <Link href="/dashboard/buyer/orders" className="text-xs font-bold text-primary hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {recentPurchases.length > 0 ? (
                recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center group hover:border-zinc-700 transition-all">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 shadow-lg">
                        <Image 
                          src={purchase.beats?.cover_url || "https://placehold.co/100x100"} 
                          alt={purchase.beats?.title || "Beat"} 
                          fill 
                          className="object-cover" 
                        />
                    </div>
                    <div className="flex-1 ml-4 min-w-0">
                        <h3 className="font-bold text-base text-white truncate">{purchase.beats?.title}</h3>
                        <p className="text-sm text-zinc-400 truncate">{purchase.beats?.profiles?.display_name}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                             <FileText size={10} />
                             {purchase.license_type} License
                           </div>
                           <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                             {new Date(purchase.created_at).toLocaleDateString()}
                           </span>
                        </div>
                    </div>
                    <button className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-md">
                        <Download size={20} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
                  <ShoppingBag size={40} className="text-zinc-800 mx-auto mb-4" />
                  <p className="text-sm text-zinc-500 font-medium">No recent purchases found.</p>
                  <Link href="/beats" className="inline-block mt-4 text-primary font-bold text-sm hover:underline">Browse Beats</Link>
                </div>
              )}
            </div>
          </div>

          {/* Side Info / Upsell */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-primary/20 to-rose-500/10 border border-primary/20 rounded-2xl p-6 relative overflow-hidden group">
               <div className="absolute -right-8 -bottom-8 text-primary/10 group-hover:scale-110 transition-transform">
                 <Music size={120} />
               </div>
               <h3 className="text-xl font-black text-white mb-2 relative z-10">Want to sell your own beats?</h3>
               <p className="text-sm text-zinc-300 mb-6 relative z-10">Join our creator community and start earning from your music today.</p>
               <Link href="/profile/edit" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all relative z-10 shadow-lg">
                 Upgrade to Creator
                 <ChevronRight size={14} />
               </Link>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full mt-6 py-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
            >
              <LogOut size={16} />
              Sign Out Account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
