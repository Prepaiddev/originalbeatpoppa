"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import { useSettingsStore } from '@/store/useSettingsStore';
import { UploadCloud, Music, DollarSign, Settings, Users, UserPlus, CheckCircle2, Circle, ArrowRight, Camera, Sparkles, X, MessageSquare, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import ConfirmationModal from '@/components/ConfirmationModal';
import { LogOut } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

const ResponsiveContainer = dynamic(() => import('recharts').then((recharts) => recharts.ResponsiveContainer), { ssr: false });

export default function CreatorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewlyUpgraded = searchParams.get('newly_upgraded') === 'true';
  const { user, profile, initialize, signOut } = useAuthStore();
  const { general } = useSettingsStore();
  const [stats, setStats] = useState({ beats: 0, followers: 0, following: 0, earnings: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);

  const { currency, exchangeRates } = useUIStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      if (!user) return;

      try {
        // 1. Creator Profile Data
        const { data: cp } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!isMounted) return;
        setCreatorProfile(cp);

        // 2. Parallel stats fetching
        const [beatsCount, followersCount, followingCount, earningsRes] = await Promise.all([
          supabase.from('beats').select('*', { count: 'exact', head: true }).eq('artist_id', user.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
          supabase
            .from('order_items')
            .select('price, created_at, orders!inner(status), beats!inner(artist_id)')
            .eq('beats.artist_id', user.id)
            .eq('orders.status', 'completed')
        ]);

        if (!isMounted) return;

        const totalEarnings = earningsRes.data?.reduce((sum, item) => sum + item.price, 0) || 0;
        
        setStats({
          beats: beatsCount.count || 0,
          followers: followersCount.count || 0,
          following: followingCount.count || 0,
          earnings: totalEarnings
        });

        // Process Chart Data (Last 7 Days)
        const last7Days = [...Array(7)].map((_, i) => {
          const date = subDays(new Date(), i);
          return {
            date: format(date, 'MMM dd'),
            fullDate: date,
            amount: 0
          };
        }).reverse();

        if (earningsRes.data) {
          earningsRes.data.forEach((item: any) => {
            const itemDate = new Date(item.created_at || new Date());
            const dayMatch = last7Days.find(d => isSameDay(d.fullDate, itemDate));
            if (dayMatch) {
              dayMatch.amount += item.price;
            }
          });
        }

        setChartData(last7Days);
      } catch (err) {
        console.error("Error fetching creator stats:", err);
      }
    }

    if (user) fetchStats();
    return () => { isMounted = false; };
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    setShowLogoutConfirm(false);
    router.push('/');
  };

  const quickActions = [
    { icon: UploadCloud, label: 'Upload Beat', sub: 'Share new sounds', href: '/dashboard/creator/upload', color: 'text-primary' },
    { icon: Music, label: 'My Beats', sub: `${stats.beats} tracks`, href: '/dashboard/creator/my-beats', color: 'text-blue-500' },
    { icon: DollarSign, label: 'Earnings', sub: `${formatPrice(stats.earnings, currency, exchangeRates)}`, href: '/dashboard/creator/earnings', color: 'text-green-500' },
    { icon: CheckCircle2, label: 'Verification', sub: 'Get verified badge', href: '/dashboard/creator/verification', color: 'text-purple-500' },
    { icon: MessageSquare, label: 'Forum & Chat', sub: 'Coming Soon', href: '#', color: 'text-zinc-500', isComingSoon: true },
    { icon: Settings, label: 'Settings', sub: 'Profile & Payouts', href: '/profile/edit', color: 'text-zinc-400' },
  ];

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-4">
        {/* Profile Card Overlay (Floating on the right or top) */}
        <div className="flex flex-col md:flex-row gap-8 mb-12 items-start">
           <div className="w-full md:w-80 flex-shrink-0">
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
                    {profile?.role || "Creator"}
                  </span>
                </div>
                <Link href="/profile/edit" className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors border border-zinc-700">
                  Edit Profile
                </Link>
             </div>
           </div>

           <div className="flex-1 w-full">
        {isNewlyUpgraded && (
          <div className="mb-8 bg-primary/10 border border-primary/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top duration-700">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-primary animate-pulse" size={40} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white mb-2">Welcome to the Creator Community!</h2>
              <p className="text-zinc-400 max-w-2xl">
                Your account has been successfully upgraded. Your previous purchases and favorites are still here. Now, let's get your storefront ready for your first sale.
              </p>
            </div>
            <button 
              onClick={() => router.replace('/dashboard/creator')}
              className="ml-auto text-zinc-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        )}

        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">
              {general?.site_name ? `${general.site_name.split(' ')[0]} Creator Dashboard` : 'Creator Dashboard'}
            </h1>
            <p className="text-zinc-400">Manage your music empire and track your growth.</p>
          </div>
          <div className="flex gap-3">
             {profile?.username && profile.username !== 'null' ? (
               <Link href={`/creator/${profile.username}`} className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2">
                  <Users size={18} />
                  View Storefront
               </Link>
             ) : (
               <button 
                 disabled
                 className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed flex items-center gap-2"
                 title="Please set a username in profile settings first"
               >
                  <Users size={18} />
                  View Storefront
               </button>
             )}
          </div>
        </div>

        {/* Profile Completion Checklist */}
        {(() => {
          const steps = [
            { label: 'Set a unique username', done: !!profile?.username },
            { label: 'Upload profile avatar', done: !!profile?.avatar_url },
            { label: 'Upload cover photo', done: !!creatorProfile?.cover_url },
            { label: 'Add a bio', done: !!profile?.bio },
            { label: 'Select genres', done: (creatorProfile?.genres?.length || 0) > 0 },
            { label: 'Upload first beat', done: stats.beats > 0 }
          ];
          const completedCount = steps.filter(s => s.done).length;
          const isComplete = completedCount === steps.length;

          if (isComplete) return null;

          return (
            <div className="mb-12 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="text-primary" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Complete Your Creator Profile</h2>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                      {completedCount} of {steps.length} steps finished
                    </p>
                  </div>
                </div>
                <div className="hidden md:block w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000" 
                    style={{ width: `${(completedCount / steps.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {steps.map((step, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${step.done ? 'bg-zinc-800/30 border-zinc-800/50 opacity-60' : 'bg-black/20 border-zinc-800'}`}>
                    {step.done ? (
                      <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle size={20} className="text-zinc-600 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${step.done ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-primary/5 flex items-center justify-between">
                <p className="text-xs text-zinc-400">Complete these to boost your visibility and start selling.</p>
                <Link href="/profile/edit" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                  Finish Setup
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/50 transition-all">
            <div className="absolute -right-4 -bottom-4 text-primary/5 group-hover:text-primary/10 transition-colors">
              <Music size={80} />
            </div>
            <span className="text-3xl font-black text-white mb-1">{stats.beats}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Total Beats</span>
          </div>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="absolute -right-4 -bottom-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors">
              <Users size={80} />
            </div>
            <span className="text-3xl font-black text-white mb-1">{stats.followers}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Followers</span>
          </div>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-purple-500/50 transition-all">
            <div className="absolute -right-4 -bottom-4 text-purple-500/5 group-hover:text-purple-500/10 transition-colors">
              <UserPlus size={80} />
            </div>
            <span className="text-3xl font-black text-white mb-1">{stats.following}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Following</span>
          </div>
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-green-500/50 transition-all">
            <div className="absolute -right-4 -bottom-4 text-green-500/5 group-hover:text-green-500/10 transition-colors">
              <DollarSign size={80} />
            </div>
            <span className="text-3xl font-black text-green-500 mb-1">{formatPrice(stats.earnings, currency, exchangeRates)}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Total Earnings</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/dashboard/creator/upload" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <UploadCloud className="text-primary mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="text-xl font-bold mb-1">Upload Beat</h3>
            <p className="text-zinc-400">Share new sounds</p>
          </Link>
          <Link href="/dashboard/creator/my-beats" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <Music className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="text-xl font-bold mb-1">My Beats</h3>
            <p className="text-zinc-400">Manage your catalog</p>
          </Link>
          <Link href="/dashboard/creator/earnings" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <DollarSign className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="text-xl font-bold mb-1">Earnings</h3>
            <p className="text-zinc-400">View detailed report</p>
          </Link>
          <Link href="/dashboard/creator/verification" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <CheckCircle2 className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="text-xl font-bold mb-1">Verification</h3>
            <p className="text-zinc-400">Get verified badge</p>
          </Link>
          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50 relative group opacity-75">
            <div className="absolute top-4 right-4 bg-primary/20 text-primary text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Coming Soon</div>
            <MessageSquare className="text-zinc-500 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-1 text-zinc-400">Forum & Chat</h3>
            <p className="text-zinc-600">Community discussions</p>
          </div>
          <Link href="/profile/edit" className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <Settings className="text-zinc-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
            <h3 className="text-xl font-bold mb-1">Settings</h3>
            <p className="text-zinc-400">Profile & Payouts</p>
          </Link>
        </div>

        {/* Sales Chart Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="font-bold">Sales Performance</h3>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Last 7 Days</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">{formatPrice(stats.earnings, currency, exchangeRates)}</span>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Revenue</p>
            </div>
          </div>
          <div className="p-6 h-80 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(value) => formatPrice(value, currency, exchangeRates)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#27272a', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#00ff88' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#00ff88" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium">
                No sales data yet
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-red-500/10 border border-red-500/50 text-red-500 font-bold py-4 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>
    </div>
      </main>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        variant="danger"
      />
    </div>
  );
}
