"use client";

import Header from '@/components/Header';
import { MessageSquare, Trash2, Star, Search, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import StatusModal from '@/components/StatusModal';
import clsx from 'clsx';
import { format } from 'date-fns';
import AdminGuard from '@/components/admin/AdminGuard';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'pending' | 'flagged'>('all');
  const [statusModal, setStatusModal] = useState({ 
    isOpen: false, 
    type: 'success' as 'success' | 'error' | 'loading' | 'auth',
    title: '', 
    message: '',
    onAction: undefined as (() => void) | undefined
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:reviewer_id(display_name, username, avatar_url),
          beats:beat_id(title),
          bundles:bundle_id(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  const deleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReviews(reviews.filter(r => r.id !== id));
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Review Deleted',
        message: 'The review has been permanently removed from the platform.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    } catch (error: any) {
      console.error('Error deleting review:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Deletion Failed',
        message: error.message || 'Failed to delete the review. Please try again.',
        onAction: () => setStatusModal({ ...statusModal, isOpen: false })
      });
    }
  };

  const updateReviewStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setReviews(reviews.map(r => r.id === id ? { ...r, status } : r));
    } catch (error) {
      console.error('Error updating review status:', error);
    }
  };

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = 
      r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.profiles?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.beats?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.bundles?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || r.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black pb-24">
        <Header />
        
        <main className="pt-[100px] max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <MessageSquare size={24} />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">
                  Review <span className="text-primary">Moderation</span>
                </h1>
              </div>
              <p className="text-zinc-500 font-medium">Manage and moderate platform reviews and ratings</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Search reviews, users, or items..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl pl-12 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              
              <div className="flex items-center gap-2 bg-black/50 p-1 rounded-xl border border-zinc-800">
                {(['all', 'published', 'pending', 'flagged'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      filterStatus === status 
                        ? "bg-primary text-white" 
                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/30">
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Reviewer</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Target Item</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rating & Comment</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {loading && reviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading reviews...</p>
                      </td>
                    </tr>
                  ) : filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare size={32} className="text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No reviews found</p>
                      </td>
                    </tr>
                  ) : filteredReviews.map((review) => (
                    <tr key={review.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                            {review.profiles?.avatar_url ? (
                              <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                                {review.profiles?.display_name?.charAt(0) || review.profiles?.username?.charAt(0) || 'U'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{review.profiles?.display_name || review.profiles?.username}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">@{review.profiles?.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">
                            {review.beat_id ? 'Beat' : 'Bundle'}
                          </span>
                          <span className="text-sm font-bold text-zinc-300">
                            {review.beats?.title || review.bundles?.title || 'Unknown Item'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={12} 
                              className={clsx(
                                i < review.rating ? "text-yellow-500 fill-current" : "text-zinc-700"
                              )} 
                            />
                          ))}
                          {review.is_verified_purchase && (
                            <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-tighter rounded">Verified</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 line-clamp-2 leading-snug">{review.comment}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-zinc-500">
                          {format(new Date(review.created_at), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={review.status || 'published'}
                          onChange={(e) => updateReviewStatus(review.id, e.target.value)}
                          className={clsx(
                            "bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-primary transition-colors cursor-pointer",
                            review.status === 'published' && "text-emerald-500",
                            review.status === 'pending' && "text-yellow-500",
                            review.status === 'flagged' && "text-red-500"
                          )}
                        >
                          <option value="published">Published</option>
                          <option value="pending">Pending</option>
                          <option value="flagged">Flagged</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteReview(review.id)}
                          className="p-2 text-zinc-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-xl"
                          title="Delete Review"
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
    </AdminGuard>
  );
}
