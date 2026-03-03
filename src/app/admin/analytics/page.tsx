"use client";

import Header from '@/components/Header';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Music, 
  DollarSign, 
  Activity, 
  Calendar, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Shield,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow, format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function AdminAnalyticsPage() {
  const { currency, exchangeRates } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [methodData, setMethodData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    revenue: 0,
    revenueGrowth: 0,
    newUsers: 0,
    usersGrowth: 0,
    beatUploads: 0,
    uploadsGrowth: 0,
    conversions: 0,
    conversionsGrowth: 0,
    topBeats: [] as any[],
    auditLogs: [] as any[]
  });

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
        const startDate = subDays(new Date(), days);

        // 1. Fetch Revenue
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount, created_at, payment_method')
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString());
        
        const totalRevenue = orders?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;

        // Process revenue for chart
        const dailyRevenue: Record<string, number> = {};
        const methodCounts: Record<string, number> = {
          'stripe': 0,
          'paypal': 0,
          'paystack': 0
        };
        
        const daysInterval = eachDayOfInterval({
          start: startDate,
          end: new Date()
        });

        daysInterval.forEach(day => {
          dailyRevenue[format(day, 'MMM dd')] = 0;
        });

        orders?.forEach(order => {
          const date = format(new Date(order.created_at), 'MMM dd');
          if (dailyRevenue[date] !== undefined) {
            dailyRevenue[date] += Number(order.total_amount) || 0;
          }
          
          if (order.payment_method) {
            const method = order.payment_method.toLowerCase();
            if (methodCounts[method] !== undefined) {
              methodCounts[method] += Number(order.total_amount) || 0;
            }
          }
        });

        const chartData = Object.entries(dailyRevenue).map(([date, amount]) => ({
          date,
          revenue: amount
        }));

        const methodChartData = Object.entries(methodCounts).map(([method, amount]) => ({
          method: method.charAt(0).toUpperCase() + method.slice(1),
          amount
        }));

        setRevenueData(chartData);
        setMethodData(methodChartData);

        // 2. Fetch Top Beats (most sold)
        const { data: topBeatsData } = await supabase
          .from('orders')
          .select('beat_id, beats(title, price, profiles(display_name))')
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString());
        
        // Group by beat_id and count
        const beatSales: Record<string, { title: string, artist: string, sales: number, revenue: number }> = {};
        topBeatsData?.forEach(order => {
          if (order.beat_id && order.beats) {
            if (!beatSales[order.beat_id]) {
              beatSales[order.beat_id] = {
                title: order.beats.title,
                artist: order.beats.profiles?.display_name || 'Unknown',
                sales: 0,
                revenue: 0
              };
            }
            beatSales[order.beat_id].sales += 1;
            beatSales[order.beat_id].revenue += order.beats.price || 0;
          }
        });

        const topBeats = Object.values(beatSales)
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);

        // 3. Fetch Real Counts
        const [usersRes, beatsRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('beats').select('*', { count: 'exact', head: true })
        ]);

        // 4. Fetch Audit Logs
        const { data: logs } = await supabase
          .from('audit_logs')
          .select('*, profiles:admin_id(display_name, email)')
          .order('created_at', { ascending: false })
          .limit(10);

        setStats({
          revenue: totalRevenue,
          revenueGrowth: 12.5, // Mock growth for UI
          newUsers: usersRes.count || 0,
          usersGrowth: 8.2,
          beatUploads: beatsRes.count || 0,
          uploadsGrowth: -2.4,
          conversions: 4.8,
          conversionsGrowth: 1.2,
          topBeats,
          auditLogs: logs || []
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">
              Analytics <span className="text-primary">& Audit</span>
            </h1>
            <p className="text-zinc-500 font-medium italic">Track marketplace growth and monitor system integrity</p>
          </div>
          
          <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-2xl p-1">
            {['7d', '30d', '90d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  timeRange === range 
                    ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenue */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-green-500/10 rounded-2xl text-green-500">
                <DollarSign size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${stats.revenueGrowth >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {stats.revenueGrowth >= 0 ? <TrendingUp size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(stats.revenueGrowth)}%
              </div>
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Revenue</p>
            <h3 className="text-3xl font-black text-white">{formatPrice(stats.revenue, currency, exchangeRates)}</h3>
          </div>

          {/* New Users */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                <Users size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${stats.usersGrowth >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {stats.usersGrowth >= 0 ? <TrendingUp size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(stats.usersGrowth)}%
              </div>
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">New Users</p>
            <h3 className="text-3xl font-black text-white">{stats.newUsers}</h3>
          </div>

          {/* Beat Uploads */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-500">
                <Music size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${stats.uploadsGrowth >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {stats.uploadsGrowth >= 0 ? <TrendingUp size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(stats.uploadsGrowth)}%
              </div>
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Beat Uploads</p>
            <h3 className="text-3xl font-black text-white">{stats.beatUploads}</h3>
          </div>

          {/* Conversion Rate */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500">
                <Activity size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${stats.conversionsGrowth >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {stats.conversionsGrowth >= 0 ? <TrendingUp size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(stats.conversionsGrowth)}%
              </div>
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Conversion Rate</p>
            <h3 className="text-3xl font-black text-white">{stats.conversions}%</h3>
          </div>
        </div>

        {/* Main Revenue Chart */}
        <section className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-8 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <TrendingUp size={16} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Revenue Performance</h2>
              </div>
              <p className="text-zinc-500 text-xs font-medium">Daily revenue breakdown for the selected period</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Period Average</p>
                <p className="text-lg font-black text-white">
                  {formatPrice(
                    revenueData.length > 0 
                      ? revenueData.reduce((acc, curr) => acc + curr.revenue, 0) / revenueData.length 
                      : 0, 
                    currency, 
                    exchangeRates
                  )}
                </p>
              </div>
              <div className="w-px h-10 bg-zinc-800"></div>
              <div className="flex flex-col items-end">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Period High</p>
                <p className="text-lg font-black text-primary">
                  {formatPrice(
                    revenueData.length > 0 
                      ? Math.max(...revenueData.map(d => d.revenue)) 
                      : 0, 
                    currency, 
                    exchangeRates
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full relative z-10">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20 backdrop-blur-sm rounded-3xl border border-zinc-800/50">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Calculating data...</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D9FF00" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D9FF00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke="#27272a" 
                  />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                    minTickGap={30}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
                            <p className="text-xl font-black text-white">
                              {formatPrice(payload[0].value as number, currency, exchangeRates)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#D9FF00" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Top Selling Beats */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <BarChart3 size={20} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Top Selling Beats</h2>
              </div>
            </div>

            <div className="space-y-4">
              {stats.topBeats.length > 0 ? (
                stats.topBeats.map((beat, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl group hover:border-primary/30 transition-all">
                    <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-zinc-500 text-xs">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate">{beat.title}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{beat.artist}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white">{beat.sales} Sales</p>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{formatPrice(beat.revenue, currency, exchangeRates)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-zinc-600 font-medium">
                  No sales data available for this period.
                </div>
              )}
            </div>
          </section>

          {/* Payment Method Breakdown */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <DollarSign size={20} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">Payment Gateways</h2>
            </div>

            <div className="h-[250px] w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData}>
                  <XAxis 
                    dataKey="method" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'rgba(217, 255, 0, 0.05)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
                            <p className="text-sm font-black text-white">
                              {formatPrice(payload[0].value as number, currency, exchangeRates)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 8, 8]}>
                    {methodData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.method === 'Stripe' ? '#6366f1' : 
                          entry.method === 'Paypal' ? '#3b82f6' : 
                          '#ec4899'
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {methodData.map((data, idx) => (
                <div key={idx} className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{data.method}</p>
                  <p className="text-xs font-black text-white">{formatPrice(data.amount, currency, exchangeRates)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* System Audit Logs */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                  <Shield size={20} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">System Audit Log</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live</span>
              </div>
            </div>

            <div className="space-y-4">
              {stats.auditLogs.length > 0 ? (
                stats.auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 p-4 border-l-2 border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/40 transition-all group">
                    <div className="mt-1">
                      <div className="p-2 bg-zinc-900 rounded-lg text-zinc-500 group-hover:text-primary transition-colors">
                        <Clock size={14} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-black text-zinc-300 uppercase tracking-wide">
                          {log.profiles?.display_name || 'System Action'}
                        </p>
                        <span className="text-[10px] text-zinc-600 font-medium">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-snug">
                        {log.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          log.type === 'submission_status' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {log.type}
                        </span>
                        {log.link && (
                          <a href={log.link} className="text-[8px] font-black uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors flex items-center gap-1">
                            Details <ExternalLink size={8} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-zinc-600 font-medium">
                  No system logs available.
                </div>
              )}
            </div>
            
            <button className="w-full mt-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all">
              Download Full Audit CSV
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

function ExternalLink({ size }: { size: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}
