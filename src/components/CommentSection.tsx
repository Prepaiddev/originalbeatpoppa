"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { MessageSquare, Send, Trash2, Reply, Loader2, User } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string;
  profiles: {
    display_name: string;
    avatar_url: string;
    username: string;
  };
}

interface CommentSectionProps {
  beatId?: string;
  bundleId?: string;
  requiresPurchase?: boolean;
  isPurchased?: boolean;
}

export default function CommentSection({ beatId, bundleId, requiresPurchase = false, isPurchased = false }: CommentSectionProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [beatId, bundleId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const query = supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id(display_name, avatar_url, username)
        `)
        .order('created_at', { ascending: false });

      if (beatId) query.eq('beat_id', beatId);
      if (bundleId) query.eq('bundle_id', bundleId);

      const { data, error } = await query;
      if (data) setComments(data as any);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    if (requiresPurchase && !isPurchased) {
      // Don't alert if we're showing the message in the UI
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          beat_id: beatId || null,
          bundle_id: bundleId || null,
          content: newComment.trim(),
          parent_id: replyTo
        })
        .select(`
          *,
          profiles:user_id(display_name, avatar_url, username)
        `)
        .single();

      if (data) {
        setComments([data as any, ...comments]);
        setNewComment('');
        setReplyTo(null);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (!error) {
        setComments(comments.filter(c => c.id !== id));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="text-primary" size={20} />
          Comments ({comments.length})
        </h3>
      </div>

      {/* Post Comment */}
      {user ? (
        !requiresPurchase || isPurchased ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden relative">
                {user.user_metadata?.avatar_url ? (
                  <Image 
                    src={user.user_metadata.avatar_url} 
                    alt="Avatar" 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                {replyTo && (
                  <div className="flex items-center justify-between bg-zinc-900 px-3 py-1 rounded-lg text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    <span>Replying to {comments.find(c => c.id === replyTo)?.profiles.display_name}</span>
                    <button onClick={() => setReplyTo(null)} className="hover:text-white transition-colors">Cancel</button>
                  </div>
                )}
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:border-primary outline-none min-h-[100px] resize-none text-sm"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-full hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-8 bg-primary/5 border border-primary/20 rounded-3xl text-center">
            <MessageSquare size={32} className="text-primary mx-auto mb-4 opacity-50" />
            <p className="text-primary text-sm font-bold uppercase tracking-widest">
              Purchase this {beatId ? 'beat' : 'bundle'} to join the conversation
            </p>
          </div>
        )
      ) : (
        <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl text-center">
          <p className="text-zinc-400 text-sm mb-4">You must be logged in to post a comment.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-6 py-2 bg-zinc-800 text-white text-sm font-bold rounded-full hover:bg-zinc-700 transition-colors"
          >
            Login to Comment
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 group">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden relative border border-zinc-700">
                {comment.profiles.avatar_url ? (
                  <Image 
                    src={comment.profiles.avatar_url} 
                    alt={comment.profiles.display_name} 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{comment.profiles.display_name}</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setReplyTo(comment.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-1.5 text-zinc-500 hover:text-primary transition-colors"
                      title="Reply"
                    >
                      <Reply size={14} />
                    </button>
                    {user?.id === comment.user_id && (
                      <button 
                        onClick={() => handleDelete(comment.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed bg-zinc-900/50 p-3 rounded-2xl rounded-tl-none inline-block min-w-[200px]">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-zinc-900/20 rounded-3xl border-2 border-dashed border-zinc-800">
            <MessageSquare size={32} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}
