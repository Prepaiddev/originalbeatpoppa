"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayerStore } from '@/store/usePlayerStore';

interface AudioWaveformPlayerProps {
  audioUrl: string;
  trackId: string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  onPlay?: () => void;
  onPause?: () => void;
}

export default function AudioWaveformPlayer({ 
  audioUrl, 
  trackId,
  height = 80, 
  waveColor = '#3f3f46', // zinc-700
  progressColor = '#f43f5e', // primary (rose-500)
  barWidth = 3,
  barGap = 2,
  barRadius = 3,
  onPlay,
  onPause
}: AudioWaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const { currentTrack, isPlaying: globalIsPlaying, play, pause } = usePlayerStore();
  
  const isCurrentTrack = currentTrack?.id === trackId;
  const isPlaying = isCurrentTrack && globalIsPlaying;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Memoize options to prevent unnecessary re-initialization
  const options = useMemo(() => ({
    height,
    waveColor,
    progressColor,
    barWidth,
    barGap,
    barRadius,
    cursorWidth: 0,
    normalize: true,
    backend: 'WebAudio' as const, // Force WebAudio for visualization
    fillParent: true,
    minPxPerSec: 0, // Set to 0 to fit container without scrollbar
    interact: true,
    hideScrollbar: true, // Explicitly hide scrollbar
  }), [height, waveColor, progressColor, barWidth, barGap, barRadius]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    let ws: WaveSurfer;

    const initWaveSurfer = async () => {
      try {
        setLoading(true);
        setError(null);

        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }

        ws = WaveSurfer.create({
          container: containerRef.current!,
          url: audioUrl,
          ...options
        });

        wavesurfer.current = ws;

        ws.on('ready', () => {
          if (isMounted.current) setLoading(false);
        });

        ws.on('error', (err) => {
          console.error("WaveSurfer error:", err);
          if (isMounted.current) {
            setLoading(false);
            setError("Failed to load audio waveform");
          }
        });

        ws.on('click', () => {
          // Interaction handled by the container click or separate handler if needed
          // But 'interaction' event is better for seeking
        });
        
        ws.on('interaction', (newTime) => {
            if (isCurrentTrack) {
                // Seek global player
                const globalAudio = document.getElementById('global-audio-player') as HTMLAudioElement;
                if (globalAudio) {
                    globalAudio.currentTime = newTime;
                }
            } else {
                // Not current track? Maybe start playing?
                // For now, we leave it. The user must click the play button or container to start.
                // But user asked "Seeking... must update audio position". 
                // If it's not playing, seeking implies we want to play from there?
                // Let's stick to syncing ONLY if current track.
            }
        });

      } catch (err) {
        console.error("WaveSurfer init error:", err);
        if (isMounted.current) {
          setLoading(false);
          setError("Error initializing waveform");
        }
      }
    };

    initWaveSurfer();

    return () => {
      if (wavesurfer.current) {
        try {
          wavesurfer.current.destroy();
        } catch (e) {
          console.error("Error destroying wavesurfer:", e);
        }
        wavesurfer.current = null;
      }
    };
  }, [audioUrl, options, isCurrentTrack]); // Re-init if audioUrl changes

  // Sync with Global Player
  useEffect(() => {
    if (!isCurrentTrack || !wavesurfer.current) return;

    const globalAudio = document.getElementById('global-audio-player') as HTMLAudioElement;
    if (!globalAudio) return;

    const syncTime = () => {
      if (wavesurfer.current && globalAudio.duration) {
         // Sync cursor
         const currentTime = globalAudio.currentTime;
         // WaveSurfer v7 setTime takes seconds
         wavesurfer.current.setTime(currentTime);
      }
    };

    // Initial sync
    syncTime();

    globalAudio.addEventListener('timeupdate', syncTime);
    
    return () => {
      globalAudio.removeEventListener('timeupdate', syncTime);
    };
  }, [isCurrentTrack]);

  // Handle Play/Pause props or internal logic
  // If this component is clicked, we might want to toggle play/pause
  const handleContainerClick = (e: React.MouseEvent) => {
    // Prevent interfering with WaveSurfer's own interaction (seeking)
    // WaveSurfer handles clicks on the canvas for seeking.
    // If we click *outside* the waveform but in the container?
    // Actually, let's rely on the parent or overlay for Play/Pause toggling if not seeking.
    // But user wants "Click-to-seek enabled". WaveSurfer handles this.
    
    // If we want to Play on click:
    if (!isCurrentTrack && onPlay) {
       onPlay();
    } else if (isCurrentTrack && isPlaying && onPause) {
       // Optional: pause on click? 
       // Usually clicking waveform seeks, doesn't pause.
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900/50 rounded-lg border border-red-500/20">
        <div className="text-red-500 text-xs flex items-center gap-2">
            <span>Failed to load waveform</span>
            <button 
                onClick={() => window.location.reload()} // Simple retry by reload or we could add a refetch
                className="underline hover:text-white"
            >
                Retry
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group">
       {loading && (
         <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 backdrop-blur-[1px]">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
         </div>
       )}
       
       <div 
         ref={containerRef} 
         className="w-full h-full"
         onClick={handleContainerClick}
       />
    </div>
  );
}
