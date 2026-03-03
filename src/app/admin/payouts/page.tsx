"use client";

import Header from '@/components/Header';
import { Check, X, DollarSign, Clock, AlertCircle, Search, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import StatusModal from '@/components/StatusModal';

export default function AdminPayoutsPage() {
  const { currency, exchangeRates } = useUIStore();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [stats, setStats] = useState({
    pending: 0,
    processed: 0,
    balance: 0
  });
  const [statusModal, setStatusModal] = useState({ 
    isOpen: false, 
    type: 'success' as 'success' | 'error' | 'info' | 'warning' | 'loading' | 'auth',
    title: '', 
    message: '',
    onAction: undefined as (() => void) | undefined
  });
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    payoutId: '',
    creatorId: '',
    reason: ''
  });

  useEffect(() => {
    fetchPayouts();
    fetchStats();
  }, [filter]);

  async function fetchStats() {
    try {
      // 1. Pending Total
      const { data: pendingData } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('status', 'pending');
      
      const pendingTotal = pendingData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      // 2. Processed (30d)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: processedData } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('status', 'completed')
        .gte('processed_at', thirtyDaysAgo.toISOString());
      
      const processedTotal = processedData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      // 3. Platform Revenue (Sum of all orders * 0.20 commission for example)
      // This is an estimation, you might have a better way to calculate this
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount');
      
      const totalVolume = ordersData?.reduce((sum, item) => sum + Number(item.total_amount), 0) || 0;
      const platformBalance = totalVolume * 0.15; // 15% platform fee

      setStats({
        pending: pendingTotal,
        processed: processedTotal,
        balance: platformBalance
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  async function fetchPayouts() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*, profiles(display_name, username, email)')
        .eq('status', filter)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Withdrawals table error:', error.message);
        setPayouts([]);
      } else {
        setPayouts(data || []);
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleApproveAll = async () => {
    const pendingPayouts = payouts.filter(p => p.status === 'pending');
    if (pendingPayouts.length === 0) return;

    try {
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: 'Processing Bulk Payout',
        message: `Releasing ${pendingPayouts.length} pending withdrawal requests...`,
        onAction: undefined
      });

      const processedAt = new Date().toISOString();
      const ids = pendingPayouts.map(p => p.id);

      // Update all pending withdrawals to completed
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({ status: 'completed', processed_at: processedAt })
        .in('id', ids);
      
      if (updateError) throw updateError;

      // Create notifications for all creators in bulk
      const notifications = pendingPayouts.map(p => ({
        user_id: p.creator_id,
        type: 'withdrawal_status',
        title: 'Withdrawal Approved',
        message: 'Your withdrawal request has been approved and processed.',
        link: '/dashboard/creator/wallet'
      }));

      const { error: notifyError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifyError) {
        console.warn('Failed to send bulk notifications:', notifyError);
        // We don't throw here because the payouts were already updated
      }

      setPayouts(payouts.filter(p => !ids.includes(p.id)));
      fetchStats();
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Bulk Payout Released',
        message: `Successfully processed ${pendingPayouts.length} withdrawal requests.`,
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    } catch (error) {
      console.error('Error processing bulk payout:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Bulk Payout Failed',
        message: 'Failed to process bulk payout. Please try again.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    }
  };

  const handleApprove = async (id: string, creatorId: string) => {
    try {
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: 'Processing Payout',
        message: 'Approving withdrawal and notifying creator...',
        onAction: undefined
      });

      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;

      // Create notification for the creator
      await supabase.from('notifications').insert({
        user_id: creatorId,
        type: 'withdrawal_status',
        title: 'Withdrawal Approved',
        message: 'Your withdrawal request has been approved and processed.',
        link: '/dashboard/creator/wallet'
      });

      setPayouts(payouts.filter(p => p.id !== id));
      fetchStats();
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Payout Released',
        message: 'The withdrawal has been marked as completed.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    } catch (error) {
      console.error('Error approving payout:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Payout Failed',
        message: 'Failed to approve payout. Please try again.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    }
  };

  const handleReject = async () => {
    const { payoutId, creatorId, reason } = rejectModal;
    if (!reason.trim()) return;

    try {
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: 'Rejecting Payout',
        message: 'Updating request status and notifying creator...',
        onAction: undefined
      });

      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected', admin_notes: reason, processed_at: new Date().toISOString() })
        .eq('id', payoutId);
      
      if (error) throw error;

      // Create notification for the creator
      await supabase.from('notifications').insert({
        user_id: creatorId,
        type: 'withdrawal_status',
        title: 'Withdrawal Rejected',
        message: `Your withdrawal request was rejected. Reason: ${reason}`,
        link: '/dashboard/creator/wallet'
      });

      setPayouts(payouts.filter(p => p.id !== payoutId));
      setRejectModal({ ...rejectModal, isOpen: false, reason: '' });
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Payout Rejected',
        message: 'The withdrawal request has been rejected.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    } catch (error) {
      console.error('Error rejecting payout:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Rejection Failed',
        message: 'Failed to reject payout. Please try again.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">
              Payout <span className="text-primary">Approvals</span>
            </h1>
            <p className="text-zinc-500 font-medium">Process and manage creator withdrawal requests</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-2xl p-1">
              {['pending', 'completed', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    filter === status 
                      ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {filter === 'pending' && payouts.length > 0 && (
              <button
                onClick={handleApproveAll}
                className="flex items-center gap-2 px-6 py-3.5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-white/5"
              >
                <CheckCircle2 size={16} /> Release All Pending
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Pending</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black text-white tabular-nums">{formatPrice(stats.pending, currency, exchangeRates)}</h3>
              <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500">
                <Clock size={20} />
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Processed (30d)</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black text-white tabular-nums">{formatPrice(stats.processed, currency, exchangeRates)}</h3>
              <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">System Balance</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black text-white tabular-nums">{formatPrice(stats.balance, currency, exchangeRates)}</h3>
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <DollarSign size={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[32px] overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Request Details</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Creator</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Method</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Amount</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Verifying Treasury...</p>
                      </div>
                    </td>
                  </tr>
                ) : payouts.length > 0 ? (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-white mb-1">#{payout.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                            Requested {new Date(payout.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-black text-zinc-500">
                            {payout.profiles?.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-white group-hover:text-primary transition-colors">
                              {payout.profiles?.display_name || 'Creator'}
                            </p>
                            <p className="text-xs text-zinc-500 font-medium">@{payout.profiles?.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-zinc-300 uppercase tracking-wider">{payout.payment_method || 'N/A'}</span>
                          <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">
                            {payout.payment_details?.details || payout.profiles?.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="text-xl font-black text-white tabular-nums">{formatPrice(payout.amount, currency, exchangeRates)}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          {payout.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleApprove(payout.id, payout.creator_id)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all active:scale-95 shadow-lg shadow-primary/10"
                              >
                                <Check size={14} strokeWidth={3} /> Release
                              </button>
                              <button 
                                onClick={() => setRejectModal({ isOpen: true, payoutId: payout.id, creatorId: payout.creator_id, reason: '' })}
                                className="p-2.5 bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400 rounded-xl transition-all active:scale-95"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}
                          {payout.status !== 'pending' && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              payout.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {payout.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-zinc-500">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800">
                          <DollarSign size={32} className="text-zinc-700" />
                        </div>
                        <p className="font-black uppercase tracking-widest text-sm">No {filter} requests found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejection Modal */}
        {rejectModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRejectModal({ ...rejectModal, isOpen: false })} />
            <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                <XCircle size={32} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase">Reject Request</h3>
              <p className="text-zinc-400 text-sm mb-6 font-medium">Please provide a reason for rejecting this withdrawal request. This will be visible to the creator.</p>
              
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="e.g., Invalid payment details, suspicious activity..."
                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-primary min-h-[120px] mb-6 resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                  className="flex-1 py-4 rounded-2xl bg-zinc-800 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectModal.reason.trim()}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}

        <StatusModal 
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
          type={statusModal.type}
          title={statusModal.title}
          message={statusModal.message}
          onAction={statusModal.onAction}
        />
      </main>
    </div>
  );
}

