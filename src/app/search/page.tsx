"use client";

import Header from '@/components/Header';
import { Search, Clock, Trash2, X, ArrowRight } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { useSearchHistory } from '@/hooks/useSearchHistory';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    addToHistory(searchQuery);
    router.push(`/explore?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for beats, producers, moods..." 
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-primary transition-all text-lg text-white shadow-2xl"
          autoFocus
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Recent Searches */}
      {history.length > 0 && !query && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Recent Searches</h2>
            <button 
              onClick={clearHistory}
              className="text-[10px] font-black text-zinc-600 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              Clear All
            </button>
          </div>
          <div className="grid gap-2">
            {history.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => handleSearch(item)}
                className="group flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl hover:border-zinc-700 hover:bg-zinc-800/50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors">
                    <Clock size={18} />
                  </div>
                  <span className="font-bold text-zinc-300 group-hover:text-white transition-colors">{item}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(item);
                    }}
                    className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ArrowRight size={18} className="text-zinc-700 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Categories */}
      {!query && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 px-2">Popular Genres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['Afrobeats', 'Amapiano', 'Trap', 'Drill', 'R&B', 'Dancehall'].map((genre) => (
              <button
                key={genre}
                onClick={() => handleSearch(genre)}
                className="p-4 bg-zinc-900/30 border border-zinc-800/30 rounded-2xl text-sm font-bold text-zinc-400 hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
              >
                <span className="block mb-1 group-hover:text-primary transition-colors">#{genre}</span>
                <span className="text-[10px] text-zinc-600 font-medium">Explore sounds</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Result Action */}
      {query && (
        <button 
          onClick={() => handleSearch(query)}
          className="w-full p-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between group hover:bg-primary/20 transition-all animate-in zoom-in-95 duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Search size={24} />
            </div>
            <div className="text-left">
              <p className="font-black text-white text-lg tracking-tight">Search for "{query}"</p>
              <p className="text-sm text-primary font-bold uppercase tracking-widest">In All Categories</p>
            </div>
          </div>
          <ArrowRight size={24} className="text-primary group-hover:translate-x-2 transition-transform" />
        </button>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-3xl mx-auto px-4">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">Find your sound</h1>
          <p className="text-zinc-500 font-medium">Search through thousands of professional beats and creators.</p>
        </div>
        
        <Suspense fallback={<div className="animate-pulse bg-zinc-900 rounded-2xl h-16 w-full" />}>
          <SearchContent />
        </Suspense>
      </main>
    </div>
  );
}
