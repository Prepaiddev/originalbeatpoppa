"use client";

import Header from '@/components/Header';
import { Users, Music, DollarSign, Activity, AlertTriangle, CreditCard, ArrowUpRight, TrendingUp, MessageSquare, Lock, CheckCircle, Ticket, Mail } from 'lucide-react';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import Link from 'next/link';
import SeedDatabaseButton from '@/components/admin/SeedDatabaseButton';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getAdminLink } from '@/constants/admin';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function AdminDashboard() {
  const { adminPath, fetchAdminPath } = useSettingsStore();
  const { currency, exchangeRates } = useUIStore();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    activeBeats: 0,
    pendingPayouts: 0,
    recentTransactions: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminPath();
    async function fetchStats() {
      try {
        setLoading(true);
        
        // 1. Fetch Total Users
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // 2. Fetch Active Beats
        const { count: beatCount } = await supabase
          .from('beats')
          .select('*', { count: 'exact', head: true });

        // 3. Fetch Recent Transactions
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('*, profiles:buyer_id(display_name, username)')
          .order('created_at', { ascending: false })
          .limit(5);

        // 4. Fetch Revenue (Sum of orders)
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('status', 'completed');
        
        const revenue = orders?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;

        // 5. Fetch Pending Payouts Count
        const { count: pendingPayoutsCount } = await supabase
          .from('withdrawals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setStats({
          totalRevenue: revenue,
          totalUsers: userCount || 0,
          activeBeats: beatCount || 0,
          pendingPayouts: pendingPayoutsCount || 0,
          recentTransactions: recentOrders || []
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">
              BEATPOPPA <span className="text-primary">PORTAL</span>
            </h1>
            <p className="text-zinc-500 font-medium">Platform overview and management hub</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Live Updates
            </div>
            <SeedDatabaseButton />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Revenue */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative bg-zinc-900/90 backdrop-blur-xl p-6 rounded-2xl border border-zinc-800/50">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
                  <DollarSign size={24} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-1 text-green-500 text-xs font-black bg-green-500/10 px-2 py-1 rounded-full">
                  <TrendingUp size={12} /> +12%
                </div>
              </div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Revenue</p>
              <h3 className="text-3xl font-black text-white tabular-nums">
                {formatPrice(stats.totalRevenue, currency, exchangeRates)}
              </h3>
            </div>
          </div>

          {/* Users */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative bg-zinc-900/90 backdrop-blur-xl p-6 rounded-2xl border border-zinc-800/50">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                  <Users size={24} strokeWidth={2.5} />
                </div>
                <div className="text-zinc-500 text-[10px] font-black bg-zinc-800 px-2 py-1 rounded-full uppercase">
                  Global
                </div>
              </div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Users</p>
              <h3 className="text-3xl font-black text-white tabular-nums">
                {stats.totalUsers.toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Beats */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-orange-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative bg-zinc-900/90 backdrop-blur-xl p-6 rounded-2xl border border-zinc-800/50">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Music size={24} strokeWidth={2.5} />
                </div>
                <div className="text-primary text-[10px] font-black bg-primary/10 px-2 py-1 rounded-full uppercase">
                  Live
                </div>
              </div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Active Beats</p>
              <h3 className="text-3xl font-black text-white tabular-nums">
                {stats.activeBeats.toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Payouts */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
            <div className="relative bg-zinc-900/90 backdrop-blur-xl p-6 rounded-2xl border border-zinc-800/50">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500">
                  <AlertTriangle size={24} strokeWidth={2.5} />
                </div>
                <Link href={getAdminLink('/payouts')} className="text-yellow-500 p-2 hover:bg-yellow-500/10 rounded-xl transition-colors">
                  <ArrowUpRight size={20} />
                </Link>
              </div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Pending Payouts</p>
              <h3 className="text-3xl font-black text-white tabular-nums">
                ${stats.pendingPayouts.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Management Grid */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-zinc-800"></div>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Platform Management</h2>
            <div className="h-px flex-1 bg-zinc-800"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href={getAdminLink('/users', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Users</h3>
              <p className="text-zinc-500 text-sm leading-snug">Manage accounts, roles, and platform permissions.</p>
            </Link>

            <Link href={getAdminLink('/beats', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <Music size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Content</h3>
              <p className="text-zinc-500 text-sm leading-snug">Review beat uploads and handle copyright reports.</p>
            </Link>

            <Link href={getAdminLink('/payouts', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <DollarSign size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Wallet Management</h3>
              <p className="text-zinc-500 text-sm leading-snug">Process creator withdrawal requests and treasury.</p>
            </Link>

            <Link href={getAdminLink('/creators', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Creator Verification</h3>
              <p className="text-zinc-500 text-sm leading-snug">Review and approve creator verification applications.</p>
            </Link>

            <Link href={getAdminLink('/analytics', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <Activity size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Analytics & Audit</h3>
              <p className="text-zinc-500 text-sm leading-snug">Monitor platform performance and system audit logs.</p>
            </Link>

            <Link href={getAdminLink('/coupons', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <Ticket size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Coupons</h3>
              <p className="text-zinc-500 text-sm leading-snug">Create and manage discount codes for the shop.</p>
            </Link>

            <Link href={getAdminLink('/settings', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <CreditCard size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Settings</h3>
              <p className="text-zinc-500 text-sm leading-snug">Configure commissions and platform gateways.</p>
            </Link>

            <Link href={getAdminLink('/reviews', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Reviews</h3>
              <p className="text-zinc-500 text-sm leading-snug">Moderate platform reviews and handle reported feedback.</p>
            </Link>

            <Link href={getAdminLink('/emails', adminPath)} className="group bg-zinc-900/50 border border-zinc-800 hover:border-primary/50 p-6 rounded-3xl transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                <Mail size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-1">Email Management</h3>
              <p className="text-zinc-500 text-sm leading-snug">Configure templates, SMTP providers, and automation.</p>
            </Link>

            {/* Coming Soon: Forum/Chat */}
            <div className="relative group bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl opacity-60 overflow-hidden cursor-not-allowed">
              <div className="absolute top-4 right-4 text-primary animate-pulse">
                <Lock size={16} />
              </div>
              <div className="w-12 h-12 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare size={24} />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-black text-white">Forum & Chat</h3>
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest rounded-full">Coming Soon</span>
              </div>
              <p className="text-zinc-500 text-sm leading-snug">Internal communication hub for creators and staff.</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Recent Transactions</h2>
            <button className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">View All</button>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Transaction ID</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Customer</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {stats.recentTransactions.length > 0 ? (
                    stats.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-8 py-5">
                          <span className="font-mono text-xs text-zinc-400">#TX-{tx.id.slice(0, 8)}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase">
                              {tx.profiles?.display_name?.charAt(0) || tx.profiles?.username?.charAt(0) || 'U'}
                            </div>
                            <span className="font-bold text-white group-hover:text-primary transition-colors">
                              {tx.profiles?.display_name || tx.profiles?.username || 'Unknown User'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            tx.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="font-black text-white">{formatPrice(tx.total_amount, currency, exchangeRates)}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-zinc-500 font-medium">
                        No transactions found in the database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

