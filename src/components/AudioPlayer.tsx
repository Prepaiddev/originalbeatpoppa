"use client";

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Play, Pause, SkipForward, SkipBack, X, Heart, ShoppingCart, Cast } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import AudioWaveformPlayer from './AudioWaveformPlayer';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import StatusModal from './StatusModal';

import { recordActivity } from '@/lib/activity';

export default function AudioPlayer() {
  const { currentTrack, isPlaying, togglePlay, playNext, playPrev } = usePlayerStore();
  const currentUser = useAuthStore(state => state.user);
  const router = useRouter();
  const [authModal, setAuthModal] = useState({ isOpen: false, title: '', message: '' });
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastRecordedBeatId = useRef<string | null>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if the user is typing in an input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
        }
      } else if (e.code === 'ArrowRight') {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  useEffect(() => {
    if (isPlaying && currentTrack && currentUser && lastRecordedBeatId.current !== currentTrack.id) {
      recordActivity(currentUser.id, currentTrack.id, 'play');
      lastRecordedBeatId.current = currentTrack.id;
    }
  }, [isPlaying, currentTrack, currentUser]);

  const handleFavorite = (e: React.MouseEvent) => {
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
    // Favorite logic would go here
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to add this beat to your cart.'
      });
      return;
    }
    // Cart logic would go here
    router.push(`/beat/${currentTrack?.id}`); // Redirect to beat page for license selection
  };

  useEffect(() => {
    let isAborted = false;

    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.audioUrl;
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (!isAborted && e.name !== 'AbortError') {
               console.error("Play failed:", e);
            }
          });
        }
      }
    }
    
    return () => { isAborted = true; };
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
             // Ignore AbortError which happens when pausing quickly after playing
             if (e.name !== 'AbortError') {
                console.error("Play failed:", e);
             }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const previewLimit = currentTrack?.preview_duration || 30;

      if (currentTime >= previewLimit) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (isPlaying) togglePlay(); 
        return;
      }

      setProgress(currentTime);
      setDuration(previewLimit); // Use previewLimit as the duration for the UI
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    usePlayerStore.getState().setCurrentTrack(null);
  };

  return (
    <div className="fixed bottom-[68px] sm:bottom-[80px] left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-white/5 text-white shadow-2xl z-40 animate-slide-up mx-2 mb-2 rounded-xl overflow-hidden ring-1 ring-white/5 h-12 sm:h-16">
      <audio
        id="global-audio-player"
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={playNext}
        onError={(e) => console.warn("Audio playback error:", e)}
      />
      
      {/* Progress Bar (Mini) */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800">
        <div 
          className="h-full bg-white transition-all duration-100" 
          style={{ width: `${(progress / (currentTrack.preview_duration || duration || 1)) * 100}%` }}
        />
      </div>

      {/* Main Player Container */}
      <div className="flex items-center h-full px-3 gap-3">
        
        {/* Left: Track Info & Cover */}
        <div 
          className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => router.push(`/beat/${currentTrack.id}`)}
        >
          <div className="relative w-7 h-7 sm:w-10 sm:h-10 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0 shadow-lg ring-1 ring-white/10">
             <Image 
               src={currentTrack.coverUrl} 
               alt={currentTrack.title} 
               fill 
               className="object-cover"
             />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-[10px] sm:text-sm truncate">
              {currentTrack.title}
            </h4>
            <p className="text-[8px] sm:text-[10px] text-zinc-400 truncate uppercase tracking-tighter">
              {currentTrack.artist}
            </p>
          </div>
          <div className="hidden xs:flex items-center gap-1.5 ml-1 text-[8px] sm:text-[10px] font-mono text-zinc-500 bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
            <span className="text-white">{formatTime(progress)}</span>
            <span className="opacity-30">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Center: Waveform (Desktop only) or Mini visualization (Mobile) */}
        <div className="hidden md:block flex-[2] h-8 bg-black/20 rounded-lg overflow-hidden px-4">
           <AudioWaveformPlayer 
             audioUrl={currentTrack.audioUrl} 
             trackId={currentTrack.id} 
             height={32}
             barWidth={2}
             barGap={1}
             waveColor="rgba(255,255,255,0.1)"
             progressColor="#FF3B5C"
           />
        </div>

        {/* Center: Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button 
            onClick={playPrev}
            className="p-1 sm:p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <SkipBack className="size-[16px] sm:size-[20px]" fill="currentColor" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            {isPlaying ? <Pause className="size-[16px] sm:size-[20px]" fill="currentColor" /> : <Play className="size-[16px] sm:size-[20px] ml-0.5" fill="currentColor" />}
          </button>

          <button 
            onClick={playNext}
            className="p-1 sm:p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <SkipForward className="size-[16px] sm:size-[20px]" fill="currentColor" />
          </button>
        </div>

        {/* Right: Extra Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button 
            onClick={handleFavorite}
            className="p-1.5 sm:p-2 text-zinc-500 hover:text-primary transition-colors hidden sm:block"
          >
            <Heart className="size-[18px] sm:size-[20px]" />
          </button>
          <button 
            onClick={handleAddToCart}
            className="p-1.5 sm:p-2 text-zinc-500 hover:text-primary transition-colors"
          >
            <ShoppingCart className="size-[18px] sm:size-[20px]" />
          </button>
          <button 
            onClick={handleClose}
            className="p-1.5 sm:p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="size-[18px] sm:size-[20px]" />
          </button>
        </div>
      </div>
      
      <StatusModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        type="auth"
        title={authModal.title}
        message={authModal.message}
        onAction={() => router.push('/auth/login')}
      />
    </div>
  );
}
