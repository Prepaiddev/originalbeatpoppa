"use client";

import { useState } from 'react';
import { Star, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  beatId: string;
  beatTitle: string;
  onSuccess?: () => void;
}

export default function ReviewModal({ isOpen, onClose, beatId, beatTitle, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!comment.trim()) {
      setError('Please share your thoughts about this beat.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to leave a review.');

      // Check if user has already reviewed this beat
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('beat_id', beatId)
        .single();

      if (existingReview) {
        throw new Error('You have already reviewed this beat.');
      }

      const { data: beatData, error: beatError } = await supabase
        .from('beats')
        .select('user_id')
        .eq('id', beatId)
        .single();

      if (beatError) throw beatError;

      const { error: insertError } = await supabase
        .from('reviews')
        .insert({
          beat_id: beatId,
          reviewer_id: user.id,
          rating,
          comment,
          is_verified_purchase: true // Since we trigger this from purchases
        });

      if (insertError) throw insertError;

      // Notify creator
      await supabase.from('notifications').insert({
        user_id: beatData.user_id,
        type: 'review',
        title: 'New Review Received',
        message: `Someone left a ${rating}-star review on your beat "${beatTitle}".`,
        link: `/beat/${beatId}`
      });

      // Notify buyer (confirmation)
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'review',
        title: 'Review Published',
        message: `Your review for "${beatTitle}" has been posted successfully.`,
        link: `/beat/${beatId}`
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
      
      // Close after 2 seconds
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setComment('');
        setRating(5);
      }, 2000);

    } catch (err: any) {
      console.error('Review submission error:', err);
      setError(err.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        {submitted ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Review Submitted!</h2>
            <p className="text-zinc-400">Thanks for sharing your feedback. Your review helps other creators find great sounds.</p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Rate This Beat</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">{beatTitle}</p>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-widest">How would you rate it?</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 duration-200"
                    >
                      <Star 
                        size={32} 
                        className={`${(hover || rating) >= star ? 'text-yellow-500 fill-current' : 'text-zinc-700'} transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs font-bold text-zinc-600 uppercase tracking-widest h-4">
                  {rating === 1 && "Terrible"}
                  {rating === 2 && "Poor"}
                  {rating === 3 && "Average"}
                  {rating === 4 && "Good"}
                  {rating === 5 && "Amazing"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Your Review</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What do you think about this beat? (The vibe, mixing, quality...)"
                  className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-primary outline-none resize-none transition-colors"
                  rows={4}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Post Review"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
