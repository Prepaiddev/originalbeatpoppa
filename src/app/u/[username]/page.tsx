import Header from '@/components/Header';
import { createClient } from '@/lib/supabase/server';
import Image from 'next/image';
import { MapPin, Calendar, Heart, Users } from 'lucide-react';
import { notFound } from 'next/navigation';

interface BuyerProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  location: string;
  created_at: string;
}

interface BuyerStats {
  orders: number;
  favorites: number;
  following: number;
}

export default async function BuyerProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Fetch public stats (favorites and following counts)
  const [favoritesCount, followingCount] = await Promise.all([
    supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id)
  ]);

  const stats: BuyerStats = {
    orders: 0, // Keep private
    favorites: favoritesCount.count || 0,
    following: followingCount.count || 0
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 pt-32">
         <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header / Banner Area */}
            <div className="h-32 bg-gradient-to-r from-zinc-800 to-zinc-900 relative">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            </div>

            <div className="px-8 pb-8 flex flex-col items-center text-center -mt-16 relative z-10">
              <div className="relative w-32 h-32 rounded-full border-8 border-black bg-zinc-800 overflow-hidden mb-4 shadow-xl">
                 <Image src={profile.avatar_url || "https://placehold.co/400"} alt={profile.display_name} fill className="object-cover" />
              </div>
              
              <h1 className="text-3xl font-black text-white mb-1">{profile.display_name}</h1>
              <p className="text-zinc-500 text-sm mb-6 font-medium">@{profile.username}</p>
              
              <div className="flex flex-wrap justify-center gap-6 text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-8">
                 <span className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 rounded-full border border-zinc-800/50">
                   <MapPin size={12} className="text-primary" /> 
                   {profile.location || "Global"}
                 </span>
                 <span className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 rounded-full border border-zinc-800/50">
                   <Calendar size={12} className="text-primary" /> 
                   Joined {new Date(profile.created_at).getFullYear()}
                 </span>
              </div>

              {profile.bio && (
                 <div className="max-w-xl bg-black/20 p-6 rounded-2xl w-full border border-zinc-800/50 mb-10">
                    <p className="text-zinc-400 text-sm leading-relaxed italic">"{profile.bio}"</p>
                 </div>
              )}

              {/* Public Stats Display */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center group hover:border-red-500/30 transition-all">
                  <Heart size={18} className="text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xl font-black text-white">{stats.favorites}</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Favorites</span>
                </div>
                <div className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center group hover:border-blue-500/30 transition-all">
                  <Users size={18} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xl font-black text-white">{stats.following}</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Following</span>
                </div>
              </div>
            </div>
         </div>

         {/* Privacy Note */}
         <div className="mt-12 text-center">
           <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em]">
             Purchase history is private for this user
           </p>
         </div>
      </main>
    </div>
  );
}
