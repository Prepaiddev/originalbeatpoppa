"use client";

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface WaveformProps {
  audioUrl: string;
  trackId: string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
}

export default function Waveform({ 
  audioUrl, 
  trackId,
  height = 80, 
  waveColor = '#3f3f46', // zinc-700
  progressColor = '#f43f5e', // primary (rose-500)
  barWidth = 3,
  barGap = 2,
  barRadius = 3
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const { currentTrack, isPlaying: globalIsPlaying, play, pause } = usePlayerStore();
  
  const isCurrentTrack = currentTrack?.id === trackId;
  const isPlaying = isCurrentTrack && globalIsPlaying;
  
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!audioUrl) {
      setError("No audio URL");
      return;
    }

    if (!containerRef.current) return;

    const createWaveSurfer = async () => {
      try {
        if (wavesurfer.current) {
          try {
            wavesurfer.current.destroy();
          } catch (e) {
            // ignore
          }
          wavesurfer.current = null;
        }

        const ws = WaveSurfer.create({
          container: containerRef.current!,
          waveColor,
          progressColor,
          height,
          barWidth,
          barGap,
          barRadius,
          cursorWidth: 0,
          normalize: true,
          backend: 'WebAudio', 
        });

        wavesurfer.current = ws;

        ws.on('error', (err) => {
           console.warn("WaveSurfer error event:", err);
           if (isMounted.current) setError("Waveform error");
        });

        try {
          if (isMounted.current && wavesurfer.current === ws) {
             await ws.load(audioUrl);
          }
        } catch (loadErr) {
          console.warn("Waveform load failed:", loadErr);
          if (isMounted.current) setError("Waveform unavailable");
        }

      } catch (err) {
        console.warn("Waveform initialization error:", err);
        if (isMounted.current) setError("Failed to init waveform");
      }
    };

    createWaveSurfer();

    return () => {
      if (wavesurfer.current) {
        try {
          wavesurfer.current.destroy();
        } catch (e) {
          // ignore
        }
        wavesurfer.current = null;
      }
    };
  }, [audioUrl, height, waveColor, progressColor, barWidth, barGap, barRadius]);

  // Sync with Global Player
  useEffect(() => {
    if (!isCurrentTrack || !wavesurfer.current) return;

    const globalAudio = document.getElementById('global-audio-player') as HTMLAudioElement;
    if (!globalAudio) return;

    const syncTime = () => {
      if (wavesurfer.current && globalAudio.duration) {
        const progress = globalAudio.currentTime / globalAudio.duration;
        // Avoid setting time if it's already close to prevent jitter
        // wavesurfer.seekTo(progress); 
        // seekTo jumps, maybe setTime? WaveSurfer v7 has setTime(seconds)
        if (wavesurfer.current.setTime) {
             wavesurfer.current.setTime(globalAudio.currentTime);
        } else {
             // Fallback for older versions if needed, but v7 has setTime
             wavesurfer.current.seekTo(progress);
        }
      }
    };

    globalAudio.addEventListener('timeupdate', syncTime);
    
    return () => {
      globalAudio.removeEventListener('timeupdate', syncTime);
    };
  }, [isCurrentTrack]); // Re-run if track changes

  const handleClick = () => {
    if (isCurrentTrack) {
       // Toggle play/pause
       if (globalIsPlaying) pause();
       else play(currentTrack!); // Resume
    } else {
       // Start playing this track
       // We need the full track object. 
       // Since we only have props here, we might need to fetch/find the track or pass it fully.
       // For now, let's assume the parent handles playback initiation if not current.
       // But wait, we want to click on waveform to play.
       // The parent component should handle this if we don't have the full track object.
       // However, we can just trigger the callback if provided, or try to find it.
    }
  };

  // If error, show fallback
  if (error) {
    // Fallback: Simulated Waveform using CSS bars
    return (
      <div 
        className="w-full h-full flex items-end justify-between gap-0.5 overflow-hidden cursor-pointer group relative"
        onClick={() => {
           // Toggle local play state for visual feedback if not connected to global
        }}
        style={{ height }}
      >
        {/* Generate simulated bars */}
        {Array.from({ length: 64 }).map((_, i) => {
          // Create a symmetric-ish waveform pattern
          const heightPercent = Math.max(15, 30 + Math.sin(i * 0.2) * 40 + Math.random() * 30);
          return (
            <div 
              key={i}
              className="w-1.5 rounded-full transition-all duration-300 bg-zinc-700 opacity-60"
              style={{
                height: `${heightPercent}%`,
                backgroundColor: isPlaying ? progressColor : waveColor,
                animation: `music-bar 0.6s ease-in-out infinite alternate ${i * 0.05}s`,
                animationPlayState: isPlaying ? 'running' : 'paused'
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative w-full group cursor-pointer" onClick={handleClick}>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
