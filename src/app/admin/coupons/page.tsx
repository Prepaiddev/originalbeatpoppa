"use client";

import Header from '@/components/Header';
import { Tag, Plus, Trash2, Check, X, Search, Calendar, Hash, Percent, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import StatusModal from '@/components/StatusModal';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [statusModal, setStatusModal] = useState({ 
    isOpen: false, 
    type: 'success' as 'success' | 'error' | 'loading' | 'auth',
    title: '', 
    message: '',
    onAction: undefined as (() => void) | undefined
  });

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_percent: 10,
    expires_at: '',
    max_uses: '',
    description: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/coupons', { method: 'GET' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch coupons');
      setCoupons(json?.coupons || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount_percent) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCoupon.code,
          discount_percent: newCoupon.discount_percent,
          expires_at: newCoupon.expires_at || null,
          max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
          description: newCoupon.description
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create coupon');

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Coupon Created',
        message: `Coupon ${newCoupon.code.toUpperCase()} has been created successfully.`,
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });

      setIsAdding(false);
      setNewCoupon({
        code: '',
        discount_percent: 10,
        expires_at: '',
        max_uses: '',
        description: ''
      });
      fetchCoupons();
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Creation Failed',
        message: error.message || 'Failed to create coupon. Please check if the code already exists.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update coupon');
      setCoupons(coupons.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    } catch (error) {
      console.error('Error toggling coupon status:', error);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete coupon');
      setCoupons(coupons.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting coupon:', error);
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Tag size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                Coupon <span className="text-primary">Management</span>
              </h1>
            </div>
            <p className="text-zinc-500 font-medium">Create and manage promotional discount codes</p>
          </div>
          
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm"
          >
            {isAdding ? <X size={20} /> : <Plus size={20} />}
            {isAdding ? 'Cancel' : 'Create Coupon'}
          </button>
        </div>

        {isAdding && (
          <div className="mb-12 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Coupon Code</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                    placeholder="SUMMER2024"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Discount Percent</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={newCoupon.discount_percent}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_percent: parseInt(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Expires At (Optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="datetime-local" 
                    value={newCoupon.expires_at}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Max Uses (Optional)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="number" 
                    min="1"
                    value={newCoupon.max_uses}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                    placeholder="100"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Description</label>
                <input 
                  type="text" 
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  placeholder="20% off for summer sale"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="md:col-span-3 pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Plus size={20} />}
                  Create Promotion
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search coupons..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-2xl pl-12 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                {filteredCoupons.length} Total Coupons
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Code</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Discount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Usage</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Expires</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading && coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="inline-block w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading coupons...</p>
                    </td>
                  </tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Tag size={32} className="text-zinc-600" />
                      </div>
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No coupons found</p>
                    </td>
                  </tr>
                ) : filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white group-hover:text-primary transition-colors">{coupon.code}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{coupon.description || 'No description'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-black rounded-full">
                        {coupon.discount_percent}% OFF
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white tabular-nums">
                          {coupon.used_count} / {coupon.max_uses || '∞'}
                        </span>
                        {coupon.max_uses && (
                          <div className="w-24 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${Math.min(100, (coupon.used_count / coupon.max_uses) * 100)}%` }} 
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-zinc-400">
                        {coupon.expires_at ? format(new Date(coupon.expires_at), 'MMM d, yyyy') : 'Never'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(coupon.id, coupon.is_active)}
                        className={clsx(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                          coupon.is_active 
                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                        )}
                      >
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteCoupon(coupon.id)}
                        className="p-2 text-zinc-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <StatusModal 
        isOpen={statusModal.isOpen}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onAction={statusModal.onAction}
      />
    </div>
  );
}
