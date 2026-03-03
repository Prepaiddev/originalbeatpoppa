"use client";

import Header from '@/components/Header';
import { UserCheck, UserMinus, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function FollowingPage() {
  const { user } = useAuthStore();
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowing() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('follows')
          .select(`
            *,
            profiles!follows_following_id_fkey(id, display_name, avatar_url, bio, location)
          `)
          .eq('follower_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFollowing(data || []);
      } catch (error) {
        console.error('Error fetching following:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFollowing();
  }, [user?.id]);

  const handleUnfollow = async (creatorId: string) => {
    if (!user) return;
    try {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', creatorId);
      setFollowing(following.filter(f => f.following_id !== creatorId));
    } catch (error) {
      console.error('Error unfollowing:', error);
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
          <h1 className="text-3xl font-bold mb-2">Following</h1>
          <p className="text-zinc-400">Creators you are following</p>
        </div>

        {following.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-xl border border-zinc-800">
            <Users className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">Not following anyone</h3>
            <p className="text-zinc-500 mb-6">Follow creators to stay updated with their new beats</p>
            <Link href="/creators" className="px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-red-600 transition-colors">
              Find Creators
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {following.map((item) => (
              <div key={item.following_id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center gap-4">
                <Link href={`/profile/${item.profiles.id}`} className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 hover:opacity-80 transition-opacity">
                  <Image 
                    src={item.profiles.avatar_url || "https://placehold.co/100x100"} 
                    alt={item.profiles.display_name} 
                    fill 
                    className="object-cover"
                  />
                </Link>
                
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${item.profiles.id}`} className="font-bold text-white hover:text-primary transition-colors truncate block">
                    {item.profiles.display_name}
                  </Link>
                  <p className="text-xs text-zinc-400 truncate">{item.profiles.location || "Global"}</p>
                </div>

                <button 
                  onClick={() => handleUnfollow(item.following_id)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-sm font-bold flex items-center gap-2"
                >
                  <UserMinus size={16} />
                  <span className="hidden sm:inline">Unfollow</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
