"use client";

import Header from '@/components/Header';
import { Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
      <input 
        type="text" 
        defaultValue={initialQuery}
        placeholder="Search for beats, producers..." 
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary transition-colors text-white"
        autoFocus
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-4">Search</h1>
        
        <Suspense fallback={<div>Loading...</div>}>
          <SearchContent />
        </Suspense>
        
        <div className="mt-12 text-center text-zinc-500">
          <p className="mb-2">Start typing to find beats...</p>
          <p className="text-xs text-zinc-600">Try "Afrobeats", "Amapiano", or "140 BPM"</p>
        </div>
      </main>
    </div>
  );
}
