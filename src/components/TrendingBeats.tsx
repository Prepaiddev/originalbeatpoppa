"use client";

import { useEffect, useState } from 'react';
import BeatCard from './BeatCard';
import { supabase } from '@/lib/supabase/client';
import { Track, usePlayerStore } from '@/store/usePlayerStore';

export default function TrendingBeats() {
  const [beats, setBeats] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { play, currentTrack, isPlaying, pause } = usePlayerStore();

  const handlePlay = (beat: Track) => {
    if (currentTrack?.id === beat.id && isPlaying) {
      pause();
    } else {
      play(beat, beats); // Pass the current list as the queue
    }
  };

  useEffect(() => {
    async function fetchTrending() {
      try {
        const { data, error } = await supabase
          .from('beats')
          .select('*, profiles(display_name, username)')
          .eq('is_active', true)
          .order('plays', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data) {
          const mappedBeats: Track[] = data.map((b: any) => ({
            id: b.id,
            title: b.title,
            artist: b.profiles?.display_name || 'Unknown Producer',
            username: b.profiles?.username,
            audioUrl: b.audio_url,
            coverUrl: b.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
            price: b.price,
            bpm: b.bpm,
            key: b.key,
            genre: b.genre,
            tags: b.tags,
            plays: b.plays
          }));
          setBeats(mappedBeats);
        }
      } catch (error) {
        console.error('Error fetching trending beats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrending();
  }, []);

  if (loading) {
    return (
      <section className="py-8 border-b border-zinc-900">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-red-500">🔥</span> Trending Now
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x hide-scrollbar">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="snap-center flex-shrink-0 w-[280px] h-[350px] bg-zinc-900/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </section>
    );
  }

  if (beats.length === 0) return null;

  return (
    <section className="py-8 border-b border-zinc-900">
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="text-red-500">🔥</span> Trending Now
        </h2>
        <button className="text-xs text-zinc-500 hover:text-white transition-colors">See All ›</button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x hide-scrollbar">
        {beats.map((beat) => (
          <div key={beat.id} className="snap-center flex-shrink-0 w-[280px]">
            <BeatCard 
              beat={beat} 
              variant="card" 
              isPlaying={currentTrack?.id === beat.id && isPlaying}
              onPlay={() => handlePlay(beat)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
