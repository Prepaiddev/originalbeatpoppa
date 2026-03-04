"use client";

import Header from '@/components/Header';
import { DollarSign, TrendingUp, Calendar, ArrowUpRight, X, CheckCircle, CreditCard, Send, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import StatusModal from '@/components/StatusModal';

export default function EarningsPage() {
  const { user, profile } = useAuthStore();
  const { currency, exchangeRates } = useUIStore();
  const [earnings, setEarnings] = useState({ total: 0, thisMonth: 0, pending: 0, available: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState(profile?.payout_method || 'paypal');
  const [payoutDetails, setPayoutDetails] = useState(profile?.payout_details || '');
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusModal, setStatusModal] = useState({ 
    isOpen: false, 
    type: 'success' as 'success' | 'error' | 'loading' | 'auth',
    title: '', 
    message: '' 
  });

  useEffect(() => {
    async function fetchEarnings() {
      if (!user) return;
      try {
        // Fetch sold beats
        const { data: soldItems, error } = await supabase
          .from('order_items')
          .select(`
            price,
            created_at,
            beats!inner(artist_id)
          `)
          .eq('beats.artist_id', user.id);

        if (error) throw error;

        // Fetch completed withdrawals to subtract from total
        const { data: completedWithdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('creator_id', user.id)
          .eq('status', 'completed');
        
        const withdrawnTotal = completedWithdrawals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

        // Fetch pending withdrawals
        const { data: pendingWithdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('creator_id', user.id)
          .eq('status', 'pending');
        
        const pendingTotal = pendingWithdrawals?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

        const totalRevenue = soldItems?.reduce((sum, item) => sum + item.price, 0) || 0;
        
        // Calculate this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = soldItems
          ?.filter(item => new Date(item.created_at) >= startOfMonth)
          .reduce((sum, item) => sum + item.price, 0) || 0;

        // Available for Payout = Total - (Completed + Pending)
        const available = Math.max(0, totalRevenue - withdrawnTotal - pendingTotal);

        setEarnings({ 
          total: totalRevenue, 
          thisMonth, 
          pending: pendingTotal,
          available: available 
        });
        setTransactions(soldItems || []);
      } catch (error) {
        console.error('Error fetching earnings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEarnings();
  }, [user?.id]);

  const handleSavePaymentSettings = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          payout_method: payoutMethod,
          payout_details: payoutDetails
        })
        .eq('id', user.id);

      if (error) throw error;

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'Your payment details have been updated.'
      });
      setIsEditingPayment(false);
    } catch (err: any) {
      console.error('Save payment error:', err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to update payment details.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!user || earnings.available < 50) return;
    if (!payoutDetails.trim()) {
      alert('Please provide your payout details.');
      return;
    }

    setSubmitting(true);
    setStatusModal({
      isOpen: true,
      type: 'loading',
      title: 'Processing Request',
      message: 'Submitting your withdrawal request...'
    });

    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          creator_id: user.id,
          amount: earnings.available,
          payment_method: payoutMethod,
          payment_details: { details: payoutDetails },
          status: 'pending'
        });

      if (error) throw error;

      // Notify creator
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'withdrawal_status',
        title: 'Withdrawal Requested',
        message: `Your request for ${formatPrice(earnings.available, currency, exchangeRates)} is being processed.`,
        link: '/dashboard/creator/earnings'
      });

      // Notify admin
      await supabase.from('admin_notifications').insert({
        type: 'withdrawal_request',
        title: 'New Withdrawal Request',
        message: `${profile?.display_name || user.email} requested a payout of ${formatPrice(earnings.available, currency, exchangeRates)}.`,
        link: '/admin/payouts'
      });

      setPayoutModal(false);
      setPayoutDetails('');
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Request Sent!',
        message: 'Your withdrawal request has been submitted successfully.'
      });

      // Refresh data
      window.location.reload();
    } catch (err: any) {
      console.error('Payout error:', err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Request Failed',
        message: err.message || 'Failed to submit request.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[80px] max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Earnings</h1>
          <p className="text-zinc-400">Track your revenue and payouts</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Revenue</p>
                <h3 className="text-3xl font-bold text-white mt-1">{formatPrice(earnings.total, currency, exchangeRates)}</h3>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                <DollarSign size={24} />
              </div>
            </div>
            <span className="text-green-500 text-xs font-medium flex items-center gap-1">
              <TrendingUp size={12} /> +{formatPrice(earnings.thisMonth, currency, exchangeRates)} this month
            </span>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Available for Payout</p>
                <h3 className="text-3xl font-bold text-white mt-1">{formatPrice(earnings.available, currency, exchangeRates)}</h3>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <Calendar size={24} />
              </div>
            </div>
            <button 
              onClick={() => setPayoutModal(true)}
              disabled={earnings.available < 50}
              className="text-blue-500 text-xs font-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {earnings.available < 50 ? `Min ${formatPrice(50, currency, exchangeRates)} for Payout` : 'Request Payout Now'}
            </button>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Pending Clearance</p>
                <h3 className="text-3xl font-bold text-white mt-1">{formatPrice(earnings.pending, currency, exchangeRates)}</h3>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                <ArrowUpRight size={24} />
              </div>
            </div>
            <span className="text-zinc-500 text-xs">
              Funds clear in 2-3 days
            </span>
          </div>
        </div>

        {/* Payment Settings Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Payment Details</h3>
                <p className="text-zinc-500 text-sm font-medium">How you receive your payouts</p>
              </div>
            </div>
            {!isEditingPayment ? (
              <button 
                onClick={() => setIsEditingPayment(true)}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all"
              >
                Edit Details
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditingPayment(false)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase tracking-widest text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSavePaymentSettings}
                  disabled={submitting}
                  className="px-6 py-3 bg-primary hover:bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                  Save Details
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Payout Method</label>
              <select 
                disabled={!isEditingPayment}
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:outline-none focus:border-primary transition-all text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="paypal">PayPal</option>
                <option value="bank">Bank Transfer</option>
                <option value="paystack">Paystack</option>
                <option value="stripe">Stripe Connect</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Payout Details</label>
              <input 
                disabled={!isEditingPayment}
                type="text"
                value={payoutDetails}
                onChange={(e) => setPayoutDetails(e.target.value)}
                placeholder={payoutMethod === 'paypal' ? 'PayPal Email Address' : 'Account Number / Detail'}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:outline-none focus:border-primary transition-all text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          
          {!isEditingPayment && !payoutDetails && (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-4 text-yellow-500">
              <AlertCircle size={20} />
              <p className="text-sm font-bold uppercase tracking-wide">Please set up your payment details to receive payouts.</p>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="font-bold text-lg">Transaction History</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No transactions yet. Upload more beats to start earning!
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">Description</th>
                  <th className="px-6 py-4 font-bold text-right">Amount</th>
                  <th className="px-6 py-4 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {transactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-zinc-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">Beat Sale</td>
                    <td className="px-6 py-4 text-right font-bold text-green-500">+{formatPrice(tx.price, currency, exchangeRates)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
                        Pending
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Payout Request Modal */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPayoutModal(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setPayoutModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
              <CreditCard size={32} />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 uppercase">Request Payout</h2>
            <p className="text-zinc-400 text-sm mb-8">
              Withdraw your available balance of <span className="text-white font-bold">{formatPrice(earnings.available, currency, exchangeRates)}</span>.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Payout Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {['paypal', 'bank'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPayoutMethod(method)}
                      className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                        payoutMethod === method 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  {payoutMethod === 'paypal' ? 'PayPal Email Address' : 'Bank Account Details'}
                </label>
                <textarea
                  value={payoutDetails}
                  onChange={(e) => setPayoutDetails(e.target.value)}
                  placeholder={payoutMethod === 'paypal' ? 'e.g., your@email.com' : 'Bank Name, Account Number, SWIFT...'}
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-primary outline-none resize-none min-h-[100px]"
                />
              </div>
              
              <button
                onClick={handleRequestPayout}
                disabled={submitting || !payoutDetails.trim()}
                className="w-full bg-primary text-white font-black py-5 rounded-2xl hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    Confirm Request
                  </>
                )}
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
      />
    </div>
  );
}
