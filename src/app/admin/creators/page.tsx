"use client";

import Header from '@/components/Header';
import { Check, X, User, Shield, Search, ExternalLink, Mail, Calendar, Filter, Eye, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import StatusModal from '@/components/StatusModal';
import VerifiedCheck from '@/components/VerifiedCheck';

export default function AdminCreatorsPage() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'loading',
    title: '',
    message: ''
  });
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    id: string;
    userId: string;
    reason: string;
  }>({
    isOpen: false,
    id: '',
    userId: '',
    reason: ''
  });

  useEffect(() => {
    fetchVerifications();
  }, [filter]);

  async function fetchVerifications() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('creator_verifications')
        .select('*, profiles(display_name, username, email, avatar_url)')
        .eq('status', filter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (id: string, userId: string) => {
    try {
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: 'Processing...',
        message: 'Updating creator verification status...'
      });

      // 1. Update verification status
      const { error: vError } = await supabase
        .from('creator_verifications')
        .update({ 
          status: 'approved', 
          processed_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (vError) throw vError;

      // 2. Update user profile to 'creator' role and mark as verified
      const { error: pError } = await supabase
        .from('profiles')
        .update({ 
          role: 'creator',
          is_verified: true 
        })
        .eq('id', userId);
      
      if (pError) throw pError;

      // 3. Notify user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'submission_status',
        title: 'Account Verified!',
        message: 'Congratulations! Your creator verification has been approved. You can now upload beats.',
        link: '/dashboard/creator'
      });

      setVerifications(verifications.filter(v => v.id !== id));
      setSelectedVerification(null);
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Approved!',
        message: 'Producer has been successfully verified.'
      });
    } catch (error: any) {
      console.error('Error approving verification:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to approve verification.'
      });
    }
  };

  const handleReject = async () => {
    const { id, userId, reason } = rejectModal;
    if (!reason.trim()) return;

    try {
      setRejectModal(prev => ({ ...prev, isOpen: false }));
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: 'Processing...',
        message: 'Rejecting creator verification...'
      });

      const { error } = await supabase
        .from('creator_verifications')
        .update({ 
          status: 'rejected', 
          admin_notes: reason,
          processed_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;

      // Notify user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'submission_status',
        title: 'Verification Rejected',
        message: `Your creator verification was rejected. Reason: ${reason}`,
        link: '/dashboard/settings/verification'
      });

      setVerifications(verifications.filter(v => v.id !== id));
      setSelectedVerification(null);

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Rejected',
        message: 'The verification request has been rejected.'
      });
    } catch (error: any) {
      console.error('Error rejecting verification:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to reject verification.'
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
              Creator <span className="text-primary">Verification</span>
            </h1>
            <p className="text-zinc-500 font-medium">Review and manage producer identity verifications</p>
          </div>
          
          <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-2xl p-1">
            {['pending', 'approved', 'rejected'].map((status) => (
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-[32px] overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/50">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Producer</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Date</th>
                      <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-8 py-20 text-center">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </td>
                      </tr>
                    ) : verifications.length > 0 ? (
                      verifications.map((v) => (
                        <tr 
                          key={v.id} 
                          className={`hover:bg-zinc-800/30 transition-colors cursor-pointer group ${selectedVerification?.id === v.id ? 'bg-primary/5' : ''}`}
                          onClick={() => setSelectedVerification(v)}
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-800 relative">
                                <Image 
                                  src={v.profiles?.avatar_url || "https://placehold.co/100x100"} 
                                  alt={v.full_name} 
                                  fill 
                                  className="object-cover"
                                />
                              </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-white group-hover:text-primary transition-colors">{v.full_name}</p>
                                {v.profiles?.is_verified && <VerifiedCheck size={14} />}
                              </div>
                              <p className="text-xs text-zinc-500 font-medium">@{v.profiles?.username}</p>
                            </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-xs font-bold text-zinc-400">
                              {new Date(v.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button className="p-2 bg-zinc-800 rounded-xl text-zinc-400 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-8 py-20 text-center text-zinc-500">
                          No {filter} verifications found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detail Section */}
          <div className="lg:col-span-1">
            {selectedVerification ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] p-8 sticky top-[100px] backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Verification Info</h2>
                  <button 
                    onClick={() => setSelectedVerification(null)}
                    className="p-2 text-zinc-500 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Full Name</p>
                    <p className="text-white font-bold">{selectedVerification.full_name}</p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Email Address</p>
                    <p className="text-white font-bold flex items-center gap-2">
                      <Mail size={14} className="text-primary" />
                      {selectedVerification.profiles?.email}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">ID Document</p>
                      <div className="aspect-[3/4] rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden relative group">
                        {selectedVerification.id_document_url ? (
                          <>
                            <Image 
                              src={selectedVerification.id_document_url} 
                              alt="ID Document" 
                              fill 
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button className="p-2 bg-white text-black rounded-full">
                                <ExternalLink size={16} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-600">
                            <Shield size={24} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Selfie Verification</p>
                      <div className="aspect-[3/4] rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden relative group">
                        {selectedVerification.selfie_url ? (
                          <>
                            <Image 
                              src={selectedVerification.selfie_url} 
                              alt="Selfie" 
                              fill 
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button className="p-2 bg-white text-black rounded-full">
                                <ExternalLink size={16} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-600">
                            <User size={24} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {filter === 'pending' && (
                    <div className="pt-6 border-t border-zinc-800 grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => handleApprove(selectedVerification.id, selectedVerification.user_id)}
                        className="flex items-center justify-center gap-2 bg-primary text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all"
                      >
                        <Check size={16} strokeWidth={3} /> Approve
                      </button>
                      <button 
                        onClick={() => setRejectModal({
                          isOpen: true,
                          id: selectedVerification.id,
                          userId: selectedVerification.user_id,
                          reason: ''
                        })}
                        className="flex items-center justify-center gap-2 bg-zinc-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all"
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  )}

                  {selectedVerification.admin_notes && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Rejection Reason</p>
                      <p className="text-sm text-zinc-400">{selectedVerification.admin_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-[32px] p-12 text-center h-[400px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center text-zinc-700 mb-4 border border-zinc-800">
                  <Shield size={32} />
                </div>
                <h3 className="text-zinc-500 font-black uppercase tracking-widest text-xs">Select a verification request</h3>
                <p className="text-zinc-600 text-xs mt-2">Click on a producer in the list to view their verification details.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reject Reason Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRejectModal(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white uppercase">Rejection Reason</h3>
              <button onClick={() => setRejectModal(prev => ({ ...prev, isOpen: false }))} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-zinc-400 text-sm mb-6">Please provide a reason why this verification request is being rejected. This will be sent to the user.</p>
            
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. ID document is expired or blurry..."
              className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-primary transition-colors resize-none mb-6"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRejectModal(prev => ({ ...prev, isOpen: false }))}
                className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-zinc-400 hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectModal.reason.trim()}
                className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
    </div>
  );
}
