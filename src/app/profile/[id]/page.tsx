"use client";

import Header from '@/components/Header';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import { useEffect, useState, use } from 'react';
import { MapPin, Calendar, Globe, Mail, Star, Music, ShoppingBag, CheckCircle, Users } from 'lucide-react';
import BeatCard from '@/components/BeatCard';
import { Track } from '@/store/usePlayerStore';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';
import VerifiedCheck from '@/components/VerifiedCheck';
import { recordActivity } from '@/lib/activity';

interface Profile {
  id: string;
  display_name: string;
  username?: string;
  avatar_url: string;
  cover_url: string;
  bio: string;
  location: string;
  website: string;
  email?: string;
  role: string;
  created_at: string;
  is_verified?: boolean;
}

interface Stats {
  totalBeats: number;
  totalSales: number;
  followers: number;
  avgRating: number;
  reviewsCount: number;
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ totalBeats: 0, totalSales: 0, followers: 0, avgRating: 0, reviewsCount: 0 });
  const [beats, setBeats] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'trending' | 'newest' | 'free' | 'reviews'>('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [authModal, setAuthModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        setLoading(true);

        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (!isMounted) return;
        if (profileError) throw profileError;
        setProfile(profileData);

        // 2. Fetch Beats
        const { data: beatsData } = await supabase
          .from('beats')
          .select('*')
          .eq('artist_id', id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!isMounted) return;
        if (beatsData) {
           // ... (existing mapping logic)
          const mappedBeats = beatsData.map((b: any) => ({
             id: b.id,
             title: b.title,
             artist: profileData.display_name,
             username: profileData.username,
             audioUrl: b.audio_url,
             coverUrl: b.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
             price: b.price,
             bpm: b.bpm,
             key: b.key,
             genre: b.genre,
             plays: b.plays,
             preview_duration: b.preview_duration
          }));
          setBeats(mappedBeats);
          
          // Calculate stats
          const totalBeats = beatsData.length;
          setStats(prev => ({ ...prev, totalBeats }));
        }

        // 3. Check Follow Status
        if (currentUser) {
           try {
              const { data: followData } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', currentUser.id)
                .eq('following_id', id)
                .single();
              if (isMounted && followData) setIsFollowing(true);
           } catch (e) { }
        }

        // 4. Fetch Reviews
        try {
           const { data: artistReviews } = await supabase
             .from('reviews')
             .select(`
                *,
                profiles(display_name, avatar_url),
                beats!inner(title, artist_id)
             `)
             .eq('beats.artist_id', id)
             .order('created_at', { ascending: false })
             .limit(10);

           if (isMounted && artistReviews) {
              setReviews(artistReviews);
              setStats(prev => ({ ...prev, reviewsCount: artistReviews.length }));
           }
        } catch (e) { console.warn("Reviews fetch error", e); }

      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) fetchData();
    return () => { isMounted = false; };
  }, [id, currentUser?.id]);

  const handleFollow = async () => {
    if (!currentUser) {
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to follow this creator.'
      });
      return;
    }
    
    // Optimistic update
    setIsFollowing(!isFollowing);

    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', id);
        await recordActivity(currentUser.id, id, 'unfollow', 'creator');
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: id });
        await recordActivity(currentUser.id, id, 'follow', 'creator');
      }
    } catch (err) {
      setIsFollowing(!isFollowing); // Revert
      console.error("Follow error:", err);
    }
  };

  const handleContact = () => {
    if (!currentUser) {
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to contact this creator.'
      });
      return;
    }
    // Existing contact logic or future implementation
    window.location.href = `mailto:${profile?.email || ''}`;
  };

  const filteredBeats = beats.filter(beat => {
    if (activeTab === 'free') return beat.price === 0;
    // For trending/newest we can sort, but basic filter is same for 'all'
    return true;
  }).sort((a, b) => {
    if (activeTab === 'trending') return (b.plays || 0) - (a.plays || 0); // Sort by plays (mock property for now if not in DB)
    if (activeTab === 'newest') return -1; // Already sorted by created_at desc
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />

      {/* 1. Header Section */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-64 md:h-80 w-full relative bg-zinc-900">
           <Image 
             src={profile.cover_url || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1200&auto=format&fit=crop"} 
             alt="Cover" 
             fill 
             className="object-cover opacity-80"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative -mt-24">
           <div className="flex flex-col md:flex-row items-end gap-6">
              {/* Profile Picture */}
              <div className="w-40 h-40 rounded-full border-4 border-black bg-zinc-800 relative overflow-hidden shadow-2xl">
                 <Image 
                   src={profile.avatar_url || "https://placehold.co/400x400/101010/ffffff?text=User"} 
                   alt={profile.display_name} 
                   fill 
                   className="object-cover"
                 />
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 pb-4">
                 <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-black text-white">{profile.display_name}</h1>
                    {profile.is_verified && <VerifiedCheck size={20} />}
                 </div>
                 
                 <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mb-4">
                    {profile.location && (
                       <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location}</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar size={14} /> Member since {new Date(profile.created_at).getFullYear()}</span>
                    {profile.website && (
                       <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Globe size={14} /> Website
                       </a>
                    )}
                 </div>

                 <div className="flex gap-3">
                    <button 
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-full font-bold transition-all ${
                        isFollowing 
                          ? 'bg-zinc-800 text-white border border-zinc-700 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500' 
                          : 'bg-primary text-white hover:bg-rose-600 shadow-lg shadow-primary/20'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={handleContact}
                      className="px-6 py-2 rounded-full font-bold bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                       <Mail size={18} /> Contact
                    </button>
                 </div>
              </div>

              {/* Stats (Trust Builder) */}
              <div className="flex gap-6 pb-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-md">
                 <div className="text-center">
                    <div className="text-2xl font-black text-white">{stats.totalBeats}</div>
                    <div className="text-xs text-zinc-500 uppercase font-bold">Beats</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-black text-white flex items-center justify-center gap-1">
                       4.9 <Star size={14} className="text-yellow-500 fill-current" />
                    </div>
                    <div className="text-xs text-zinc-500 uppercase font-bold">Rating</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-black text-white">{stats.followers}</div>
                    <div className="text-xs text-zinc-500 uppercase font-bold">Followers</div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* 2. Content Section */}
      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
         
         {/* Sidebar (Bio) */}
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
               <h3 className="font-bold text-white mb-4">About</h3>
               <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                 {profile.bio || "No bio yet."}
               </p>
               
               {/* Socials Placeholder */}
               <div className="flex gap-3 mt-4">
                  {/* Icons would go here */}
               </div>
            </div>
         </div>

         {/* Main Content (Beats) */}
         <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-zinc-800 mb-6 overflow-x-auto">
               {['all', 'trending', 'newest', 'free', 'reviews'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-3 px-2 font-bold capitalize whitespace-nowrap transition-colors border-b-2 ${
                       activeTab === tab 
                         ? 'text-primary border-primary' 
                         : 'text-zinc-500 border-transparent hover:text-white'
                    }`}
                  >
                    {tab === 'all' ? 'All Beats' : tab === 'reviews' ? `Reviews (${stats.reviewsCount})` : tab}
                  </button>
               ))}
            </div>

            {/* Beat Grid */}
            {activeTab === 'reviews' ? (
              <div className="space-y-4">
                 {reviews.length > 0 ? (
                    reviews.map(review => (
                       <div key={review.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                          <div className="flex items-start justify-between mb-4">
                             <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                                   <Image 
                                     src={review.profiles?.avatar_url || "https://placehold.co/100x100"} 
                                     alt="Reviewer" 
                                     fill 
                                     className="object-cover"
                                   />
                                </div>
                                <div>
                                   <h4 className="font-bold text-white text-sm">{review.profiles?.display_name || "User"}</h4>
                                   <div className="flex items-center gap-1 text-xs text-zinc-500">
                                      {review.is_verified_purchase && (
                                         <span className="text-green-500 flex items-center gap-0.5 font-bold">
                                            <CheckCircle size={10} /> Verified Purchase
                                         </span>
                                      )}
                                      <span>•</span>
                                      <span>{new Date(review.created_at).toLocaleDateString()}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                   <Star key={i} size={14} className={i < review.rating ? "text-yellow-500 fill-current" : "text-zinc-700"} />
                                ))}
                             </div>
                          </div>
                          <p className="text-zinc-300 text-sm mb-3">{review.comment}</p>
                          <div className="text-xs text-zinc-500 bg-black/20 p-2 rounded inline-block">
                             Review for beat: <span className="text-primary">{review.beats?.title}</span>
                          </div>
                       </div>
                    ))
                 ) : (
                    <div className="text-center py-12 text-zinc-500">
                       No reviews yet.
                    </div>
                 )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {filteredBeats.length > 0 ? (
                    filteredBeats.map(beat => (
                       <BeatCard key={beat.id} beat={beat} variant="list" showWaveform={true} />
                    ))
                 ) : (
                    <div className="col-span-full py-12 text-center text-zinc-500">
                       No beats found in this category.
                    </div>
                 )}
              </div>
            )}
         </div>

      </div>
      
      <StatusModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        type="auth"
        title={authModal.title}
        message={authModal.message}
        onAction={() => router.push('/auth/login')}
      />
    </div>
  );
}
