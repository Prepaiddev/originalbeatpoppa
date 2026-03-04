"use client";

import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TrendingBeats from '@/components/TrendingBeats';
import TopProducers from '@/components/TopProducers';
import BeatCard from '@/components/BeatCard';
import { dummyBeats } from '@/data/beats';
import { Filter, Search, ChevronRight, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import clsx from 'clsx';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const { fetchSettings } = useSettingsStore();
  const { play, setQueue } = usePlayerStore();
  const { user, initialize } = useAuthStore();

  const [mixedBeats, setMixedBeats] = useState<Track[]>([]);
  const [quickPicks, setQuickPicks] = useState<Track[]>([]);
  const [forgottenBeats, setForgottenBeats] = useState<Track[]>([]);
  const [suggestedBeats, setSuggestedBeats] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const [genreSettings, setGenreSettings] = useState<{ is_enabled: boolean; items: { label: string; icon: string }[] }>({ 
    is_enabled: true,
    items: [
      { label: 'All', icon: '🏠' },
      { label: 'Trap', icon: '🔥' },
      { label: 'Hip Hop', icon: '🎤' },
      { label: 'R&B', icon: '🎹' },
      { label: 'Pop', icon: '🌟' }
    ]
  });

  useEffect(() => {
    const init = async () => {
      await initialize();
      fetchSettings();
      fetchRealBeats();
      fetchGenreSettings();
    };
    init();
  }, [fetchSettings, initialize]);

  const fetchGenreSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'genre_bar')
        .single();
      
      if (data?.value) {
        setGenreSettings(data.value);
      }
    } catch (error) {
      console.error('Error fetching genre settings:', error);
    }
  };

  async function fetchRealBeats() {
    setLoading(true);
    try {
      // 1. Fetch section config
      const { data: configData } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'homepage_sections')
        .maybeSingle();

      const config: SectionConfig[] = configData?.value || [];

      // 2. Fetch all beats for mapping
      const { data: allBeats, error } = await supabase
        .from('beats')
        .select('*, profiles(display_name, username, is_verified)')
        .limit(100);

      if (error) {
        console.warn('Error fetching real beats:', error.message);
        return;
      }

      if (allBeats) {
        const mapped = allBeats.map((b: any) => ({
          id: b.id,
          title: b.title,
          artist: b.profiles?.display_name || 'Unknown Producer',
          username: b.profiles?.username,
          isVerified: b.profiles?.is_verified,
          audioUrl: b.audio_url,
          coverUrl: b.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
          price: b.price,
          bpm: b.bpm,
          key: b.key,
          genre: b.genre,
          plays: b.plays
        }));

        // Map beats to sections based on config
        const getSectionBeats = (sectionId: string) => {
          const section = config.find(s => s.id === sectionId);
          if (!section || !section.beatIds || !section.beatIds.length) return mapped.slice(0, 8); // Fallback to first 8 if not configured
          return section.beatIds.map(id => mapped.find(m => m.id === id)).filter(Boolean) as Track[];
        };

        setMixedBeats(getSectionBeats('mixed'));
        setQuickPicks(getSectionBeats('quick'));
        setSuggestedBeats(getSectionBeats('suggested'));

        // Handle Forgotten Favorites (Real logic)
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          const { data: forgottenData, error: forgottenError } = await supabase
            .from('forgotten_favorites_view')
            .select('beat_id')
            .eq('user_id', currentUser.id)
            .limit(8);

          if (forgottenData && forgottenData.length > 0) {
            const beatIds = forgottenData.map(f => f.beat_id);
            const { data: forgottenBeatsData } = await supabase
              .from('beats')
              .select('*, profiles(display_name, username, is_verified)')
              .in('id', beatIds);
            
            if (forgottenBeatsData) {
              setForgottenBeats(forgottenBeatsData.map((b: any) => ({
                id: b.id,
                title: b.title,
                artist: b.profiles?.display_name || 'Unknown Producer',
                username: b.profiles?.username,
                isVerified: b.profiles?.is_verified,
                audioUrl: b.audio_url,
                coverUrl: b.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
                price: b.price,
                bpm: b.bpm,
                key: b.key,
                genre: b.genre,
                plays: b.plays
              })));
            }
          } else {
            // Fallback for demo or empty states
            setForgottenBeats(mapped.slice(20, 28)); 
          }
        } else {
          // If logged out, just show random/popular for this section
          setForgottenBeats(mapped.slice(20, 28));
        }
      }
    } catch (err) {
      console.error('Error fetching real beats:', err);
    } finally {
      setLoading(false);
    }
  }

  interface SectionConfig {
    id: string;
    beatIds: string[];
  }

  const handlePlayAll = (tracks: Track[]) => {
    if (tracks.length > 0) {
      setQueue(tracks);
      play(tracks[0]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-6 h-6 bg-primary rounded-full animate-ping" />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-white font-black uppercase tracking-[0.3em] text-sm animate-pulse">
            Loading <span className="text-primary">Experience</span>
          </h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            Preparing your authentic beats...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-[64px] pb-32">
        {/* Categories (Sticky below header) */}
        {genreSettings.is_enabled && (
          <div className="sticky top-[64px] z-30 bg-black/60 backdrop-blur-xl py-3 border-b border-zinc-900/50">
            <div className="flex gap-2 overflow-x-auto px-4 hide-scrollbar snap-x">
              {genreSettings.items.map((cat) => (
                <button 
                  key={cat.label}
                  onClick={() => setActiveCategory(cat.label)}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 border snap-start",
                    activeCategory === cat.label 
                      ? "bg-white text-black border-white shadow-lg shadow-white/10" 
                      : "bg-zinc-900/40 border-zinc-800/50 text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-800/50"
                  )}
                >
                  <span className="text-base">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Hero />
        
        <div className="mt-8 space-y-12">
          {/* Mixed for you (Horizontal Scroll) */}
          <section>
            <div className="px-4 mb-4 flex items-end justify-between">
               <NextLink 
                 href="/explore?section=mixed" 
                 className="cursor-pointer group block"
               >
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">FOR FEELING GOOD</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl md:text-3xl font-black text-white leading-none">Mixed for you</h2>
                    <ChevronRight size={28} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
               </NextLink>
               <button 
                  onClick={() => handlePlayAll(mixedBeats)}
                  className="text-xs font-bold px-4 py-1.5 rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-all active:scale-95"
                >
                  Play all
                </button>
            </div>
            <div className="flex gap-4 overflow-x-auto px-4 hide-scrollbar pb-4 snap-x snap-mandatory">
               {mixedBeats.map((beat) => (
                 <div key={beat.id} className="w-[160px] md:w-[200px] flex-shrink-0 group cursor-pointer snap-start" onClick={() => router.push(`/beat/${beat.id}`)}>
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-900 shadow-2xl ring-1 ring-white/5 group-hover:ring-white/20 transition-all duration-300">
                       <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                       <div 
                         className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
                         onClick={(e) => {
                           e.stopPropagation();
                           play(beat, mixedBeats);
                         }}
                       >
                          <Play size={20} fill="white" className="ml-1" />
                       </div>
                    </div>
                    <h3 className="font-bold text-sm text-white truncate mb-0.5 group-hover:text-primary transition-colors">{beat.title}</h3>
                    <p className="text-xs text-zinc-500 truncate">{beat.artist}</p>
                 </div>
               ))}
            </div>
          </section>

          {/* Quick picks (Vertical List Grid) */}
          <section className="px-4">
             <div className="flex items-center justify-between mb-6">
                <NextLink 
                  href="/explore?section=quick" 
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <h2 className="text-2xl md:text-3xl font-black text-white">Quick picks</h2>
                  <ChevronRight size={28} className="text-zinc-500 group-hover:text-white transition-colors" />
                </NextLink>
                <button 
                  onClick={() => handlePlayAll(quickPicks)}
                  className="text-xs font-bold px-4 py-1.5 rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-all active:scale-95"
                >
                  Play all
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                <div className="space-y-1">
                   {quickPicks.slice(0, 4).map((beat) => (
                     <BeatCard key={beat.id} beat={beat} variant="list" onPlay={() => play(beat, quickPicks)} />
                   ))}
                </div>
                <div className="space-y-1 hidden md:block border-l border-zinc-900/50 pl-8">
                   {quickPicks.slice(4, 8).map((beat) => (
                     <BeatCard key={beat.id} beat={beat} variant="list" onPlay={() => play(beat, quickPicks)} />
                   ))}
                </div>
                <div className="space-y-1 hidden lg:block border-l border-zinc-900/50 pl-8">
                   {quickPicks.slice(8, 12).map((beat) => (
                     <BeatCard key={beat.id} beat={beat} variant="list" onPlay={() => play(beat, quickPicks)} />
                   ))}
                </div>
             </div>
          </section>

          {/* Forgotten Favourites (Horizontal Scroll) */}
          <section className="bg-zinc-900/20 py-10">
            <div className="px-4 mb-6 flex items-end justify-between">
               <NextLink 
                 href="/explore?section=forgotten" 
                 className="flex items-center gap-2 cursor-pointer group"
               >
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-none">Forgotten favourites</h2>
                  <ChevronRight size={28} className="text-zinc-500 group-hover:text-white transition-colors" />
               </NextLink>
               <button 
                  onClick={() => handlePlayAll(forgottenBeats)}
                  className="text-xs font-bold px-4 py-1.5 rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-all active:scale-95"
                >
                  Play all
                </button>
            </div>
            <div className="flex gap-4 overflow-x-auto px-4 hide-scrollbar pb-4">
               {forgottenBeats.length > 0 ? forgottenBeats.map((beat) => (
                 <div key={beat.id} className="w-[140px] md:w-[160px] flex-shrink-0 group cursor-pointer" onClick={() => router.push(`/beat/${beat.id}`)}>
                    <div className="relative aspect-square rounded-full overflow-hidden mb-3 bg-zinc-900 shadow-lg ring-1 ring-white/5 group-hover:ring-white/20 transition-all duration-500">
                       <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                       <div 
                         className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                         onClick={(e) => {
                           e.stopPropagation();
                           play(beat, forgottenBeats);
                         }}
                       >
                          <Play size={24} fill="white" className="ml-1" />
                       </div>
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors">{beat.title}</h3>
                      <p className="text-xs text-zinc-500 truncate">{beat.artist}</p>
                    </div>
                 </div>
               )) : (
                 <div className="w-full py-10 text-center text-zinc-500 italic">
                   No forgotten favorites yet. Keep listening to your favorite beats!
                 </div>
               )}
            </div>
          </section>

          {/* Audios you might like (Vertical List) */}
          <section className="px-4 pb-12">
             <div className="flex items-center justify-between mb-6">
                <NextLink 
                  href="/explore?section=suggested" 
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <h2 className="text-2xl md:text-3xl font-black text-white">Audios you might like</h2>
                  <ChevronRight size={28} className="text-zinc-500 group-hover:text-white transition-colors" />
                </NextLink>
                <button 
                  onClick={() => handlePlayAll(suggestedBeats)}
                  className="text-xs font-bold px-4 py-1.5 rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900 transition-all active:scale-95"
                >
                  Play all
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
                <div className="space-y-1">
                   {suggestedBeats.slice(0, 4).map((beat) => (
                     <BeatCard key={beat.id} beat={beat} variant="list" onPlay={() => play(beat, suggestedBeats)} />
                   ))}
                </div>
                <div className="space-y-1 hidden md:block border-l border-zinc-900/50 pl-8">
                   {suggestedBeats.slice(4, 8).map((beat) => (
                     <BeatCard key={beat.id} beat={beat} variant="list" onPlay={() => play(beat, suggestedBeats)} />
                   ))}
                </div>
                <div className="space-y-1 hidden lg:block border-l border-zinc-900/50 pl-8">
                   {suggestedBeats.slice(8, 12).map((beat) => (
                     <BeatCard key={beat.id} beat={beat} variant="list" onPlay={() => play(beat, suggestedBeats)} />
                   ))}
                </div>
             </div>
          </section>
        </div>
      </main>
    </div>
  );
}
