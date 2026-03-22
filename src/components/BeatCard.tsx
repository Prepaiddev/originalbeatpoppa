"use client";

import Image from 'next/image';
import { Play, Pause, ShoppingCart, Heart, MoreVertical, ListPlus } from 'lucide-react';
import { Track, usePlayerStore } from '@/store/usePlayerStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { useCartStore } from '@/store/useCartStore';
import StatusModal from './StatusModal';
import PlaylistModal from './PlaylistModal';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import AudioWaveformPlayer from './AudioWaveformPlayer';
import { supabase } from '@/lib/supabase/client';
import { recordActivity } from '@/lib/activity';
import VerifiedCheck from './VerifiedCheck';

interface BeatCardProps {
  beat: Track;
  variant?: 'list' | 'card';
  isPlaying?: boolean;
  onPlay?: () => void;
  showWaveform?: boolean;
}

export default function BeatCard({ beat, variant = 'list', isPlaying: externalIsPlaying, onPlay, showWaveform = false }: BeatCardProps) {
  const { currentTrack, isPlaying: storeIsPlaying, play, pause } = usePlayerStore();
  const { currency, exchangeRates } = useUIStore();
  const { addToCart, items: cartItems } = useCartStore();
  const currentUser = useAuthStore(state => state.user);
  const router = useRouter();
  
  const [isFavorited, setIsFavorited] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, title: '', message: '' });
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isCurrent = currentTrack?.id === beat.id;
  const isActive = externalIsPlaying !== undefined ? externalIsPlaying : (isCurrent && storeIsPlaying);
  const isInCart = cartItems.some(item => item.beatId === beat.id);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (isActive || storeIsPlaying) return; // Don't preview if something is already playing

    previewTimeoutRef.current = setTimeout(() => {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(beat.audioUrl);
        previewAudioRef.current.volume = 0.3; // Low volume for preview
        previewAudioRef.current.loop = true;
      }
      previewAudioRef.current.play().catch(() => {});
      setIsPreviewing(true);
    }, 800); // 800ms hover delay
  };

  const handleMouseLeave = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setIsPreviewing(false);
  };

  useEffect(() => {
    if (currentUser) {
      checkFavoriteStatus();
    }
  }, [currentUser, beat.id]);

  const checkFavoriteStatus = async () => {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', currentUser?.id)
      .eq('beat_id', beat.id)
      .single();
    
    setIsFavorited(!!data);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlaylistAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to add to a playlist.'
      });
      return;
    }
    setIsPlaylistModalOpen(true);
    setShowMenu(false);
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to favorite this beat.'
      });
      return;
    }

    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('beat_id', beat.id);
        
        await recordActivity(currentUser.id, beat.id, 'unfavorite');
        
        setIsFavorited(false);
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: currentUser.id, beat_id: beat.id });
        
        await recordActivity(currentUser.id, beat.id, 'favorite');
        
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handlePlayAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onPlay) {
      onPlay();
    } else {
      if (isActive) {
        pause();
      } else {
        play(beat);
      }
    }
  };

  return (
    <>
      {variant === 'list' ? (
        <div 
          className={clsx(
            "flex items-center p-2 hover:bg-white/5 rounded-lg transition-all group cursor-pointer snap-start relative overflow-hidden",
            isPreviewing && "bg-white/[0.08]"
          )}
          onClick={() => router.push(`/beat/${beat.id}`)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {isPreviewing && (
            <div className="absolute top-0 left-0 h-1 bg-primary/30 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }} />
          )}
          <div className="flex items-center flex-1 min-w-0">
            {/* Cover Art */}
            <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800 shadow-md">
              <Image 
                src={beat.coverUrl} 
                alt={beat.title}
                fill
                className="object-cover"
              />
              <button 
                onClick={handlePlayAction}
                className={clsx(
                  "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                {isActive ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
              </button>
            </div>

          <div className="flex-1 ml-3 min-w-0">
            <h3 className={clsx("font-bold text-sm truncate group-hover:text-primary transition-colors", isCurrent ? "text-primary" : "text-white")}>
              {beat.title}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-zinc-400 truncate hover:text-white transition-colors">{beat.artist}</p>
              <span className="text-zinc-700 text-[10px]">•</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-medium px-1.5 py-0.5 bg-zinc-800/50 rounded border border-zinc-700/50 uppercase tracking-tighter">
                  {beat.bpm || 140} BPM
                </span>
                <span className="text-[10px] text-zinc-500 font-medium px-1.5 py-0.5 bg-zinc-800/50 rounded border border-zinc-700/50 uppercase tracking-tighter">
                  {beat.key || 'C# Min'}
                </span>
              </div>
            </div>
          </div>
        </div>

          <div className="flex items-center gap-4 ml-auto px-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-end">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(beat, 'beat');
                  router.push('/cart');
                }}
                className="group/price flex flex-col items-end"
              >
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter opacity-0 group-hover/price:opacity-100 transition-opacity">
                  Buy Now
                </span>
                <span className="text-white font-bold text-sm group-hover/price:text-primary transition-colors">
                  {formatPrice(beat.price ?? 29.99, currency, exchangeRates, true)}
                </span>
              </button>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                addToCart(beat, 'beat');
              }}
              className={clsx(
                "p-2 rounded-full transition-all",
                isInCart ? "text-primary bg-primary/10" : "text-zinc-500 hover:text-white hover:bg-white/10"
              )}
            >
              <ShoppingCart size={18} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pl-2" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={handleFavorite}
              className={clsx(
                "p-2 rounded-full transition-colors",
                isFavorited ? "text-primary" : "text-zinc-500 hover:text-white"
              )}
            >
              <Heart size={18} fill={isFavorited ? "currentColor" : "none"} />
            </button>
            <div className="relative" ref={menuRef}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <MoreVertical size={18} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <button 
                    onClick={handlePlaylistAction}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <ListPlus size={16} />
                    Add to Playlist
                  </button>
                  <button 
                    onClick={handleFavorite}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
                    {isFavorited ? 'Remove from Favs' : 'Add to Favorites'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div 
          className={clsx(
            "group bg-zinc-900/40 rounded-2xl p-3 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 relative overflow-hidden",
            isPreviewing && "bg-white/[0.08]"
          )}
          onClick={() => router.push(`/beat/${beat.id}`)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {isPreviewing && (
            <div className="absolute top-0 left-0 h-1 bg-primary/30 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }} />
          )}
          <div className="relative aspect-square rounded-xl overflow-hidden mb-4 shadow-lg">
            <Image 
              src={beat.coverUrl} 
              alt={beat.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
            
            <button 
              onClick={handlePlayAction}
              className={clsx(
                "absolute bottom-3 right-3 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-xl transition-all duration-300 active:scale-90",
                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0"
              )}
            >
              {isActive ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-1" />}
            </button>
          </div>

          <div className="px-1">
            <h3 className="font-bold text-white text-base truncate group-hover:text-primary transition-colors mb-0.5">
              {beat.title}
            </h3>
            <p className="text-zinc-500 text-[11px] mb-3 hover:text-white transition-colors cursor-pointer">{beat.artist}</p>
            
            <div className="flex items-center justify-between mt-auto">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(beat, 'beat');
                  router.push('/cart');
                }}
                className="group/buy flex flex-col text-left"
              >
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter mb-0.5 group-hover/buy:text-primary transition-colors">
                  Buy Now
                </span>
                <span className="text-white font-black text-base group-hover/buy:text-primary transition-colors">
                  {formatPrice(beat.price ?? 29.99, currency, exchangeRates, true)}
                </span>
              </button>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={handleFavorite}
                  className={clsx(
                    "w-9 h-9 rounded-full flex items-center justify-center border transition-all",
                    isFavorited ? "border-primary/50 bg-primary/10 text-primary shadow-lg shadow-primary/20" : "border-zinc-800/50 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-white"
                  )}
                >
                  <Heart size={16} fill={isFavorited ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => addToCart(beat, 'beat')}
                  className={clsx(
                    "w-9 h-9 rounded-full flex items-center justify-center border transition-all",
                    isInCart ? "border-primary bg-primary text-white shadow-lg shadow-primary/30" : "border-zinc-800/50 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-white"
                  )}
                >
                  <ShoppingCart size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StatusModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        type="auth"
        title={authModal.title}
        message={authModal.message}
        onAction={() => router.push('/auth/login')}
      />

      <PlaylistModal 
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        beatId={beat.id}
        beatTitle={beat.title}
        beatCover={beat.coverUrl}
      />
    </>
  );
}
