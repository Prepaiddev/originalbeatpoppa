"use client";

import Header from '@/components/Header';
import { Search, SlidersHorizontal, X, ChevronDown, Clock, Trash2 } from 'lucide-react';
import BeatCard from '@/components/BeatCard';
import BundleCard from '@/components/BundleCard';
import TopProducers from '@/components/TopProducers';
import { Suspense, useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Track } from '@/store/usePlayerStore';
import { useSearchHistory } from '@/hooks/useSearchHistory';

const GENRES = ['Afrobeats', 'Amapiano', 'Afro-Pop', 'Afro-Trap', 'Highlife', 'Dancehall', 'Reggaeton', 'Hip Hop', 'R&B'];
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const section = searchParams.get('section');
  const q = searchParams.get('q');
  
  const [activeTab, setActiveTab] = useState<'beats' | 'producers' | 'bundles'>(section ? 'beats' : 'beats');
  const [beats, setBeats] = useState<Track[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const ITEMS_PER_PAGE = 12;
  const [searchQuery, setSearchQuery] = useState(q || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    genre: '',
    bpmMin: '',
    bpmMax: '',
    key: '',
    priceMax: ''
  });
  const { user } = useAuthStore();
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const searchRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    addToHistory(query);
    setIsSearchFocused(false);
    setPage(0);
    setHasMore(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  useEffect(() => {
    if (q) setSearchQuery(q);
  }, [q]);

  const sectionTitles: Record<string, string> = {
    'mixed': 'Mixed for you',
    'quick': 'Quick picks',
    'forgotten': 'Forgotten favourites',
    'suggested': 'Audios you might like'
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
    setHasMore(true);
  };

  const clearFilters = () => {
    setFilters({
      genre: '',
      bpmMin: '',
      bpmMax: '',
      key: '',
      priceMax: ''
    });
    setPage(0);
    setHasMore(true);
  };

  useEffect(() => {
    async function fetchData() {
      if (page === 0) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      try {
        if (activeTab === 'bundles') {
          let query = supabase
            .from('bundles')
            .select('*, profiles:creator_id(display_name, username, is_verified), bundle_beats(count)')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

          if (searchQuery) {
            query = query.ilike('title', `%${searchQuery}%`);
          }

          const { data, error } = await query;
          if (error) throw error;
          
          const mappedBundles = data.map((b: any) => ({
            ...b,
            artist: b.profiles?.display_name || 'Unknown Producer',
            username: b.profiles?.username,
            isVerified: b.profiles?.is_verified,
            beatCount: b.bundle_beats?.[0]?.count || 0
          }));

          if (page === 0) setBundles(mappedBundles);
          else setBundles(prev => [...prev, ...mappedBundles]);
          setHasMore(data.length === ITEMS_PER_PAGE);
          return;
        }

        // Handle section-specific fetching
        if (section === 'forgotten') {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            setBeats([]);
            setHasMore(false);
            return;
          }

          const { data: forgottenData, error: forgottenError } = await supabase
            .from('forgotten_favorites_view')
            .select('beat_id')
            .eq('user_id', currentUser.id)
            .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

          if (forgottenData && forgottenData.length > 0) {
            const beatIds = forgottenData.map(f => f.beat_id);
            const { data: beatsData, error: beatsError } = await supabase
              .from('beats')
              .select('*, profiles(display_name, username, is_verified)')
              .in('id', beatIds);
            
            if (beatsError) throw beatsError;
            if (beatsData) {
              const mapped = beatsData.map((b: any) => ({
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

              if (page === 0) setBeats(mapped);
              else setBeats(prev => [...prev, ...mapped]);
              setHasMore(mapped.length === ITEMS_PER_PAGE);
            }
          } else {
            if (page === 0) setBeats([]);
            setHasMore(false);
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
            const start = page * ITEMS_PER_PAGE;
            const end = (page + 1) * ITEMS_PER_PAGE;
            const paginatedIds = sectionConfig.beatIds.slice(start, end);

            if (paginatedIds.length === 0) {
              setHasMore(false);
              return;
            }

            const { data: beatsData, error: beatsError } = await supabase
              .from('beats')
              .select('*, profiles(display_name, username, is_verified)')
              .in('id', paginatedIds);
            
            if (beatsError) throw beatsError;
            if (beatsData) {
              const mapped = beatsData.map((b: any) => ({
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

              if (page === 0) setBeats(mapped);
              else setBeats(prev => [...prev, ...mapped]);
              setHasMore(paginatedIds.length === ITEMS_PER_PAGE);
            }
          } else {
            if (page === 0) setBeats([]);
            setHasMore(false);
          }
          return;
        }

        // Default discovery fetch with filters and pagination
        let query = supabase
          .from('beats')
          .select('*, profiles(display_name, username, is_verified)', { count: 'exact' })
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
        }

        if (filters.genre) {
          query = query.eq('genre', filters.genre);
        }

        if (filters.bpmMin) {
          query = query.gte('bpm', parseInt(filters.bpmMin));
        }

        if (filters.bpmMax) {
          query = query.lte('bpm', parseInt(filters.bpmMax));
        }

        if (filters.key) {
          query = query.eq('key', filters.key);
        }

        if (filters.priceMax) {
          query = query.lte('price', parseFloat(filters.priceMax));
        }

        const { data, error, count } = await query;

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

          if (page === 0) setBeats(mappedBeats);
          else setBeats(prev => [...prev, ...mappedBeats]);
          
          setHasMore(data.length === ITEMS_PER_PAGE);
        }
      } catch (error) {
        console.error('Error fetching beats:', error);
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    }

    const timer = setTimeout(() => {
      fetchData();
    }, page === 0 ? 500 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery, section, filters, page, activeTab]);

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{section ? (sectionTitles[section] || 'Explore') : 'Explore'}</h1>
          <p className="text-zinc-400 mb-6">{section ? `Browsing all items in ${sectionTitles[section] || section}` : 'Discover creators & sounds from across Africa'}</p>
          
          {!section && (
            <div className="space-y-4 mb-6">
              <div className="flex gap-2 relative" ref={searchRef}>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Search ${activeTab}...`} 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary transition-colors text-white"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={clsx(
                    "w-12 h-12 flex items-center justify-center bg-zinc-900 border rounded-xl transition-all",
                    showFilters || Object.values(filters).some(v => v !== '') 
                      ? "border-primary text-primary shadow-[0_0_15px_rgba(255,51,102,0.1)]" 
                      : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                  )}
                >
                  <SlidersHorizontal size={20} />
                </button>

                {/* Search History Dropdown */}
                {isSearchFocused && history.length > 0 && !searchQuery && (
                  <div className="absolute top-full left-0 right-[56px] mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    <div className="p-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recent Searches</span>
                        <button 
                          onClick={clearHistory}
                          className="text-[10px] font-black text-zinc-600 hover:text-red-500 transition-colors uppercase tracking-widest"
                        >
                          Clear
                        </button>
                      </div>
                      {history.map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between group/item px-3 py-2 hover:bg-white/[0.03] rounded-xl cursor-pointer transition-colors"
                          onClick={() => handleSearch(item)}
                        >
                          <div className="flex items-center gap-3">
                            <Clock size={14} className="text-zinc-600 group-hover/item:text-zinc-400" />
                            <span className="text-sm text-zinc-400 group-hover/item:text-white transition-colors">{item}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromHistory(item);
                            }}
                            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Filters Drawer */}
              <div className={clsx(
                "overflow-hidden transition-all duration-300 ease-in-out bg-zinc-900/50 border border-zinc-800/50 rounded-2xl",
                showFilters ? "max-h-[500px] opacity-100 p-6 mt-4 mb-8" : "max-h-0 opacity-0 pointer-events-none"
              )}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Genre Filter */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Genre</label>
                    <div className="relative">
                      <select 
                        value={filters.genre}
                        onChange={(e) => handleFilterChange('genre', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
                      >
                        <option value="">All Genres</option>
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Key Filter */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Key</label>
                    <div className="relative">
                      <select 
                        value={filters.key}
                        onChange={(e) => handleFilterChange('key', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
                      >
                        <option value="">All Keys</option>
                        {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* BPM Filter */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">BPM Range</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters.bpmMin}
                        onChange={(e) => handleFilterChange('bpmMin', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <span className="text-zinc-600">-</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters.bpmMax}
                        onChange={(e) => handleFilterChange('bpmMax', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Max Price</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="Any"
                        value={filters.priceMax}
                        onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6 pt-6 border-t border-zinc-800/50">
                  <button 
                    onClick={clearFilters}
                    className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
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
              <button 
                onClick={() => setActiveTab('bundles')}
                className={clsx(
                  "pb-3 px-4 font-bold text-sm transition-colors relative",
                  activeTab === 'bundles' ? "text-primary" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Bundles
                {activeTab === 'bundles' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
              </button>
            </div>
          )}
        </div>

        {activeTab === 'beats' ? (
          <>
            {/* Quick Filter Chips */}
            {!section && (
              <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4">
                {['Afrobeats', 'Amapiano', 'Afro-Pop', 'Afro-Trap', 'Highlife'].map((tag) => (
                  <button 
                    key={tag} 
                    onClick={() => handleFilterChange('genre', filters.genre === tag ? '' : tag)}
                    className={clsx(
                      "px-4 py-2 border rounded-full text-xs font-bold transition-all whitespace-nowrap",
                      filters.genre === tag 
                        ? "bg-primary border-primary text-white shadow-[0_0_10px_rgba(255,51,102,0.2)]" 
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                    )}
                  >
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
                  <>
                    {beats.map((beat) => (
                      <BeatCard key={beat.id} beat={beat} variant="list" />
                    ))}
                    
                    {/* Intersection Observer Trigger */}
                    {hasMore && (
                      <div 
                        className="col-span-full py-10 flex justify-center"
                        ref={(el) => {
                          if (!el) return;
                          const observer = new IntersectionObserver(
                            (entries) => {
                              if (entries[0].isIntersecting && !isFetchingMore && hasMore) {
                                setPage(prev => prev + 1);
                              }
                            },
                            { threshold: 0.1 }
                          );
                          observer.observe(el);
                        }}
                      >
                        {isFetchingMore && (
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="col-span-full text-center py-20 text-zinc-500">
                    {section === 'forgotten' ? "No forgotten favorites yet. Keep listening!" : "No beats found."}
                  </div>
                )}
              </div>
            )}
          </>
        ) : activeTab === 'bundles' ? (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {bundles.length > 0 ? (
                  <>
                    {bundles.map((bundle) => (
                      <BundleCard key={bundle.id} bundle={bundle} />
                    ))}
                    
                    {/* Intersection Observer Trigger */}
                    {hasMore && (
                      <div 
                        className="col-span-full py-10 flex justify-center"
                        ref={(el) => {
                          if (!el) return;
                          const observer = new IntersectionObserver(
                            (entries) => {
                              if (entries[0].isIntersecting && !isFetchingMore && hasMore) {
                                setPage(prev => prev + 1);
                              }
                            },
                            { threshold: 0.1 }
                          );
                          observer.observe(el);
                        }}
                      >
                        {isFetchingMore && (
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="col-span-full text-center py-20 text-zinc-500">
                    No bundles found.
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
