"use client";

import Header from '@/components/Header';
import { Play, Check, X, Search, Filter, Music, ExternalLink, Trash2, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { supabase } from '@/lib/supabase/client';
import { usePlayerStore } from '@/store/usePlayerStore';
import StatusModal from '@/components/StatusModal';

export default function AdminBeatsPage() {
  const { currency, exchangeRates } = useUIStore();
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusModal, setStatusModal] = useState({ 
    isOpen: false, 
    type: 'success' as 'success' | 'error' | 'loading' | 'auth',
    title: '', 
    message: '',
    onAction: undefined as (() => void) | undefined
  });
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    beatId: '',
    creatorId: '',
    reason: ''
  });
  const { play } = usePlayerStore();

  useEffect(() => {
    fetchBeats();
  }, [statusFilter]);

  async function fetchBeats() {
    try {
      setLoading(true);
      let query = supabase
        .from('beats')
        .select('*, profiles(display_name, username)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBeats(data || []);
    } catch (error) {
      console.error('Error fetching beats:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (beatId: string, creatorId: string) => {
    try {
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: 'Approving Beat',
        message: 'Updating beat status and notifying creator...',
        onAction: undefined
      });

      const { error } = await supabase
        .from('beats')
        .update({ status: 'approved' })
        .eq('id', beatId);
      
      if (error) throw error;

      // Notify creator
      await supabase.from('notifications').insert({
        user_id: creatorId,
        type: 'submission_status',
        title: 'Beat Approved!',
        message: 'Your beat has been approved and is now live on the marketplace.',
        link: `/beat/${beatId}`
      });

      setBeats(beats.filter(b => b.id !== beatId));
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Beat Approved',
        message: 'The beat is now live on the platform.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    } catch (error) {
      console.error('Error approving beat:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Approval Failed',
        message: 'Failed to approve beat. Please try again.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    }
  };

  const handleReject = async () => {
    const { beatId, creatorId, reason } = rejectModal;
    if (!reason.trim()) return;

    try {
      setStatusModal({
        isOpen: true,
        type: 'loading',
        title: 'Rejecting Beat',
        message: 'Updating beat status and notifying creator...',
        onAction: undefined
      });

      const { error } = await supabase
        .from('beats')
        .update({ status: 'rejected' })
        .eq('id', beatId);
      
      if (error) throw error;

      // Notify creator
      await supabase.from('notifications').insert({
        user_id: creatorId,
        type: 'submission_status',
        title: 'Beat Rejected',
        message: `Your beat submission was rejected. Reason: ${reason}`,
        link: '/dashboard/creator/beats'
      });

      setBeats(beats.filter(b => b.id !== beatId));
      setRejectModal({ ...rejectModal, isOpen: false });
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Beat Rejected',
        message: 'The beat has been rejected and the creator has been notified.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    } catch (error) {
      console.error('Error rejecting beat:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Rejection Failed',
        message: 'Failed to reject beat. Please try again.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    }
  };

  const filteredBeats = beats.filter(beat => 
    beat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beat.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beat.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePreview = (beat: any) => {
    play({
      id: beat.id,
      title: beat.title,
      artist: beat.profiles?.display_name || 'Unknown',
      audioUrl: beat.audio_url,
      coverUrl: beat.cover_url,
      price: beat.price
    });
  };

  const handleDelete = async (beatId: string) => {
    if (!confirm('Are you sure you want to delete this beat? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('beats')
        .delete()
        .eq('id', beatId);
      
      if (error) throw error;
      setBeats(beats.filter(b => b.id !== beatId));
    } catch (error) {
      console.error('Error deleting beat:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">
              Content <span className="text-primary">Moderation</span>
            </h1>
            <p className="text-zinc-500 font-medium">Review and manage platform beat uploads</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search by title or creator..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-6 text-sm focus:border-primary outline-none w-full md:w-80 transition-all placeholder:text-zinc-600"
              />
            </div>
            
            <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-2xl p-1">
              {['all', 'pending', 'approved', 'flagged'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    statusFilter === status 
                      ? 'bg-primary text-black' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Scanning Catalog...</p>
              </div>
            </div>
          ) : filteredBeats.length > 0 ? (
            filteredBeats.map((beat) => (
              <div key={beat.id} className="group relative bg-zinc-900/40 border border-zinc-800/50 hover:border-primary/30 p-5 rounded-[28px] transition-all hover:translate-x-1 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Artwork */}
                  <div className="relative w-24 h-24 flex-shrink-0 group/cover">
                    <img 
                      src={beat.cover_url || '/placeholder-cover.jpg'} 
                      alt="" 
                      className="w-full h-full object-cover rounded-2xl border border-zinc-800 shadow-2xl"
                    />
                    <button 
                      onClick={() => handlePreview(beat)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity rounded-2xl"
                    >
                      <Play size={24} className="text-primary fill-primary" />
                    </button>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-center md:text-left min-w-0">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                      <h3 className="font-black text-xl text-white truncate group-hover:text-primary transition-colors">
                        {beat.title}
                      </h3>
                      <a href={`/beat/${beat.id}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    
                    <p className="text-sm text-zinc-500 font-bold uppercase tracking-tight mb-3">
                      by <span className="text-zinc-300">@{beat.profiles?.username || 'unknown'}</span>
                    </p>
                    
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg border border-zinc-700/50">
                        {beat.genre || 'No Genre'}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg border border-zinc-700/50">
                        {beat.bpm || '0'} BPM
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg border border-zinc-700/50">
                        {beat.key || 'No Key'}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col items-center md:items-end gap-1 px-4 border-l border-zinc-800/50">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Clock size={12} />
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {new Date(beat.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xl font-black text-white">
                      {formatPrice(beat.price, currency, exchangeRates)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pl-4 border-l border-zinc-800/50">
                    {beat.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleApprove(beat.id, beat.artist_id)}
                          className="flex items-center gap-2 px-5 py-3 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all active:scale-95 shadow-lg shadow-primary/10"
                        >
                          <Check size={18} strokeWidth={3} /> Approve
                        </button>
                        <button 
                          onClick={() => setRejectModal({ isOpen: true, beatId: beat.id, creatorId: beat.artist_id, reason: '' })}
                          className="p-3 bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400 rounded-2xl transition-all active:scale-95"
                          title="Reject Submission"
                        >
                          <X size={20} />
                        </button>
                      </>
                    )}
                    {beat.status === 'approved' && (
                      <span className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                        Live
                      </span>
                    )}
                    {beat.status === 'rejected' && (
                      <span className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                        Rejected
                      </span>
                    )}
                    <button 
                      onClick={() => handleDelete(beat.id)}
                      className="p-3 bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400 rounded-2xl transition-all active:scale-95 ml-2"
                      title="Delete Permanently"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-zinc-500 bg-zinc-900/20 rounded-[32px] border border-zinc-800 border-dashed">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800">
                  <Music size={32} className="text-zinc-700" />
                </div>
                <p className="font-black uppercase tracking-widest text-sm">No beats found in the database.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setRejectModal({ ...rejectModal, isOpen: false })} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-[32px] p-10 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-8 border border-red-500/20">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2">Reject Submission</h2>
            <p className="text-zinc-500 font-medium mb-8">Please provide a reason for rejecting this beat. The creator will be notified.</p>
            
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="e.g., Low audio quality, missing metadata, etc."
              className="w-full bg-black border border-zinc-800 rounded-2xl p-6 text-zinc-300 focus:border-red-500 outline-none transition-all h-32 mb-8 resize-none placeholder:text-zinc-700"
            />

            <div className="flex gap-4">
              <button
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectModal.reason.trim()}
                className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onAction={statusModal.onAction}
      />
    </div>
  );
}

