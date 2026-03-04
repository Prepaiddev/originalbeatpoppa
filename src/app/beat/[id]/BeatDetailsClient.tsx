"use client";

import Header from '@/components/Header';
import { Play, Pause, ShoppingCart, Heart, Share2, Check, X, Facebook, Twitter, Linkedin, Instagram, Lock, Zap, Music } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import clsx from 'clsx';
import Link from 'next/link';
import AudioWaveformPlayer from '@/components/AudioWaveformPlayer';
import LikeButton from '@/components/LikeButton';
import CommentSection from '@/components/CommentSection';
import { useCartStore } from '@/store/useCartStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { recordActivity } from '@/lib/activity';
import StatusModal from '@/components/StatusModal';
import VerifiedCheck from '@/components/VerifiedCheck';
import ReviewModal from '@/components/ReviewModal';
import { getAdminLink } from '@/constants/admin';
import { Star, MessageSquare } from 'lucide-react';

interface License {
  id: string;
  name: string;
  price: number;
  features: string[];
  license_type_id: string;
}

export default function BeatDetailsClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currency, exchangeRates } = useUIStore();
  const { general, adminPath, fetchAdminPath } = useSettingsStore();
  
  const [beat, setBeat] = useState<Track & { description?: string, preview_duration?: number, username?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedBeats, setRelatedBeats] = useState<(Track & { username?: string })[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, title: '', message: '' });
  const [beatLicenses, setBeatLicenses] = useState<License[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string>('');
  
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  const { addToCart } = useCartStore();
  const { profile } = useAuthStore();
  const isCurrent = beat && currentTrack?.id === beat.id;
  const isActive = isCurrent && isPlaying;

  useEffect(() => {
    fetchAdminPath();
  }, [fetchAdminPath]);

  useEffect(() => {
    // Diagnostic log for Supabase config on the client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      console.error('Supabase configuration error: URL is missing or placeholder.', { url: supabaseUrl });
    }

    async function fetchBeat() {
      if (!id) return;
      setLoading(true);
      try {
        // 1. Fetch Beat with Profile
        const { data, error } = await supabase
          .from('beats')
          .select('*, profiles:artist_id(display_name, username, is_verified)')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.group('Supabase Error: fetchBeat');
          console.error('Message:', error.message);
          console.error('Details:', error.details);
          console.error('Hint:', error.hint);
          console.error('Code:', error.code);
          console.groupEnd();
          return;
        }

        if (!data) {
          console.warn(`Beat with ID ${id} not found.`);
          setBeat(null);
          return;
        }
          const mappedBeat: Track & { description?: string, preview_duration?: number, username?: string, isVerified?: boolean } = {
            id: data.id,
            title: data.title,
            artist: data.profiles?.display_name || 'Unknown Producer',
            artist_id: data.artist_id,
            username: data.profiles?.username,
            isVerified: data.profiles?.is_verified,
            audioUrl: data.audio_url,
            coverUrl: data.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
            price: data.price,
            bpm: data.bpm,
            key: data.key,
            genre: data.genre,
            tags: data.tags,
            plays: data.plays,
            description: data.description,
            preview_duration: data.preview_duration,
            likes_count: data.likes_count,
            comments_count: data.comments_count
          };
          setBeat(mappedBeat);

          // 2. Fetch Reviews
          const { data: reviewData, error: rError } = await supabase
            .from('reviews')
            .select('*, profiles:reviewer_id(display_name, avatar_url, username)')
            .eq('beat_id', id)
            .eq('status', 'published')
            .order('created_at', { ascending: false });
          
          if (!rError && reviewData) {
            setReviews(reviewData);
          }

          // Fetch comments
          const { data: commentsData } = await supabase
            .from('comments')
            .select('*, profiles:user_id(display_name, avatar_url)')
            .eq('beat_id', id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (commentsData) {
            setComments(commentsData.map((c: any) => ({
              ...c,
              user_name: c.profiles?.display_name || 'Anonymous'
            })));
          }

          // 3. Fetch Beat Licenses
          const { data: licenseData, error: lError } = await supabase
            .from('beat_licenses')
            .select('*, license_types(*)')
            .eq('beat_id', id)
            .eq('is_active', true);
          
          if (!lError && licenseData) {
            console.log('Fetched licenses for beat:', licenseData.length, licenseData);
            const mappedLicenses: License[] = licenseData.map((bl: any) => ({
              id: bl.id,
              license_type_id: bl.license_type_id,
              name: bl.license_types?.name || 'Unknown License',
              price: bl.price,
              features: bl.license_types?.features || []
            }));
            setBeatLicenses(mappedLicenses);
            if (mappedLicenses.length > 0) {
              setSelectedLicenseId(mappedLicenses[0].id);
            } else {
              console.warn('No active licenses found for beat ID:', id);
            }
          } else if (lError) {
            console.error('Error fetching licenses:', lError);
          }

          // 4. Check if favorited & following & can review
          if (user) {
            const { data: favData } = await supabase
              .from('favorites')
              .select('*')
              .eq('user_id', user.id)
              .eq('beat_id', data.id)
              .single();
            
            if (favData) setIsFavorite(true);

            if (data.artist_id) {
              const { data: followData } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', user.id)
                .eq('following_id', data.artist_id)
                .maybeSingle();
              
              if (followData) setIsFollowing(true);
            }

            // Check if user purchased this beat
            const { data: purchaseData } = await supabase
              .from('order_items')
              .select('id, orders!inner(buyer_id)')
              .eq('beat_id', id)
              .eq('orders.buyer_id', user.id)
              .limit(1);
            
            const hasPurchased = purchaseData && purchaseData.length > 0;
            if (hasPurchased) setIsPurchased(true);
            
            // Simpler check for now: if user is logged in and not the creator
            if (user.id !== data.artist_id) {
               setCanReview(true); 
            }
          }

          // 5. Fetch related beats (same artist)
          if (data.artist_id) {
             const { data: relatedData } = await supabase
              .from('beats')
              .select('*, profiles:artist_id(display_name, username, is_verified)')
              .eq('artist_id', data.artist_id)
              .neq('id', data.id)
              .limit(3);
             
             if (relatedData) {
               setRelatedBeats(relatedData.map((b: any) => ({
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
               })));
             }
          }
      } catch (error: any) {
        console.group('Network/Runtime Error: fetchBeat');
        console.error('Type:', error?.name || 'Unknown Error');
        console.error('Message:', error?.message || 'No message provided');
        console.error('Stack:', error?.stack);
        console.groupEnd();
      } finally {
        setLoading(false);
      }
    }

    fetchBeat();
  }, [id, user?.id]);

  const handlePlay = () => {
    if (!beat) return;
    if (isActive) pause();
    else play(beat, relatedBeats.length > 0 ? [beat, ...relatedBeats] : [beat]);
  };

  const handleAddToCart = async () => {
    if (!beat) return;
    if (!user) {
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to add beats to your cart.'
      });
      return;
    }
    const license = beatLicenses.find((l) => l.id === selectedLicenseId);
    if (license) {
      addToCart(beat, 'beat', {
        id: license.license_type_id,
        name: license.name,
        price: license.price,
        features: license.features
      });
      
      // Create notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'info',
        title: 'Item Added to Cart',
        message: `${beat.title} has been added to your cart.`,
        link: '/cart'
      });

      router.push('/cart');
    }
  };

  const handleBuyNow = async () => {
    console.group('Buy Now Flow');
    console.log('Context:', { beat, user, selectedLicenseId, beatLicenses });
    
    if (!beat) {
      console.warn('Beat is missing in handleBuyNow');
      console.groupEnd();
      return;
    }
    
    if (!user) {
      console.log('User not logged in, showing modal');
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to purchase beats.'
      });
      console.groupEnd();
      return;
    }
    
    // Ensure we have a selected license
    let targetLicenseId = selectedLicenseId;
    if (!targetLicenseId && beatLicenses.length > 0) {
      console.log('No selected license ID, defaulting to first available');
      targetLicenseId = beatLicenses[0].id;
      setSelectedLicenseId(targetLicenseId);
    }
    
    const license = beatLicenses.find((l) => l.id === targetLicenseId);
    console.log('Found license for purchase:', license);
    
    if (license) {
      try {
        console.log('Adding to cart and redirecting to checkout', { license });
        addToCart(beat, 'beat', {
          id: license.license_type_id,
          name: license.name,
          price: license.price,
          features: license.features
        });
        
        // Use window.location for a harder redirect if router.push is silent
         console.log('Redirecting to /checkout...');
         try {
           router.push('/checkout');
           // Set a small timeout as a backup if router.push fails silently
           setTimeout(() => {
             if (window.location.pathname !== '/checkout') {
               console.log('Router push might have stalled, using window.location as fallback');
               window.location.href = '/checkout';
             }
           }, 1000);
         } catch (pushErr) {
           console.error('router.push error:', pushErr);
           window.location.href = '/checkout';
         }
      } catch (err) {
        console.error('Error during Buy Now process:', err);
      }
    } else {
      console.error('No license found for ID:', targetLicenseId, 'in licenses:', beatLicenses);
      setAuthModal({
        isOpen: true,
        title: 'License Selection Error',
        message: beatLicenses.length === 0 
          ? 'This beat does not have any active licenses available for purchase.'
          : 'Please select a license before proceeding to purchase.'
      });
    }
    console.groupEnd();
  };

  const toggleFavorite = async () => {
    if (!user) {
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to favorite this beat.'
      });
      return;
    }
    if (!beat) return;

    const previousState = isFavorite;
    setIsFavorite(!previousState);

    try {
      if (previousState) {
        const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('beat_id', beat.id);
        if (error) throw error;
        await recordActivity(user.id, beat.id, 'unfavorite');
      } else {
        const { error } = await supabase.from('favorites').insert({ user_id: user.id, beat_id: beat.id });
        if (error) throw error;
        await recordActivity(user.id, beat.id, 'favorite');

        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'favorite',
          title: 'Beat Favorited',
          message: `You favorited ${beat.title}.`,
          link: `/beat/${beat.id}`
        });

        if (beat.artist_id !== user.id) {
           await supabase.from('notifications').insert({
            user_id: beat.artist_id,
            type: 'favorite',
            title: 'New Favorite!',
            message: `Someone favorited your beat: ${beat.title}`,
            link: `/beat/${beat.id}`
          });
        }
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
      setIsFavorite(previousState);
    }
  };

  const toggleFollow = async () => {
    if (!user) {
      setAuthModal({
        isOpen: true,
        title: 'Login Required',
        message: 'You need to be logged in to follow this producer.'
      });
      return;
    }
    if (!beat || !beat.artist_id) return;
    if (beat.artist_id === user.id) return;

    const previousState = isFollowing;
    setIsFollowing(!previousState);

    try {
      if (previousState) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', beat.artist_id);
        
        if (error) throw error;
        await recordActivity(user.id, beat.artist_id, 'unfollow', 'creator');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ 
            follower_id: user.id, 
            following_id: beat.artist_id 
          });
        
        if (error) throw error;
        await recordActivity(user.id, beat.artist_id, 'follow', 'creator');

        // Notification for the producer
        await supabase.from('notifications').insert({
          user_id: beat.artist_id,
          type: 'follow',
          title: 'New Follower!',
          message: `${profile?.display_name || user.email} is now following you.`,
          link: `/u/${profile?.username || user.id}`
        });
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
      setIsFollowing(previousState);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = beat ? `Check out this beat by ${beat.artist} on BeatPoppa!` : '';

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { name: 'Twitter', icon: Twitter, url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'LinkedIn', icon: Linkedin, url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
    { name: 'WhatsApp', icon: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}` },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
    setIsShareOpen(false);
  };

  const handleReviewSuccess = () => {
    setIsReviewModalOpen(false);
    // Refresh reviews
    const fetchReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles:reviewer_id(display_name, avatar_url, username)')
        .eq('beat_id', id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (data) setReviews(data);
    };
    fetchReviews();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!beat) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">Beat Not Found</h1>
        <Link href="/explore" className="text-primary hover:underline">Go back to Explore</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-32">
      <Header />
      
      {/* Hero / Cover */}
      <div className="relative min-h-[60vh] md:min-h-[600px] w-full flex flex-col justify-end overflow-hidden group/hero">
        {/* Immersive Background with Layered Effects */}
        <div className="absolute inset-0 z-0">
          {/* Video Backgrounds */}
          <video
            className="absolute inset-0 w-full h-full object-cover hidden md:block z-0"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/videos/background-landscape.mp4" type="video/mp4" />
          </video>
          <video
            className="absolute inset-0 w-full h-full object-cover block md:hidden z-0"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/videos/background-portrait.mp4" type="video/mp4" />
          </video>

          <Image 
            src={beat.coverUrl} 
            alt="" 
            fill 
            className="object-cover scale-110 blur-[80px] opacity-30 transition-transform duration-[20s] group-hover/hero:scale-125"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.1)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-black/40 backdrop-contrast-[1.1] backdrop-brightness-[0.9]" />
          
          {/* Animated Logo Background for Visual Interest */}
          {general?.logo_url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] md:opacity-[0.05] pointer-events-none overflow-hidden">
              <div className="relative w-[150%] md:w-[100%] aspect-square animate-slow-spin">
                <Image 
                  src={general.logo_url} 
                  alt="" 
                  fill 
                  className="object-contain"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pb-10 pt-20 md:pb-16 md:pt-32">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-16">
            {/* Main Cover Art - High Impact */}
            <div className="relative w-48 h-48 md:w-80 md:h-80 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] md:shadow-[0_40px_100px_rgba(0,0,0,0.9)] border border-white/5 flex-shrink-0 animate-fade-in group/cover">
               <Image 
                src={beat.coverUrl} 
                alt={beat.title} 
                fill 
                className="object-cover group-hover/cover:scale-110 transition-transform duration-[3s] ease-out" 
              />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/cover:opacity-100 transition-opacity duration-500" />
               <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2.5rem] md:rounded-[3rem]" />
            </div>
            
            <div className="flex-1 w-full text-center md:text-left space-y-4 md:space-y-6">
              <div className="flex flex-col items-center md:items-start gap-3 md:gap-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md animate-fade-in">
                  <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-primary"></span>
                  </span>
                  <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] text-primary drop-shadow-sm">High Quality Master</span>
                </div>
                
                <h1 className="text-4xl md:text-8xl font-black animate-fade-in-up leading-[0.9] tracking-tighter text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-balance">
                  {beat.title}
                </h1>
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 md:gap-6 pt-1 md:pt-2">
                <Link 
                  href={beat.username ? `/creator/${beat.username}` : "/creators"} 
                  className="group flex items-center gap-3 md:gap-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/5 px-4 py-2 md:px-5 md:py-2.5 rounded-full transition-all duration-300"
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden relative shadow-inner">
                    <div className="w-full h-full flex items-center justify-center text-primary font-black text-xs md:text-sm">
                      {beat.artist.charAt(0)}
                    </div>
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Produced by</span>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <span className="text-lg md:text-2xl text-white font-black group-hover:text-primary transition-colors tracking-tight">
                        {beat.artist}
                      </span>
                      {beat.isVerified && <VerifiedCheck size={14} className="text-blue-400 md:size-[18px]" />}
                    </div>
                  </div>
                </Link>
                
                {user?.id !== beat.artist_id && (
                  <button
                    onClick={toggleFollow}
                    className={clsx(
                      "px-6 py-2.5 md:px-8 md:py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 border",
                      isFollowing 
                        ? "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700" 
                        : "bg-white text-black border-white hover:bg-zinc-100 shadow-[0_10px_30px_rgba(255,255,255,0.15)]"
                    )}
                  >
                    {isFollowing ? 'Following' : 'Follow Artist'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-center gap-3.5 md:gap-8 w-full md:w-auto animate-fade-in animation-delay-300">
               {/* Play Button - The Hero Action */}
               <div className="order-2 md:order-1">
                 <button 
                  onClick={handlePlay}
                  className="w-16 h-16 md:w-32 md:h-32 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_12px_30px_rgba(225,29,72,0.4)] md:shadow-[0_40px_80px_rgba(225,29,72,0.5)] hover:scale-110 hover:shadow-[0_30px_70px_rgba(225,29,72,0.6)] transition-all duration-700 active:scale-95 group/play relative"
                  aria-label={isActive ? "Pause" : "Play"}
                >
                  {/* Pulsing effect when active */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                  )}
                  <span className="absolute inset-0 rounded-full bg-primary group-hover:bg-primary/90 transition-colors" />
                  
                  {isActive ? (
                    <Pause size={28} fill="currentColor" className="md:size-[56px] relative z-10" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1 md:ml-2.5 md:size-[56px] relative z-10 group-hover/play:translate-x-1 transition-transform" />
                  )}
                </button>
              </div>
              
              {/* Secondary Actions - Favorite & Share */}
              <div className="order-1 md:order-2 flex md:flex-col gap-2 md:gap-4 items-center md:items-end">
                <button 
                  onClick={toggleFavorite}
                  className={clsx(
                    "w-11 h-11 md:w-16 md:h-16 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group/fav backdrop-blur-xl",
                    isFavorite 
                      ? "bg-red-500 text-white border-red-500 shadow-[0_8px_16px_rgba(239,68,68,0.4)]" 
                      : "bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-black/60"
                  )}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={clsx("md:size-[28px]", isFavorite ? "animate-heartbeat" : "group-hover/fav:scale-110 transition-transform")} />
                </button>
                
                <button 
                  onClick={() => setIsShareOpen(true)}
                  className="w-11 h-11 md:w-16 md:h-16 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-black/60 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-xl"
                  aria-label="Share beat"
                >
                  <Share2 size={18} className="md:size-[28px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        
        {/* Right Column: License Picker */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="sticky top-24 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div>
                <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-1">Select License</h2>
                <p className="text-xl md:text-2xl font-black text-white tracking-tight">Ready to create?</p>
              </div>
              <Link href="/licensing" className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                Compare
              </Link>
            </div>
            
            <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
              {beatLicenses.map((license, index) => {
                const isRecommended = index === 1; // Mark the second one as recommended
                return (
                  <button
                    key={license.id}
                    onClick={() => setSelectedLicenseId(license.id)}
                    className={clsx(
                      "w-full text-left p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all duration-500 relative overflow-hidden group/license",
                      selectedLicenseId === license.id 
                        ? "border-primary bg-primary/5 shadow-[0_20px_40px_rgba(225,29,72,0.15)] scale-[1.02]" 
                        : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                    )}
                  >
                    {isRecommended && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-0.5 md:px-4 md:py-1 bg-primary text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-white rounded-b-xl">
                        Most Popular
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-1.5 md:mb-2">
                      <span className={clsx(
                        "font-black text-lg md:text-xl tracking-tighter transition-colors duration-300",
                        selectedLicenseId === license.id ? "text-primary" : "text-white group-hover/license:text-primary"
                      )}>
                        {license.name}
                      </span>
                      <span className="font-black text-white text-lg md:text-xl">{formatPrice(license.price, currency, exchangeRates, true)}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {license.features.slice(0, 3).map((feature, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Check size={9} className={selectedLicenseId === license.id ? "text-primary" : "text-zinc-600"} strokeWidth={4} />
                          <span className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {selectedLicenseId === license.id && (
                      <div className="absolute top-0 right-0 p-2 md:p-3 bg-primary text-white rounded-bl-xl md:rounded-bl-2xl">
                        <Check size={14} className="md:size-[18px]" strokeWidth={4} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 md:space-y-4">
              <button
                onClick={handleBuyNow}
                className="w-full py-5 md:py-7 bg-primary text-white font-black uppercase tracking-[0.3em] text-xs md:text-sm rounded-[1.5rem] md:rounded-[2rem] shadow-[0_20px_40px_rgba(225,29,72,0.3)] md:shadow-[0_25px_50px_rgba(225,29,72,0.4)] hover:bg-red-600 hover:scale-[1.03] transition-all duration-500 active:scale-95 flex items-center justify-center gap-3 group/buy"
              >
                <span className="group-hover/buy:scale-110 transition-transform">Buy Now • {formatPrice(beatLicenses.find(l => l.id === selectedLicenseId)?.price || 0, currency, exchangeRates, true)}</span>
              </button>
              
              <button 
                onClick={handleAddToCart}
                className="w-full py-4 md:py-5 bg-white/5 text-zinc-400 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] rounded-[1.5rem] md:rounded-[2rem] border border-white/5 hover:bg-white/10 hover:text-white transition-all duration-300 active:scale-95 flex items-center justify-center gap-3"
              >
                <ShoppingCart size={14} className="md:size-[16px]" />
                Add to Cart
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8 md:mt-10">
               {[
                 { label: 'Secure', icon: <Lock size={10} className="md:size-[12px]" /> },
                 { label: 'Instant', icon: <Zap size={10} className="md:size-[12px]" /> },
                 { label: 'HQ File', icon: <Music size={10} className="md:size-[12px]" /> }
               ].map((badge) => (
                 <div key={badge.label} className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500">
                      {badge.icon}
                    </div>
                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600">{badge.label}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8 md:space-y-12 order-2 lg:order-1">
           {/* Visualizer & Technical Specs Grid */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
             <div className="md:col-span-2 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Audio Preview</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] md:text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-widest">HQ 320kbps</span>
                  </div>
                </div>
                <AudioWaveformPlayer 
                  audioUrl={beat.audioUrl} 
                  trackId={beat.id} 
                  height={100}
                  onPlay={handlePlay}
                  onPause={handlePlay}
                />
             </div>

             <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl flex flex-col justify-between">
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 md:mb-6">Technical Specs</h3>
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">BPM</span>
                    <span className="text-base md:text-lg font-black text-white">{beat.bpm || 140}</span>
                  </div>
                  <div className="h-px bg-zinc-800/50 w-full" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Key</span>
                    <span className="text-base md:text-lg font-black text-white">{beat.key || 'Am'}</span>
                  </div>
                  <div className="h-px bg-zinc-800/50 w-full" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">Genre</span>
                    <span className="text-base md:text-lg font-black text-white">{beat.genre || 'Afrobeats'}</span>
                  </div>
                </div>
             </div>
           </div>

           {/* Description & Tags */}
           <div className="bg-zinc-900/20 rounded-2xl md:rounded-[2.5rem] p-4 md:p-10 border border-zinc-800/30">
             <div className="flex flex-col md:flex-row gap-8 md:gap-12">
               <div className="flex-1">
                 <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 md:mb-6">About this Masterpiece</h3>
                 <div className="text-zinc-400 leading-relaxed whitespace-pre-wrap text-base md:text-xl font-medium tracking-tight">
                   {beat.description ? beat.description : (
                     <p>
                       This is a high-energy {beat.genre || 'Afrobeats'} instrumental featuring heavy drums, catchy melodies, and a deep bassline. 
                       Perfect for artists looking for that authentic sound. 
                       Produced by {beat.artist} with professional analog gear for maximum warmth and punch.
                     </p>
                   )}
                 </div>
               </div>
               
               {beat.tags && beat.tags.length > 0 && (
                 <div className="md:w-64 shrink-0">
                   <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4 md:mb-6">Tags</h3>
                   <div className="flex flex-wrap gap-2">
                     {beat.tags.map((tag: string) => (
                       <span key={tag} className="px-3 py-1.5 md:px-4 md:py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors cursor-default">
                         #{tag}
                       </span>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>

           {/* More from Artist */}
           <div className="space-y-6 md:space-y-8">
             <div className="flex items-center justify-between">
               <div>
                 <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">Artist Spotlight</h3>
                 <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter">More from {beat.artist}</h2>
               </div>
               <Link href={beat.username ? `/creator/${beat.username}` : "/creators"} className="px-4 py-1.5 md:px-6 md:py-2 rounded-full border border-white/5 bg-white/5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white transition-all">
                 View All
               </Link>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
               {relatedBeats.slice(0, 4).map((otherBeat) => (
                 <Link 
                   key={otherBeat.id} 
                   href={`/beat/${otherBeat.id}`}
                   className="group relative bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl md:rounded-[2rem] p-2 md:p-4 flex items-center gap-4 hover:bg-white/5 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
                 >
                   <div className="relative w-12 h-12 md:w-20 md:h-20 rounded-lg md:rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                     <Image src={otherBeat.coverUrl} alt={otherBeat.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="text-white font-black text-sm md:text-lg truncate tracking-tight group-hover:text-primary transition-colors">{otherBeat.title}</h4>
                     <p className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">{otherBeat.genre} • {otherBeat.bpm} BPM</p>
                   </div>
                   <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all">
                     <Play size={14} fill="currentColor" />
                   </div>
                 </Link>
               ))}
             </div>
           </div>

           {/* Social Section: Reviews & Comments */}
           <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-2xl md:rounded-[3rem] p-4 md:p-10">
             <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                {/* Reviews List */}
                <div className="flex-1 space-y-6 md:space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">Community Proof</h3>
                      <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter">Reviews</h2>
                    </div>
                    <button 
                      onClick={() => setIsReviewModalOpen(true)}
                      className="px-4 md:px-6 py-2 md:py-2.5 bg-primary text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg hover:scale-105 transition-all active:scale-95"
                    >
                      Write Review
                    </button>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div key={review.id} className="bg-white/5 border border-white/5 rounded-xl md:rounded-[2rem] p-4 md:p-8 space-y-3 md:space-y-4 hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 md:gap-4">
                              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-primary font-black text-[10px] md:text-base">
                                {review.profiles?.display_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <h4 className="text-white text-xs md:text-base font-black tracking-tight">{review.profiles?.display_name || 'Anonymous'}</h4>
                                <div className="flex gap-0.5 md:gap-1 text-primary">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={8} className="md:size-[12px]" fill={i < review.rating ? "currentColor" : "none"}
                                    strokeWidth={3} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-[7px] md:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-zinc-400 text-xs md:text-base leading-relaxed font-medium italic">"{review.comment}"</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 md:py-16 bg-white/5 rounded-xl md:rounded-[2.5rem] border border-dashed border-white/10">
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] md:text-xs">No reviews yet. Be the first!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Sidebar */}
                <div className="md:w-80 space-y-6 md:space-y-8">
                   <div>
                      <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">Real-time</h3>
                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter">Talk</h2>
                   </div>
                   
                   <div className="space-y-4">
                      {comments.length > 0 ? comments.slice(0, 5).map((comment) => (
                        <div key={comment.id} className="flex gap-3 md:gap-4 group">
                           <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-900 border border-white/5 flex-shrink-0 flex items-center justify-center text-[9px] md:text-[10px] font-black text-zinc-600 group-hover:text-primary transition-colors">
                              {comment.user_name?.charAt(0) || 'C'}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5 md:mb-1">
                                <span className="text-[9px] md:text-[10px] font-black text-zinc-300 uppercase tracking-widest truncate">{comment.user_name}</span>
                              </div>
                              <p className="text-[11px] md:text-xs text-zinc-500 leading-snug line-clamp-2">{comment.content}</p>
                           </div>
                        </div>
                      )) : (
                        <p className="text-[9px] md:text-[10px] text-zinc-600 font-black uppercase tracking-widest text-center py-4">Silence is gold...</p>
                      )}
                      
                      <div className="pt-2 md:pt-4">
                        <button 
                          onClick={() => document.getElementById('discussion')?.scrollIntoView({ behavior: 'smooth' })}
                          className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl bg-zinc-900 border border-white/5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-white/10 transition-all"
                        >
                          Join the Discussion
                        </button>
                      </div>
                   </div>
                </div>
             </div>
           </div>

           {/* Full Discussion */}
           <div id="discussion" className="pt-12 border-t border-white/5">
              <div className="mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1">Deep Dive</h3>
                <h2 className="text-3xl font-black text-white tracking-tighter">Full Discussion</h2>
              </div>
              <CommentSection 
                beatId={beat.id} 
                requiresPurchase={true}
                isPurchased={isPurchased}
              />
           </div>
        </div>

        {/* Right Column: License Picker (REMOVED FROM BOTTOM) */}
      </main>

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsShareOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button 
              onClick={() => setIsShareOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold mb-6">Share this beat</h3>
            
            <div className="grid grid-cols-4 gap-4 mb-6">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-colors">
                    {typeof link.icon === 'string' ? (
                       // Simple fallback for WhatsApp if icon missing, or use custom SVG
                       <span className="font-bold">WA</span>
                    ) : (
                       <link.icon size={20} />
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 group-hover:text-white">{link.name}</span>
                </a>
              ))}
            </div>

            <div className="bg-black border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
              <input 
                type="text" 
                value={shareUrl} 
                readOnly 
                className="bg-transparent flex-1 text-sm text-zinc-400 outline-none"
              />
              <button 
                onClick={handleCopyLink}
                className="text-primary text-sm font-bold hover:underline"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      <StatusModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        type="auth"
        title={authModal.title}
        message={authModal.message}
        onAction={() => router.push('/auth/login')}
      />

      <ReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        beatId={beat.id}
        title={beat.title}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}
