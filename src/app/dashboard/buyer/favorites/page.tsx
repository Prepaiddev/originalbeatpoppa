"use client";

import Header from '@/components/Header';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { Heart, Play, Pause, ShoppingCart, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { usePlayerStore, Track } from '@/store/usePlayerStore';

export default function MyFavoritesPage() {
  const { user } = useAuthStore();
  const { currency, exchangeRates } = useUIStore();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();

  useEffect(() => {
    async function fetchFavorites() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select(`
            *,
            beats(
              id, title, cover_url, audio_url, price, bpm, key, genre,
              profiles(display_name)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFavorites(data || []);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [user?.id]);

  const handlePlay = (fav: any) => {
    const track: Track = {
      id: fav.beats.id,
      title: fav.beats.title,
      artist: fav.beats.profiles?.display_name || 'Unknown',
      audioUrl: fav.beats.audio_url,
      coverUrl: fav.beats.cover_url,
      price: fav.beats.price,
      bpm: fav.beats.bpm,
      key: fav.beats.key,
      genre: fav.beats.genre,
      tags: [],
      plays: 0
    };

    if (currentTrack?.id === track.id && isPlaying) {
      pause();
    } else {
      play(track);
    }
  };

  const removeFavorite = async (beatId: string) => {
    if (!user) return;
    try {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('beat_id', beatId);
      setFavorites(favorites.filter(f => f.beat_id !== beatId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[80px] max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Favorites</h1>
          <p className="text-zinc-400">Beats you've saved for later</p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-xl border border-zinc-800">
            <Heart className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">No favorites yet</h3>
            <p className="text-zinc-500 mb-6">Save beats you love to find them easily later</p>
            <Link href="/explore" className="px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-red-600 transition-colors">
              Explore Beats
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((fav) => {
              const isCurrent = currentTrack?.id === fav.beats.id;
              const isActive = isCurrent && isPlaying;

              return (
                <div key={fav.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-4 group hover:bg-zinc-800 transition-colors">
                  <div 
                    className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 cursor-pointer"
                    onClick={() => handlePlay(fav)}
                  >
                    <Image 
                      src={fav.beats.cover_url || "https://placehold.co/100x100"} 
                      alt={fav.beats.title} 
                      fill 
                      className="object-cover"
                    />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      {isActive ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Link href={`/beat/${fav.beats.id}`} className="font-bold text-white hover:text-primary transition-colors truncate block">
                      {fav.beats.title}
                    </Link>
                    <p className="text-sm text-zinc-400 truncate">{fav.beats.profiles?.display_name || "Producer"}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                      <span>{fav.beats.bpm} BPM</span>
                      <span>•</span>
                      <span>{fav.beats.key}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white hidden sm:block">{formatPrice(fav.beats.price, currency, exchangeRates)}</span>
                    <button 
                      onClick={() => removeFavorite(fav.beat_id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                    >
                      <Heart size={20} fill="currentColor" />
                    </button>
                    <Link 
                      href={`/beat/${fav.beats.id}`}
                      className="p-2 bg-primary text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <ShoppingCart size={20} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
