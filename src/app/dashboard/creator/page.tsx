"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import { useSettingsStore } from '@/store/useSettingsStore';
import { UploadCloud, Music, DollarSign, Settings, Users, UserPlus, CheckCircle2, Circle, ArrowRight, Camera, Sparkles, X, MessageSquare, TrendingUp, Play, Heart, LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import clsx from 'clsx';

const ResponsiveContainer = dynamic(() => import('recharts').then((recharts) => recharts.ResponsiveContainer), { ssr: false });

export default function CreatorDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <CreatorDashboardContent />
    </Suspense>
  );
}

function CreatorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewlyUpgraded = searchParams.get('newly_upgraded') === 'true';
  const { user, profile, initialize, signOut } = useAuthStore();
  const { general } = useSettingsStore();
  const [stats, setStats] = useState({ 
    beats: 0, 
    followers: 0, 
    following: 0, 
    earnings: 0,
    plays: 0,
    likes: 0,
    comments: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [revenueBreakdown, setRevenueBreakdown] = useState({ beats: 0, bundles: 0 });
  const [growth, setGrowth] = useState({ amount: 0, percentage: 0, isPositive: true });
  const [topBeats, setTopBeats] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentEngagement, setRecentEngagement] = useState<any[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);

  const { currency, exchangeRates } = useUIStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) fetchStats();
  }, [user, timeRange]);

  async function fetchStats() {
    if (!user) return;

    try {
      // 1. Creator Profile Data
      const { data: cp } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setCreatorProfile(cp);

      // 2. Parallel stats fetching
      const [beatsRes, bundlesRes, followersRes, followingCount, earningsRes, likesRes, commentsRes] = await Promise.all([
        supabase.from('beats').select('plays, likes_count, comments_count').eq('artist_id', user.id),
        supabase.from('bundles').select('plays, likes_count, comments_count').eq('creator_id', user.id),
        supabase
          .from('follows')
          .select('follower_id, created_at, profiles!follower_id(display_name)', { count: 'exact' })
          .eq('following_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase
          .from('order_items')
          .select(`
            price, 
            orders!inner(status, created_at), 
            beats(id, title, artist_id, cover_url, plays, likes_count, comments_count),
            bundles(id, title, creator_id, cover_url, plays, likes_count, comments_count)
          `)
          .or(`beats.artist_id.eq.${user.id},bundles.creator_id.eq.${user.id}`)
          .eq('orders.status', 'completed'),
        supabase
          .from('likes')
          .select(`
            id, 
            created_at, 
            profiles:user_id(display_name), 
            beats(title), 
            bundles(title)
          `)
          .or(`beats.artist_id.eq.${user.id},bundles.creator_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('comments')
          .select(`
            id, 
            created_at, 
            content,
            profiles:user_id(display_name), 
            beats(title), 
            bundles(title)
          `)
          .or(`beats.artist_id.eq.${user.id},bundles.creator_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      // Process Engagement
      const combinedEngagement = [
        ...(likesRes.data || []).map(l => ({
          id: l.id,
          type: 'like',
          user: l.profiles?.display_name,
          item: l.beats?.title || l.bundles?.title,
          date: l.created_at
        })),
        ...(commentsRes.data || []).map(c => ({
          id: c.id,
          type: 'comment',
          user: c.profiles?.display_name,
          item: c.beats?.title || c.bundles?.title,
          content: c.content,
          date: c.created_at
        })),
        ...(followersRes.data || []).map(f => ({
          id: f.follower_id,
          type: 'follow',
          user: f.profiles?.display_name,
          item: 'Your profile',
          date: f.created_at
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

      setRecentEngagement(combinedEngagement);

      const totalEarnings = earningsRes.data?.reduce((sum, item) => sum + item.price, 0) || 0;
      
      // Calculate totals from beats and bundles
      const totalPlays = (beatsRes.data?.reduce((sum, b) => sum + (b.plays || 0), 0) || 0) + 
                        (bundlesRes.data?.reduce((sum, b) => sum + (b.plays || 0), 0) || 0);
      
      const totalLikes = (beatsRes.data?.reduce((sum, b) => sum + (b.likes_count || 0), 0) || 0) + 
                        (bundlesRes.data?.reduce((sum, b) => sum + (b.likes_count || 0), 0) || 0);
      
      const totalComments = (beatsRes.data?.reduce((sum, b) => sum + (b.comments_count || 0), 0) || 0) + 
                           (bundlesRes.data?.reduce((sum, b) => sum + (b.comments_count || 0), 0) || 0);

      setStats({
        beats: (beatsRes.data?.length || 0) + (bundlesRes.data?.length || 0),
        followers: followersRes.count || 0,
        following: followingCount.count || 0,
        earnings: totalEarnings,
        plays: totalPlays,
        likes: totalLikes,
        comments: totalComments
      });

      // 3. Process Top Performing Content
      if (earningsRes.data) {
        const contentStats: { [key: string]: { id: string, title: string, cover_url: string, sales: number, earnings: number, type: 'beat' | 'bundle' } } = {};
        
        earningsRes.data.forEach((item: any) => {
          const isBundle = !!item.bundles;
          const content = isBundle ? item.bundles : item.beats;
          if (!content) return;

          const contentId = content.id;
          if (!contentStats[contentId]) {
            contentStats[contentId] = {
              id: contentId,
              title: content.title,
              cover_url: content.cover_url,
              sales: 0,
              earnings: 0,
              type: isBundle ? 'bundle' : 'beat'
            };
          }
          contentStats[contentId].sales += 1;
          contentStats[contentId].earnings += item.price;
        });

        const sortedContent = Object.values(contentStats)
          .sort((a, b) => b.earnings - a.earnings)
          .slice(0, 5);
        
        setTopBeats(sortedContent);

        // 4. Process Recent Sales
        const sortedSales = [...earningsRes.data]
          .sort((a, b) => new Date(b.orders.created_at).getTime() - new Date(a.orders.created_at).getTime())
          .slice(0, 5)
          .map((sale: any) => {
            const isBundle = !!sale.bundles;
            return {
              id: sale.id,
              beat_title: isBundle ? sale.bundles?.title : sale.beats?.title,
              price: sale.price,
              date: sale.orders.created_at,
              status: sale.orders.status,
              type: isBundle ? 'bundle' : 'beat'
            };
          });
        
        setRecentSales(sortedSales);

        // Advanced Analytics Processing
        let daysToFetch = 7;
        if (timeRange === '30d') daysToFetch = 30;
        if (timeRange === '90d') daysToFetch = 90;
        if (timeRange === 'all') {
          const oldestSale = earningsRes.data.reduce((oldest, sale) => {
            const saleDate = new Date(sale.orders.created_at);
            return saleDate < oldest ? saleDate : oldest;
          }, new Date());
          daysToFetch = Math.max(7, Math.ceil((new Date().getTime() - oldestSale.getTime()) / (1000 * 60 * 60 * 24)));
        }

        const chartPeriods = [...Array(daysToFetch)].map((_, i) => {
          const date = subDays(new Date(), i);
          return {
            date: format(date, daysToFetch > 30 ? 'MMM dd' : 'MMM dd'),
            fullDate: date,
            amount: 0,
            sales: 0
          };
        }).reverse();

        let beatsRevenue = 0;
        let bundlesRevenue = 0;
        let currentPeriodRevenue = 0;
        let previousPeriodRevenue = 0;
        const now = new Date();
        const startOfCurrentPeriod = subDays(now, daysToFetch);
        const startOfPreviousPeriod = subDays(now, daysToFetch * 2);

        earningsRes.data.forEach((item: any) => {
          const itemDate = new Date(item.orders.created_at);
          const isBundle = !!item.bundles;

          // Revenue breakdown
          if (isBundle) bundlesRevenue += item.price;
          else beatsRevenue += item.price;

          // Chart data
          const dayMatch = chartPeriods.find(d => isSameDay(d.fullDate, itemDate));
          if (dayMatch) {
            dayMatch.amount += item.price;
            dayMatch.sales += 1;
          }

          // Growth calculation
          if (itemDate >= startOfCurrentPeriod) {
            currentPeriodRevenue += item.price;
          } else if (itemDate >= startOfPreviousPeriod) {
            previousPeriodRevenue += item.price;
          }
        });

        setChartData(chartPeriods);
        setRevenueBreakdown({ beats: beatsRevenue, bundles: bundlesRevenue });

        // Growth metrics
        const amountDiff = currentPeriodRevenue - previousPeriodRevenue;
        const percentGrowth = previousPeriodRevenue > 0 ? (amountDiff / previousPeriodRevenue) * 100 : 100;
        setGrowth({
          amount: Math.abs(amountDiff),
          percentage: Math.abs(percentGrowth),
          isPositive: amountDiff >= 0
        });
      }
    } catch (err) {
      console.error("Error fetching creator stats:", err);
    }
  }

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
      
      <main className="pt-[100px] max-w-7xl mx-auto px-4 pb-12">
        {/* Profile Card & Header Section */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8 items-start">
           <div className="w-full lg:w-80 flex-shrink-0">
             <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-row lg:flex-col items-center lg:text-center gap-4 lg:gap-0">
                <div className="relative w-16 h-16 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 lg:border-4 border-black shadow-xl bg-zinc-800 flex-shrink-0">
                  <Image 
                      src={profile?.avatar_url || user?.user_metadata?.avatar_url || general?.logo_url || "https://placehold.co/100x100"} 
                      alt="Profile" 
                      fill 
                      className="object-cover"
                      unoptimized={true}
                    />
                </div>
                <div className="flex-1 lg:w-full">
                  <h2 className="text-lg lg:text-xl font-bold mb-0.5 lg:mb-1 truncate">{profile?.display_name || user?.email?.split('@')[0]}</h2>
                  <p className="text-zinc-500 text-xs lg:text-sm mb-2 lg:mb-4 truncate">{user?.email}</p>
                  <div className="flex lg:justify-center gap-2 mb-3 lg:mb-6">
                    <span className="px-2 lg:px-3 py-0.5 lg:py-1 bg-primary/10 text-primary text-[8px] lg:text-[10px] font-black rounded-full uppercase tracking-widest border border-primary/20">
                      {profile?.role || "Creator"}
                    </span>
                  </div>
                  <Link href="/profile/edit" className="block w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] lg:text-xs font-bold rounded-xl transition-colors border border-zinc-700 text-center">
                    Edit Profile
                  </Link>
                </div>
             </div>
           </div>

           <div className="flex-1 w-full">
        {isNewlyUpgraded && (
          <div className="mb-6 bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-top duration-700">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="text-primary animate-pulse" size={24} />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-xl font-black text-white mb-1">Welcome, Creator!</h2>
              <p className="text-zinc-400 text-sm max-w-2xl">
                Your account is ready. Let's get your storefront set up for your first sale.
              </p>
            </div>
            <button 
              onClick={() => router.replace('/dashboard/creator')}
              className="ml-auto text-zinc-500 hover:text-white transition-colors p-2"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl lg:text-4xl font-black mb-2 tracking-tight">
              {general?.site_name ? `${general.site_name.split(' ')[0]} Dashboard` : 'Dashboard'}
            </h1>
            <p className="text-sm lg:text-base text-zinc-400">Manage your music empire and track your growth.</p>
          </div>
          <div className="flex gap-3 justify-center md:justify-start">
             {profile?.username && profile.username !== 'null' ? (
               <Link href={`/creator/${profile.username}`} className="flex-1 md:flex-none px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs lg:text-sm font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                  <Users size={16} />
                  View Storefront
               </Link>
             ) : (
               <button 
                 disabled
                 className="flex-1 md:flex-none px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs lg:text-sm font-bold opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
                 title="Please set a username in profile settings first"
               >
                  <Users size={16} />
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

        {/* Stats Row 1: Sales & Audience */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-4">
          <div className="bg-zinc-900 p-4 lg:p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-green-500/50 transition-all">
            <div className="absolute -right-4 -bottom-4 text-green-500/5 group-hover:text-green-500/10 transition-colors">
              <DollarSign size={60} className="lg:w-[80px] lg:h-[80px]" />
            </div>
            <span className="text-xl lg:text-3xl font-black text-green-500 mb-1">{formatPrice(stats.earnings, currency, exchangeRates)}</span>
            <span className="text-[8px] lg:text-[10px] text-zinc-500 uppercase tracking-[0.1em] lg:tracking-[0.2em] font-black">Total Earnings</span>
          </div>
          <div className="bg-zinc-900 p-4 lg:p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="absolute -right-4 -bottom-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors">
              <Users size={60} className="lg:w-[80px] lg:h-[80px]" />
            </div>
            <span className="text-xl lg:text-3xl font-black text-white mb-1">{stats.followers}</span>
            <span className="text-[8px] lg:text-[10px] text-zinc-500 uppercase tracking-[0.1em] lg:tracking-[0.2em] font-black">Followers</span>
          </div>
          <div className="bg-zinc-900 p-4 lg:p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-purple-500/50 transition-all">
            <div className="absolute -right-4 -bottom-4 text-purple-500/5 group-hover:text-purple-500/10 transition-colors">
              <UserPlus size={60} className="lg:w-[80px] lg:h-[80px]" />
            </div>
            <span className="text-xl lg:text-3xl font-black text-white mb-1">{stats.following}</span>
            <span className="text-[8px] lg:text-[10px] text-zinc-500 uppercase tracking-[0.1em] lg:tracking-[0.2em] font-black">Following</span>
          </div>
          <div className="bg-zinc-900 p-4 lg:p-6 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/50 transition-all">
            <div className="absolute -right-4 -bottom-4 text-primary/5 group-hover:text-primary/10 transition-colors">
              <Music size={60} className="lg:w-[80px] lg:h-[80px]" />
            </div>
            <span className="text-xl lg:text-3xl font-black text-white mb-1">{stats.beats}</span>
            <span className="text-[8px] lg:text-[10px] text-zinc-500 uppercase tracking-[0.1em] lg:tracking-[0.2em] font-black">Total Content</span>
          </div>
        </div>

        {/* Stats Row 2: Engagement */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-8">
          <div className="bg-zinc-900/50 p-3 lg:p-4 rounded-2xl border border-zinc-800/50 flex items-center gap-3 lg:gap-4 group hover:border-orange-500/50 transition-all">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
              <Play size={20} className="lg:w-6 lg:h-6" fill="currentColor" />
            </div>
            <div>
              <div className="text-lg lg:text-xl font-black text-white">{stats.plays}</div>
              <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">Total Plays</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 p-3 lg:p-4 rounded-2xl border border-zinc-800/50 flex items-center gap-3 lg:gap-4 group hover:border-red-500/50 transition-all">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
              <Heart size={20} className="lg:w-6 lg:h-6" fill="currentColor" />
            </div>
            <div>
              <div className="text-lg lg:text-xl font-black text-white">{stats.likes}</div>
              <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">Total Likes</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 p-3 lg:p-4 rounded-2xl border border-zinc-800/50 flex items-center gap-3 lg:gap-4 group hover:border-primary/50 transition-all">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <MessageSquare size={20} className="lg:w-6 lg:h-6" fill="currentColor" />
            </div>
            <div>
              <div className="text-lg lg:text-xl font-black text-white">{stats.comments}</div>
              <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">Comments</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 mb-8">
          <Link href="/dashboard/creator/upload" className="bg-zinc-900 p-4 lg:p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <UploadCloud className="text-primary mb-3 lg:mb-4 group-hover:scale-110 transition-transform" size={24} />
            <h3 className="text-base lg:text-xl font-bold mb-0.5 lg:mb-1">Upload Beat</h3>
            <p className="text-[10px] lg:text-sm text-zinc-400">Share new sounds</p>
          </Link>
          <Link href="/dashboard/creator/my-beats" className="bg-zinc-900 p-4 lg:p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <Music className="text-blue-500 mb-3 lg:mb-4 group-hover:scale-110 transition-transform" size={24} />
            <h3 className="text-base lg:text-xl font-bold mb-0.5 lg:mb-1">My Beats</h3>
            <p className="text-[10px] lg:text-sm text-zinc-400">Manage your catalog</p>
          </Link>
          <Link href="/dashboard/creator/bundles" className="bg-zinc-900 p-4 lg:p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <Sparkles className="text-yellow-500 mb-3 lg:mb-4 group-hover:scale-110 transition-transform" size={24} />
            <h3 className="text-base lg:text-xl font-bold mb-0.5 lg:mb-1">Bundles</h3>
            <p className="text-[10px] lg:text-sm text-zinc-400">Sell beat collections</p>
          </Link>
          <Link href="/dashboard/creator/earnings" className="bg-zinc-900 p-4 lg:p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <DollarSign className="text-green-500 mb-3 lg:mb-4 group-hover:scale-110 transition-transform" size={24} />
            <h3 className="text-base lg:text-xl font-bold mb-0.5 lg:mb-1">Earnings</h3>
            <p className="text-[10px] lg:text-sm text-zinc-400">View detailed report</p>
          </Link>
          <Link href="/dashboard/creator/verification" className="bg-zinc-900 p-4 lg:p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group">
            <CheckCircle2 className="text-purple-500 mb-3 lg:mb-4 group-hover:scale-110 transition-transform" size={24} />
            <h3 className="text-base lg:text-xl font-bold mb-0.5 lg:mb-1">Verification</h3>
            <p className="text-[10px] lg:text-sm text-zinc-400">Get verified badge</p>
          </Link>
          <div className="bg-zinc-900/50 p-4 lg:p-6 rounded-xl border border-zinc-800/50 relative group opacity-75">
            <div className="absolute top-2 right-2 lg:top-4 lg:right-4 bg-primary/20 text-primary text-[6px] lg:text-[8px] font-black px-1.5 lg:px-2 py-0.5 rounded-full uppercase tracking-widest">Coming Soon</div>
            <MessageSquare className="text-zinc-500 mb-3 lg:mb-4" size={24} />
            <h3 className="text-base lg:text-xl font-bold mb-0.5 lg:mb-1 text-zinc-400">Forum & Chat</h3>
            <p className="text-[10px] lg:text-sm text-zinc-600">Community discussions</p>
          </div>
          <Link href="/profile/edit" className="bg-zinc-900 p-4 lg:p-6 rounded-xl border border-zinc-800 hover:border-primary transition-colors group col-span-2 lg:col-span-1">
            <Settings className="text-zinc-400 mb-3 lg:mb-4 group-hover:scale-110 transition-transform" size={24} />
            <h3 className="text-base lg:text-xl font-bold mb-0.5 lg:mb-1">Settings</h3>
            <p className="text-[10px] lg:text-sm text-zinc-400">Profile & Payouts</p>
          </Link>
        </div>

        {/* Sales Chart Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-8 shadow-2xl">
          <div className="p-4 lg:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm lg:text-base">Advanced Analytics</h3>
                <div className="flex items-center gap-2">
                  <p className="text-[8px] lg:text-xs text-zinc-500 uppercase tracking-widest font-bold">Performance Overview</p>
                  <div className={clsx(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                    growth.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {growth.isPositive ? '↑' : '↓'} {growth.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-zinc-800">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    timeRange === range 
                      ? "bg-primary text-black shadow-lg shadow-primary/20" 
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                  )}
                >
                  {range === 'all' ? 'All' : range}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 border-b border-zinc-800">
            <div className="p-4 lg:p-6 border-b md:border-b-0 md:border-r border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Total Revenue</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl lg:text-3xl font-black text-white leading-none">{formatPrice(stats.earnings, currency, exchangeRates)}</span>
                <span className={clsx(
                  "text-[10px] font-bold mb-1",
                  growth.isPositive ? "text-green-500" : "text-red-500"
                )}>
                  {growth.isPositive ? '+' : '-'}{formatPrice(growth.amount, currency, exchangeRates)}
                </span>
              </div>
            </div>
            <div className="p-4 lg:p-6 border-b md:border-b-0 md:border-r border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Beats Revenue</p>
              <div className="flex items-center justify-between">
                <span className="text-xl lg:text-2xl font-black text-white">{formatPrice(revenueBreakdown.beats, currency, exchangeRates)}</span>
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${stats.earnings > 0 ? (revenueBreakdown.beats / stats.earnings) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Bundles Revenue</p>
              <div className="flex items-center justify-between">
                <span className="text-xl lg:text-2xl font-black text-white">{formatPrice(revenueBreakdown.bundles, currency, exchangeRates)}</span>
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${stats.earnings > 0 ? (revenueBreakdown.bundles / stats.earnings) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 lg:p-6 h-64 lg:h-96 w-full relative">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    dy={10}
                    interval={timeRange === 'all' || timeRange === '90d' ? Math.floor(chartData.length / 6) : 0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    tickFormatter={(value) => formatPrice(value, currency, exchangeRates).split('.')[0]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#27272a', 
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                    }}
                    itemStyle={{ color: '#00ff88', fontWeight: 'bold' }}
                    cursor={{ stroke: '#00ff88', strokeWidth: 1, strokeDasharray: '5 5' }}
                    formatter={(value: any) => [formatPrice(value, currency, exchangeRates), 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#00ff88" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium">
                No sales data for this period
              </div>
            )}
          </div>
        </div>

        {/* Top Beats & Recent Sales Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 mb-12">
          {/* Top Performing Beats */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 lg:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Music size={16} className="lg:w-5 lg:h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm lg:text-base">Top Performing Beats</h3>
                  <p className="text-[8px] lg:text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Based on Revenue</p>
                </div>
              </div>
              <Link href="/dashboard/creator/my-beats" className="text-[10px] lg:text-xs text-primary font-bold hover:underline">View All</Link>
            </div>
            <div className="p-2 lg:p-4">
              {topBeats.length > 0 ? (
                <div className="space-y-1 lg:space-y-2">
                  {topBeats.map((beat) => (
                    <div key={beat.id} className="flex items-center gap-3 lg:gap-4 p-2 lg:p-3 rounded-xl hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-800 group">
                      <div className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 shadow-md group-hover:scale-105 transition-transform">
                        <Image src={beat.cover_url || "https://placehold.co/100x100"} alt={beat.title} fill className="object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs lg:text-sm truncate">{beat.title}</h4>
                          {beat.type === 'bundle' && (
                            <span className="text-[6px] lg:text-[8px] bg-primary/20 text-primary px-1 rounded uppercase font-black">Bundle</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] lg:text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{beat.sales} Sales</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-700" />
                          <span className="text-[8px] lg:text-[10px] text-primary font-bold">Trending</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs lg:text-sm font-black text-white">{formatPrice(beat.earnings, currency, exchangeRates)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 lg:py-12 text-center">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <Music size={16} className="lg:w-5 lg:h-5 text-zinc-600" />
                  </div>
                  <p className="text-zinc-500 text-xs lg:text-sm">No sales data yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sales Activity */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 lg:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                  <DollarSign size={16} className="lg:w-5 lg:h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm lg:text-base">Recent Sales</h3>
                  <p className="text-[8px] lg:text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Live Activity</p>
                </div>
              </div>
              <Link href="/dashboard/creator/earnings" className="text-[10px] lg:text-xs text-primary font-bold hover:underline">Full Report</Link>
            </div>
            <div className="p-2 lg:p-4">
              {recentSales.length > 0 ? (
                <div className="space-y-1 lg:space-y-2">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center gap-3 lg:gap-4 p-2 lg:p-3 rounded-xl hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-800">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0">
                        <CheckCircle2 size={16} className="lg:w-[18px] lg:h-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs lg:text-sm truncate">{sale.beat_title}</h4>
                          {sale.type === 'bundle' && (
                            <span className="text-[6px] lg:text-[8px] bg-primary/20 text-primary px-1 rounded uppercase font-black">Bundle</span>
                          )}
                        </div>
                        <p className="text-[8px] lg:text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{format(new Date(sale.date), 'MMM dd, HH:mm')}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs lg:text-sm font-black text-green-500">+{formatPrice(sale.price, currency, exchangeRates)}</span>
                        <div className="text-[6px] lg:text-[8px] text-zinc-500 uppercase font-black tracking-[0.1em] lg:tracking-[0.2em]">{sale.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 lg:py-12 text-center">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <DollarSign size={16} className="lg:w-5 lg:h-5 text-zinc-600" />
                  </div>
                  <p className="text-zinc-500 text-xs lg:text-sm">No recent activity.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Engagement Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl lg:col-span-2">
            <div className="p-4 lg:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles size={16} className="lg:w-5 lg:h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm lg:text-base">Recent Engagement</h3>
                  <p className="text-[8px] lg:text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Likes & Comments</p>
                </div>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              {recentEngagement.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                  {recentEngagement.map((eng) => (
                    <div key={eng.id} className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 rounded-2xl bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <div className={clsx(
                        "w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        eng.type === 'like' ? "bg-red-500/10 text-red-500" : 
                        eng.type === 'comment' ? "bg-primary/10 text-primary" :
                        "bg-blue-500/10 text-blue-500"
                      )}>
                        {eng.type === 'like' ? <Heart size={16} className="lg:w-[18px] lg:h-[18px]" fill="currentColor" /> : 
                         eng.type === 'comment' ? <MessageSquare size={16} className="lg:w-[18px] lg:h-[18px]" /> : 
                         <UserPlus size={16} className="lg:w-[18px] lg:h-[18px]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs lg:text-sm font-bold text-white truncate">{eng.user || 'Someone'}</span>
                          <span className="text-[8px] lg:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{format(new Date(eng.date), 'MMM dd')}</span>
                        </div>
                        <p className="text-[10px] lg:text-xs text-zinc-400 leading-relaxed">
                          {eng.type === 'like' ? (
                            <>Liked <span className="text-zinc-200 font-bold">{eng.item}</span></>
                          ) : eng.type === 'comment' ? (
                            <>Commented on <span className="text-zinc-200 font-bold">{eng.item}</span>: "{eng.content}"</>
                          ) : (
                            <>Started following <span className="text-zinc-200 font-bold">you</span></>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 lg:py-20 text-center bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                   <Sparkles size={32} className="lg:w-12 lg:h-12 text-zinc-700 mx-auto mb-4" />
                   <h3 className="text-lg lg:text-xl font-bold text-white mb-2">No Engagement Yet</h3>
                   <p className="text-zinc-500 text-xs lg:text-sm max-w-xs mx-auto">Your social activity will appear here as users interact with your beats and bundles.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-red-500/10 border border-red-500/50 text-red-500 font-bold py-3 lg:py-4 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={18} className="lg:w-5 lg:h-5" />
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
