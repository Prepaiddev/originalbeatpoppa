"use client";

import Header from '@/components/Header';
import { Search, SlidersHorizontal } from 'lucide-react';
import BeatCard from '@/components/BeatCard';
import TopProducers from '@/components/TopProducers';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Track } from '@/store/usePlayerStore';

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section');
  
  const [activeTab, setActiveTab] = useState<'beats' | 'producers'>(section ? 'beats' : 'beats');
  const [beats, setBeats] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();

  const sectionTitles: Record<string, string> = {
    'mixed': 'Mixed for you',
    'quick': 'Quick picks',
    'forgotten': 'Forgotten favourites',
    'suggested': 'Audios you might like'
  };

  useEffect(() => {
    async function fetchBeats() {
      setLoading(true);
      try {
        if (section === 'forgotten') {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            setBeats([]);
            return;
          }

          const { data: forgottenData, error: forgottenError } = await supabase
            .from('forgotten_favorites_view')
            .select('beat_id')
            .eq('user_id', currentUser.id);

          if (forgottenData && forgottenData.length > 0) {
            const beatIds = forgottenData.map(f => f.beat_id);
            const { data: beatsData, error: beatsError } = await supabase
              .from('beats')
              .select('*, profiles(display_name, username, is_verified)')
              .in('id', beatIds);
            
            if (beatsError) throw beatsError;
            if (beatsData) {
              setBeats(beatsData.map((b: any) => ({
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
            setBeats([]);
          }
          return;
        }

        if (section && ['mixed', 'quick', 'suggested'].includes(section)) {
          const { data: configData } = await supabase
            .from('platform_settings')
            .select('*')
            .eq('key', 'homepage_sections')
            .maybeSingle();

          const config = configData?.value || [];
          const sectionConfig = config.find((s: any) => s.id === section);
          
          if (sectionConfig && sectionConfig.beatIds && sectionConfig.beatIds.length > 0) {
            const { data: beatsData, error: beatsError } = await supabase
              .from('beats')
              .select('*, profiles(display_name, username, is_verified)')
              .in('id', sectionConfig.beatIds);
            
            if (beatsError) throw beatsError;
            if (beatsData) {
              setBeats(beatsData.map((b: any) => ({
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
            setBeats([]);
          }
          return;
        }

        let query = supabase
          .from('beats')
          .select('*, profiles(display_name, username, is_verified)')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (searchQuery) {
          query = query.ilike('title', `%${searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          const mappedBeats: Track[] = data.map((b: any) => ({
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
            tags: b.tags,
            plays: b.plays
          }));
          setBeats(mappedBeats);
        }
      } catch (error) {
        console.error('Error fetching beats:', error);
      } finally {
        setLoading(false);
      }
    }

    // Debounce search
    const timer = setTimeout(() => {
      fetchBeats();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, section]);

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{section ? (sectionTitles[section] || 'Explore') : 'Explore'}</h1>
          <p className="text-zinc-400 mb-6">{section ? `Browsing all items in ${sectionTitles[section] || section}` : 'Discover creators & sounds from across Africa'}</p>
          
          {!section && (
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab}...`} 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary transition-colors text-white"
                />
              </div>
              <button className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700">
                <SlidersHorizontal size={20} />
              </button>
            </div>
          )}

          {/* Tabs - Only show if not in a specific section */}
          {!section && (
            <div className="flex border-b border-zinc-800 mb-6">
              <button 
                onClick={() => setActiveTab('producers')}
                className={clsx(
                  "pb-3 px-4 font-bold text-sm transition-colors relative",
                  activeTab === 'producers' ? "text-primary" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Producers
                {activeTab === 'producers' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
              </button>
              <button 
                onClick={() => setActiveTab('beats')}
                className={clsx(
                  "pb-3 px-4 font-bold text-sm transition-colors relative",
                  activeTab === 'beats' ? "text-primary" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Beats
                {activeTab === 'beats' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
              </button>
            </div>
          )}
        </div>

        {activeTab === 'beats' ? (
          <>
            {/* Filter Chips - Only show if not in a specific section */}
            {!section && (
              <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar mb-4">
                {['Afrobeats', 'Amapiano', 'Afro-Pop', 'Afro-Trap', 'Highlife'].map((tag) => (
                  <button key={tag} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-medium text-zinc-400 whitespace-nowrap hover:text-white hover:border-zinc-700">
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {beats.length > 0 ? (
                  beats.map((beat) => (
                    <BeatCard key={beat.id} beat={beat} variant="list" />
                  ))
                ) : (
                  <div className="col-span-full text-center py-20 text-zinc-500">
                    {section === 'forgotten' ? "No forgotten favorites yet. Keep listening!" : "No beats found."}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <TopProducers />
            {/* We can reuse TopProducers component structure or create a grid view for producers here */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {/* Placeholder for more producers grid */}
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px]">
                  <p className="text-zinc-500 text-sm">More producers loading...</p>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
