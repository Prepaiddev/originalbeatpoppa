"use client";

import Header from '@/components/Header';
import { use } from 'react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { MapPin, Calendar, Clock, Star, MessageSquare, CheckCircle, UserPlus, Mail, Instagram, Twitter, Youtube, Globe, Users } from 'lucide-react';
import BeatCard from '@/components/BeatCard';
import VerifiedCheck from '@/components/VerifiedCheck';
import { Track } from '@/store/usePlayerStore';
import { useAuthStore } from '@/store/useAuthStore';
import StatusModal from '@/components/StatusModal';
import { useRouter } from 'next/navigation';
import { recordActivity } from '@/lib/activity';

interface CreatorProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  location: string;
  created_at: string;
  is_verified: boolean;
  social_links: Record<string, string>;
  // From creator_profiles join
  cover_url?: string;
  genres?: string[];
  verification_status?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  is_verified_purchase: boolean;
  reviewer: {
    display_name: string;
    avatar_url: string;
  };
  beat?: {
    title: string;
  };
  bundle?: {
    title: string;
  };
}

interface CreatorStats {
  total_beats: number;
  total_sales: number;
  followers: number;
  following: number;
  avg_rating: number;
}

interface FollowerProfile {
  follower_id: string;
  profiles: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string;
    bio: string;
  };
}

interface RecommendedCreator {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  is_verified: boolean;
}

export default function CreatorProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore(state => state.user);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [beats, setBeats] = useState<Track[]>([]);
  const [trendingBeats, setTrendingBeats] = useState<Track[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<CreatorStats>({ total_beats: 0, total_sales: 0, followers: 0, following: 0, avg_rating: 0 });
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [recommendedCreators, setRecommendedCreators] = useState<RecommendedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'beats' | 'trending' | 'reviews' | 'followers'>('beats');
  const [isFollowing, setIsFollowing] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    let isMounted = true;
    if (!username || username === 'null') {
      setLoading(false);
      return;
    }

    async function fetchCreator() {
      try {
        setLoading(true);
        // 1. Fetch Profile + Creator Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            *,
            creator_profiles (*)
          `)
          .eq('username', username)
          .single();

        if (!isMounted) return;

        if (profileError || !profileData) {
          console.error("Creator not found for username:", username);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        const fullProfile = {
          ...profileData,
          cover_url: profileData.creator_profiles?.cover_url,
          genres: profileData.creator_profiles?.genres,
          verification_status: profileData.creator_profiles?.verification_status
        };
        setProfile(fullProfile);

        // 2. Fetch Stats & Reviews & Followers
        const [beatsRes, bundlesRes, followersRes, followingRes, salesRes, recommendedRes] = await Promise.all([
          supabase.from('beats').select('id', { count: 'exact' }).eq('artist_id', profileData.id),
          supabase.from('bundles').select('id', { count: 'exact' }).eq('creator_id', profileData.id),
          supabase.from('follows').select('follower_id, profiles!follower_id(id, display_name, username, avatar_url, bio)').eq('following_id', profileData.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
          supabase.from('order_items').select('*, beats!inner(*)').eq('beats.artist_id', profileData.id),
          supabase.from('profiles').select('id, display_name, username, avatar_url, is_verified').eq('is_verified', true).neq('id', profileData.id).limit(3)
        ]);

        const reviewsRes = await supabase
          .from('reviews')
          .select(`
            *,
            reviewer:profiles!reviewer_id(display_name, avatar_url),
            beat:beats(title, artist_id),
            bundle:bundles(title, creator_id)
          `)
          .or(`beat_id.in.(${beatsRes.data?.map(b => b.id).join(',') || '00000000-0000-0000-0000-000000000000'}),bundle_id.in.(${bundlesRes.data?.map(b => b.id).join(',') || '00000000-0000-0000-0000-000000000000'})`)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        const totalReviews = reviewsRes.data?.length || 0;
        const avgRating = totalReviews > 0 
          ? reviewsRes.data!.reduce((acc, r) => acc + r.rating, 0) / totalReviews 
          : 0;

        setStats({
          total_beats: beatsRes.count || 0,
          followers: followersRes.data?.length || 0,
          following: followingRes.count || 0,
          total_sales: salesRes.data?.length || 0,
          avg_rating: avgRating
        });

        if (followersRes.data) {
          setFollowers(followersRes.data as any);
        }

        if (recommendedRes.data) {
          setRecommendedCreators(recommendedRes.data as any);
        }

        if (reviewsRes.data) {
          setReviews(reviewsRes.data as any);
        }

        // 3. Fetch Beats (Recent & Trending)
        const { data: beatsData } = await supabase
          .from('beats')
          .select('*')
          .eq('artist_id', profileData.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const { data: trendingData } = await supabase
          .from('beats')
          .select('*')
          .eq('artist_id', profileData.id)
          .eq('is_active', true)
          .order('plays', { ascending: false })
          .limit(10);

        if (!isMounted) return;

        const mapBeatToTrack = (b: any) => ({
          id: b.id,
          title: b.title,
          artist: profileData.display_name,
          username: profileData.username,
          audioUrl: b.audio_url,
          coverUrl: b.cover_url,
          price: b.price,
          bpm: b.bpm,
          key: b.key,
          genre: b.genre,
          plays: b.plays,
          preview_duration: b.preview_duration
        });

        if (beatsData) setBeats(beatsData.map(mapBeatToTrack));
        if (trendingData) setTrendingBeats(trendingData.map(mapBeatToTrack));

      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    fetchCreator();
    return () => { isMounted = false; };
  }, [username, currentUser?.id]);

  // Separate Effect for Follow Status
  useEffect(() => {
    let isMounted = true;
    async function checkFollow() {
      if (!currentUser || !profile?.id) {
        if (isMounted) setIsFollowing(false);
        return;
      }
      
      try {
        const { data: follow } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
          .single();
        
        if (isMounted) setIsFollowing(!!follow);
      } catch (err) {
        console.error("Error checking follow status:", err);
      }
    }
    
    checkFollow();
    return () => { isMounted = false; };
  }, [currentUser?.id, profile?.id]);

  const handleFollow = async () => {
     if (!profile) return;
     if (!currentUser) {
       setAuthModal({
         isOpen: true,
         title: 'Login Required',
         message: 'You need to be logged in to follow this creator.'
       });
       return;
     }
     
     const newIsFollowing = !isFollowing;
     setIsFollowing(newIsFollowing); // Optimistic
     
     // Update stats and followers list optimistically
     setStats(prev => ({
       ...prev,
       followers: newIsFollowing ? prev.followers + 1 : prev.followers - 1
     }));

     if (newIsFollowing) {
       // Mock add to followers list if we want to show it immediately
       const mockFollower: FollowerProfile = {
         follower_id: currentUser.id,
         profiles: {
           id: currentUser.id,
           display_name: currentUser.user_metadata?.full_name || currentUser.email || 'User',
           username: currentUser.user_metadata?.username || 'user',
           avatar_url: currentUser.user_metadata?.avatar_url || '',
           bio: ''
         }
       };
       setFollowers(prev => [mockFollower, ...prev]);
     } else {
       setFollowers(prev => prev.filter(f => f.follower_id !== currentUser.id));
     }
     
     if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id);
        await recordActivity(currentUser.id, profile.id, 'unfollow', 'creator');
     } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id });
        await recordActivity(currentUser.id, profile.id, 'follow', 'creator');
        
        // Add notification for the creator
        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'follow',
          title: 'New Follower',
          message: `${currentUser.user_metadata?.full_name || currentUser.email} started following you.`,
          link: `/creator/${profile.username}`
        });
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
    window.location.href = `mailto:${profile?.social_links?.email || ''}`;
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Storefront...</div>;
  if (!profile) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Creator not found</div>;

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      {/* Cover Image */}
      <div className="h-48 md:h-80 w-full relative bg-zinc-900">
         <Image src={profile.cover_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200"} alt="Cover" fill className="object-cover opacity-60" priority />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      <main className="max-w-7xl mx-auto px-4 -mt-16 md:-mt-24 relative z-10">
         <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-8">
            {/* Avatar */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black bg-zinc-800 relative overflow-hidden shadow-2xl flex-shrink-0">
               <Image src={profile.avatar_url || "https://placehold.co/400"} alt={profile.display_name} fill className="object-cover" />
            </div>
            
            {/* Info */}
            <div className="flex-1 pb-2 text-center md:text-left w-full">
               <div className="flex flex-col md:flex-row items-center md:items-end gap-2 mb-2 md:mb-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl md:text-4xl font-black text-white">{profile.display_name}</h1>
                    {profile.is_verified && <VerifiedCheck size={24} />}
                  </div>
                  <p className="text-zinc-400 text-sm md:mb-1">@{profile.username}</p>
               </div>
               
               <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 text-xs md:text-sm text-zinc-400 mb-6">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location || "Global"}</span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> Joined {new Date(profile.created_at).getFullYear()}</span>
                  <div className="flex items-center gap-4 md:gap-2 md:ml-auto">
                    {profile.social_links?.instagram && (
                      <a href={`https://instagram.com/${profile.social_links.instagram}`} target="_blank" className="text-zinc-500 hover:text-pink-500 transition-colors">
                        <Instagram size={18} />
                      </a>
                    )}
                    {profile.social_links?.twitter && (
                      <a href={`https://twitter.com/${profile.social_links.twitter}`} target="_blank" className="text-zinc-500 hover:text-blue-400 transition-colors">
                        <Twitter size={18} />
                      </a>
                    )}
                    {profile.social_links?.youtube && (
                      <a href={`https://youtube.com/${profile.social_links.youtube}`} target="_blank" className="text-zinc-500 hover:text-red-500 transition-colors">
                        <Youtube size={18} />
                      </a>
                    )}
                  </div>
               </div>

               <div className="flex justify-center md:justify-start gap-3">
                  <button onClick={handleFollow} className={`flex-1 md:flex-none px-8 py-2.5 rounded-full font-bold transition-all flex items-center justify-center gap-2 ${isFollowing ? 'bg-zinc-800 text-white' : 'bg-primary text-white hover:bg-rose-600'}`}>
                     {isFollowing ? 'Following' : <><UserPlus size={18} /> Follow</>}
                  </button>
                  <button onClick={handleContact} className="flex-1 md:flex-none px-6 py-2.5 rounded-full font-bold bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                     <MessageSquare size={18} /> Message
                  </button>
               </div>
            </div>

            {/* Stats Box */}
            <div className="w-full md:w-auto bg-zinc-900/80 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-zinc-800 flex justify-between md:justify-start gap-4 md:gap-8 mb-2">
               <div className="text-center">
                  <div className="text-xl md:text-2xl font-black text-white">{stats.total_beats}</div>
                  <div className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-wider">Beats</div>
               </div>
               <div className="text-center">
                  <div className="text-xl md:text-2xl font-black text-white">{stats.total_sales}</div>
                  <div className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-wider">Sales</div>
               </div>
               <div className="text-center">
                  <div className="text-xl md:text-2xl font-black text-white">{stats.followers}</div>
                  <div className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-wider">Followers</div>
               </div>
               <div className="text-center border-l border-zinc-800 pl-4 md:pl-8">
                  <div className="flex items-center justify-center gap-1 text-xl md:text-2xl font-black text-white">
                    {stats.avg_rating.toFixed(1)}
                    <Star size={16} className="text-yellow-500 fill-current" />
                  </div>
                  <div className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-wider">Rating</div>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar: Bio & Genres */}
            <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="font-bold text-white mb-3">About Producer</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-6">{profile.bio || "No bio available."}</p>
                  
                  {profile.genres && profile.genres.length > 0 && (
                    <>
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Specialized In</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.genres.map(genre => (
                          <span key={genre} className="px-3 py-1 bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-full uppercase">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
               </div>

               {/* Recommended Creators */}
               {recommendedCreators.length > 0 && (
                 <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                   <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                     <Users size={18} className="text-primary" />
                     Discover More
                   </h3>
                   <div className="space-y-4">
                     {recommendedCreators.map(creator => (
                       <button 
                         key={creator.id}
                         onClick={() => router.push(`/creator/${creator.username}`)}
                         className="flex items-center gap-3 w-full text-left group"
                       >
                         <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 group-hover:ring-2 ring-primary/50 transition-all">
                           <Image 
                             src={creator.avatar_url || "https://placehold.co/100"} 
                             alt={creator.display_name} 
                             fill 
                             className="object-cover" 
                           />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="font-bold text-white text-xs truncate flex items-center gap-1">
                             {creator.display_name}
                             {creator.is_verified && <VerifiedCheck size={10} />}
                           </div>
                           <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                             @{creator.username}
                           </div>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                           <Globe size={14} className="text-primary" />
                         </div>
                       </button>
                     ))}
                   </div>
                 </div>
               )}
            </div>

            {/* Main Content: Beats & Reviews */}
            <div className="lg:col-span-3 order-1 lg:order-2">
               <div className="flex gap-4 md:gap-6 border-b border-zinc-800 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
                  {['beats', 'trending', 'reviews', 'followers'].map(tab => (
                     <button 
                       key={tab}
                       onClick={() => setActiveTab(tab as any)}
                       className={`pb-4 text-[10px] md:text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab ? 'text-primary border-primary' : 'text-zinc-500 border-transparent hover:text-white'}`}
                     >
                       {tab === 'reviews' ? `Reviews (${reviews.length})` : 
                        tab === 'followers' ? `Followers (${stats.followers})` : tab}
                     </button>
                  ))}
               </div>

               {activeTab === 'reviews' ? (
                 <div className="space-y-4">
                   {reviews.length > 0 ? (
                     reviews.map(review => (
                       <div key={review.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                         <div className="flex items-start justify-between mb-4">
                           <div className="flex items-center gap-3">
                             <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                               <Image 
                                 src={review.reviewer.avatar_url || "https://placehold.co/100"} 
                                 alt={review.reviewer.display_name} 
                                 fill 
                                 className="object-cover" 
                               />
                             </div>
                             <div>
                               <div className="font-bold text-white text-sm">{review.reviewer.display_name}</div>
                               <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                                 Reviewed <span className="text-primary">{review.beat?.title || review.bundle?.title || 'Unknown Item'}</span>
                               </div>
                             </div>
                           </div>
                           <div className="flex flex-col items-end">
                             <div className="flex gap-0.5 mb-1">
                               {[...Array(5)].map((_, i) => (
                                 <Star 
                                   key={i} 
                                   size={14} 
                                   className={i < review.rating ? "text-yellow-500 fill-current" : "text-zinc-700"} 
                                 />
                               ))}
                             </div>
                             <div className="text-[10px] text-zinc-600 font-medium">
                               {new Date(review.created_at).toLocaleDateString()}
                             </div>
                           </div>
                         </div>
                         <p className="text-zinc-300 text-sm leading-relaxed mb-4">{review.comment}</p>
                         {review.is_verified_purchase && (
                           <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-500 rounded text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                             <CheckCircle size={10} />
                             Verified Purchase
                           </div>
                         )}
                       </div>
                     ))
                   ) : (
                     <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
                       <Star size={48} className="text-zinc-700 mx-auto mb-4" />
                       <h3 className="text-xl font-bold text-white mb-2">No Reviews Yet</h3>
                       <p className="text-zinc-500 max-w-xs mx-auto">This creator hasn't received any reviews yet. Be the first to purchase a beat and leave feedback!</p>
                     </div>
                   )}
                 </div>
               ) : activeTab === 'followers' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {followers.length > 0 ? (
                     followers.map(f => (
                       <div key={f.follower_id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 group hover:bg-zinc-900 transition-colors">
                         <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                           <Image 
                             src={f.profiles.avatar_url || "https://placehold.co/100"} 
                             alt={f.profiles.display_name} 
                             fill 
                             className="object-cover" 
                           />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="font-bold text-white text-sm truncate">{f.profiles.display_name}</div>
                           <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                             @{f.profiles.username}
                           </div>
                         </div>
                         <button 
                           onClick={() => router.push(`/u/${f.profiles.username}`)}
                           className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                         >
                           <Globe size={16} />
                         </button>
                       </div>
                     ))
                   ) : (
                     <div className="col-span-full py-20 text-center bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
                       <UserPlus size={48} className="text-zinc-700 mx-auto mb-4" />
                       <h3 className="text-xl font-bold text-white mb-2">No Followers Yet</h3>
                       <p className="text-zinc-500 max-w-xs mx-auto">Be the first to follow this creator to stay updated with their latest releases!</p>
                     </div>
                   )}
                 </div>
               ) : activeTab === 'trending' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trendingBeats.length > 0 ? (
                      trendingBeats.map(beat => (
                        <BeatCard key={beat.id} beat={beat} variant="list" showWaveform={true} />
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center text-zinc-500">No trending beats yet.</div>
                    )}
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {beats.map(beat => (
                       <BeatCard key={beat.id} beat={beat} variant="list" showWaveform={true} />
                    ))}
                 </div>
               )}
            </div>
         </div>
      </main>

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
