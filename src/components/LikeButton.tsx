"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Heart, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import StatusModal from './StatusModal';

interface LikeButtonProps {
  beatId?: string;
  bundleId?: string;
  initialLikes?: number;
  size?: number;
  showCount?: boolean;
  requiresPurchase?: boolean;
  isPurchased?: boolean;
}

export default function LikeButton({ 
  beatId, 
  bundleId, 
  initialLikes = 0, 
  size = 18, 
  showCount = true,
  requiresPurchase = false,
  isPurchased = false
}: LikeButtonProps) {
  const { user } = useAuthStore();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: 'success' | 'error' | 'loading' | 'auth';
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }>({
    type: 'auth',
    title: 'Purchase Required',
    message: ''
  });

  useEffect(() => {
    checkLikeStatus();
  }, [beatId, bundleId, user]);

  const checkLikeStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const query = supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id);

      if (beatId) query.eq('beat_id', beatId);
      if (bundleId) query.eq('bundle_id', bundleId);

      const { data, error } = await query.single();
      setIsLiked(!!data);
    } catch (error) {
      // Ignore errors (usually means not liked)
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      setModalConfig({
        type: 'auth',
        title: 'Login Required',
        message: 'Please login to like your favorite beats.',
        actionLabel: 'Login Now',
        onAction: () => window.location.href = '/auth/login'
      });
      setShowModal(true);
      return;
    }

    if (requiresPurchase && !isPurchased) {
      setModalConfig({
        type: 'auth',
        title: 'Purchase Required',
        message: `You must purchase this ${beatId ? 'beat' : 'bundle'} to like it.`,
        actionLabel: 'View Pricing'
      });
      setShowModal(true);
      return;
    }

    if (processing) return;

    setProcessing(true);
    try {
      if (isLiked) {
        // Unlike
        const query = supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id);

        if (beatId) query.eq('beat_id', beatId);
        if (bundleId) query.eq('bundle_id', bundleId);

        const { error } = await query;
        if (!error) {
          setIsLiked(false);
          setLikes(Math.max(0, likes - 1));
        }
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            beat_id: beatId || null,
            bundle_id: bundleId || null
          });

        if (!error) {
          setIsLiked(true);
          setLikes(likes + 1);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <Loader2 className="animate-spin text-zinc-600" size={size} />;
  }

  return (
    <>
      <button
        onClick={handleLike}
        disabled={processing}
        className={clsx(
          "flex items-center gap-1.5 transition-all active:scale-90 group",
          isLiked ? "text-primary" : "text-zinc-500 hover:text-white"
        )}
        title={isLiked ? "Unlike" : "Like"}
      >
        <Heart 
          size={size} 
          className={clsx(
            "transition-colors",
            isLiked ? "fill-primary text-primary" : "text-zinc-500 group-hover:text-white"
          )} 
        />
        {showCount && <span className="text-xs font-bold">{likes}</span>}
      </button>

      <StatusModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        actionLabel={modalConfig.actionLabel}
        onAction={modalConfig.onAction}
      />
    </>
  );
}
