"use client";

import Header from '@/components/Header';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import VerifiedCheck from '@/components/VerifiedCheck';

interface Creator {
  id: string;
  display_name: string;
  avatar_url: string | null;
  location: string | null;
  is_verified: boolean;
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCreators() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, location, is_verified')
          .eq('role', 'creator')
          .limit(20); // Limit for now

        if (error) throw error;
        setCreators(data || []);
      } catch (err) {
        console.error("Error fetching creators:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCreators();
  }, []);

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">Explore Creators</h1>
        <p className="text-zinc-400 mb-8">Discover the best producers on the platform.</p>
        
        {loading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {[1,2,3,4,5].map(i => (
                 <div key={i} className="aspect-square bg-zinc-900 rounded-2xl animate-pulse" />
              ))}
           </div>
        ) : creators.length === 0 ? (
           <div className="text-center py-20 text-zinc-500">
             No creators found yet.
           </div>
        ) : (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
             {creators.map(creator => (
               <Link href={`/profile/${creator.id}`} key={creator.id} className="group">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800 mb-3 border border-zinc-800 group-hover:border-primary transition-colors">
                     <Image 
                       src={creator.avatar_url || "https://placehold.co/400x400/101010/ffffff?text=User"} 
                       alt={creator.display_name || "Creator"}
                       fill
                       className="object-cover group-hover:scale-105 transition-transform duration-500"
                     />
                  </div>
                  <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {creator.display_name || "Unknown Creator"}
                    {creator.is_verified && <VerifiedCheck size={14} />}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate">{creator.location || "Global"}</p>
               </Link>
             ))}
           </div>
        )}
      </main>
    </div>
  );
}

