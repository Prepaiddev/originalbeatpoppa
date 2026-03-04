"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import { Music, ShoppingCart, Play, Pause, ChevronLeft, Check, Package, Users, Star, MessageSquare, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useAuthStore } from '@/store/useAuthStore';
import VerifiedCheck from '@/components/VerifiedCheck';
import ReviewModal from '@/components/ReviewModal';
import LikeButton from '@/components/LikeButton';
import CommentSection from '@/components/CommentSection';
import clsx from 'clsx';

export default function BundleDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart, items } = useCartStore();
  const { currency, exchangeRates } = useUIStore();
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  const { user } = useAuthStore();
  
  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [beats, setBeats] = useState<Track[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  useEffect(() => {
    async function fetchBundle() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('bundles')
        .select(`
          *,
          profiles:creator_id(display_name, username, is_verified, avatar_url),
          bundle_beats(
            beat_id,
            beats(
              *,
              profiles(display_name, username, is_verified)
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        setBundle(data);
        const mappedBeats = data.bundle_beats.map((bb: any) => ({
          id: bb.beats.id,
          title: bb.beats.title,
          artist: bb.beats.profiles?.display_name || 'Unknown Producer',
          username: bb.beats.profiles?.username,
          isVerified: bb.beats.profiles?.is_verified,
          audioUrl: bb.beats.audio_url,
          coverUrl: bb.beats.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
          price: bb.beats.price,
          bpm: bb.beats.bpm,
          key: bb.beats.key,
          genre: bb.beats.genre,
          plays: bb.beats.plays
        }));
        setBeats(mappedBeats);

        // Fetch reviews
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('*, profiles:reviewer_id(display_name, avatar_url, username)')
          .eq('bundle_id', id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });
        
        if (reviewData) {
          setReviews(reviewData);
        }

        // Check if user can review & if purchased
        if (user) {
          // Check if user is the creator
          if (user.id !== data.creator_id) {
            setCanReview(true);
          }

          // Check if user purchased this bundle
          const { data: purchaseData } = await supabase
            .from('order_items')
            .select('id, orders!inner(buyer_id)')
            .eq('bundle_id', id)
            .eq('orders.buyer_id', user.id)
            .limit(1);
          
          if (purchaseData && purchaseData.length > 0) {
            setIsPurchased(true);
          }
        }
      }
      setLoading(false);
    }

    fetchBundle();
  }, [id, user]);

  const isInCart = bundle && items.some((i) => i.id === bundle.id);

  const handlePlayAll = () => {
    if (beats.length > 0) {
      play(beats[0], beats);
    }
  };

  const handlePlayBeat = (beat: Track) => {
    if (currentTrack?.id === beat.id && isPlaying) {
      pause();
    } else {
      play(beat, beats);
    }
  };

  const handleReviewSuccess = () => {
    setIsReviewModalOpen(false);
    // Refresh reviews
    const fetchReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles:reviewer_id(display_name, avatar_url, username)')
        .eq('bundle_id', id)
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

  if (!bundle) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">Bundle Not Found</h1>
        <Link href="/explore" className="text-primary hover:underline">Go back to Explore</Link>
      </div>
    );
  }

  const regularTotal = beats.reduce((sum, b) => sum + b.price, 0);
  const savings = regularTotal - bundle.price;
  const savingsPercent = Math.round((savings / regularTotal) * 100);

  return (
    <div className="min-h-screen bg-black pb-32">
      <Header />
      
      {/* Hero Header */}
      <div className="relative h-[50vh] min-h-[400px] w-full">
        <Image 
          src={bundle.cover_url || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop"} 
          alt={bundle.title} 
          fill 
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-7xl mx-auto">
          <Link 
            href="/explore" 
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors text-sm font-bold"
          >
            <ChevronLeft size={16} />
            Back to Explore
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-800 flex-shrink-0">
               <Image 
                 src={bundle.cover_url || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop"} 
                 alt={bundle.title} 
                 fill 
                 className="object-cover" 
               />
               <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Bundle Pack
               </div>
            </div>
            
            <div className="flex-1">
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">{bundle.title}</h1>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full overflow-hidden relative border border-zinc-800">
                  <Image 
                    src={bundle.profiles?.avatar_url || "https://placehold.co/100x100"} 
                    alt={bundle.profiles?.display_name} 
                    fill 
                    className="object-cover"
                  />
                </div>
                <div>
                  <Link 
                    href={bundle.profiles?.username ? `/creator/${bundle.profiles.username}` : "/creators"} 
                    className="text-lg text-white font-bold hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {bundle.profiles?.display_name}
                    {bundle.profiles?.is_verified && <VerifiedCheck size={16} />}
                  </Link>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">Creator</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <button 
                  onClick={handlePlayAll}
                  className="px-8 py-4 bg-primary text-white font-black rounded-xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                >
                  <Play size={20} fill="currentColor" />
                  Preview Bundle
                </button>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <LikeButton 
                      bundleId={bundle.id} 
                      initialLikes={bundle.likes_count || 0} 
                      size={24} 
                      requiresPurchase={true}
                      isPurchased={isPurchased}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MessageSquare size={24} />
                    <span className="text-lg font-bold">{bundle.comments_count || 0}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl">
                  <Package size={16} className="text-zinc-500" />
                  <span className="text-sm font-bold text-zinc-300">{beats.length} Professional Beats</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Tracklist & About */}
        <div className="lg:col-span-2 space-y-12">
          {/* About */}
          <section>
            <h3 className="text-xl font-black mb-4 uppercase tracking-widest text-zinc-500">About this Pack</h3>
            <p className="text-zinc-400 leading-relaxed text-lg">
              {bundle.description || "This exclusive bundle collection features high-quality instrumentals crafted for professional artists. Each track is mixed and mastered to industry standards, ready for your next hit."}
            </p>
          </section>

          {/* Tracklist */}
          <section>
            <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-zinc-500">Beats Included ({beats.length})</h3>
            <div className="space-y-2">
              {beats.map((beat, idx) => {
                const isCurrent = currentTrack?.id === beat.id;
                const isActive = isCurrent && isPlaying;
                return (
                  <div 
                    key={beat.id} 
                    className={clsx(
                      "group flex items-center p-4 rounded-2xl border transition-all cursor-pointer",
                      isCurrent ? "bg-primary/5 border-primary/20" : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700"
                    )}
                    onClick={() => handlePlayBeat(beat)}
                  >
                    <div className="w-10 text-zinc-600 font-mono text-sm group-hover:hidden">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="w-10 hidden group-hover:flex items-center justify-center">
                      {isActive ? <Pause size={16} className="text-primary" fill="currentColor" /> : <Play size={16} className="text-primary" fill="currentColor" />}
                    </div>
                    
                    <div className="w-12 h-12 relative rounded-lg overflow-hidden mr-4 flex-shrink-0">
                      <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={clsx("font-bold truncate", isCurrent ? "text-primary" : "text-white")}>{beat.title}</h4>
                      <p className="text-xs text-zinc-500">{beat.genre} • {beat.bpm} BPM • {beat.key}</p>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="hidden md:block text-right">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Indiv. Price</p>
                          <p className="text-sm font-bold text-zinc-400">{formatPrice(beat.price, currency, exchangeRates)}</p>
                       </div>
                       <Link 
                         href={`/beat/${beat.id}`}
                         className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                         onClick={(e) => e.stopPropagation()}
                       >
                         <ChevronLeft className="rotate-180" size={18} />
                       </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Reviews Section */}
          <section className="pt-12 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                  <Star className="text-yellow-500" size={28} fill="currentColor" />
                  Bundle Reviews
                </h3>
                <p className="text-zinc-500 text-sm mt-1">{reviews.length} total reviews from artists</p>
              </div>
              {canReview && (
                <button 
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-6 py-3 bg-white text-black hover:bg-zinc-200 text-sm font-black rounded-xl transition-all flex items-center gap-2 shadow-xl"
                >
                  <MessageSquare size={18} />
                  Write Review
                </button>
              )}
            </div>

            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 relative overflow-hidden border border-zinc-700">
                          {review.profiles?.avatar_url ? (
                            <Image src={review.profiles.avatar_url} alt={review.profiles.display_name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-black text-xl">
                              {review.profiles?.display_name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{review.profiles?.display_name || 'Anonymous User'}</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{new Date(review.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < review.rating ? "text-yellow-500" : "text-zinc-700"} 
                            fill={i < review.rating ? "currentColor" : "none"} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed italic">
                      "{review.comment}"
                    </p>
                    {review.is_verified_purchase && (
                      <div className="mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 w-fit px-2 py-1 rounded-md">
                        <Check size={10} strokeWidth={4} />
                        Verified Purchase
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-zinc-900/20 rounded-3xl border-2 border-dashed border-zinc-800">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                  <MessageSquare size={32} className="text-zinc-700" />
                </div>
                <h4 className="text-lg font-bold text-zinc-400 mb-2">No reviews for this bundle yet</h4>
                <p className="text-zinc-600 max-w-xs mx-auto text-sm">Be the first to share your thoughts on this production pack.</p>
              </div>
            )}

        {/* Comments Section */}
        <div className="pt-8 border-t border-zinc-800">
          <CommentSection 
            bundleId={bundle.id} 
            requiresPurchase={true}
            isPurchased={isPurchased}
          />
        </div>
          </section>
        </div>

        {/* Right Column: Pricing & Purchase */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-8">
            <div>
              <h3 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Bundle Pricing</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">{formatPrice(bundle.price, currency, exchangeRates)}</span>
                <span className="text-zinc-500 line-through font-bold">{formatPrice(regularTotal, currency, exchangeRates)}</span>
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-3 text-green-500 bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">Instant Savings</p>
                    <p className="text-lg font-bold">Save {formatPrice(savings, currency, exchangeRates)} ({savingsPercent}%)</p>
                  </div>
               </div>

               <div className="space-y-3">
                  {[
                    "Standard Professional License for all tracks",
                    "High-quality WAV & MP3 files included",
                    "Royalty-free for commercial use",
                    "Instant digital delivery after checkout"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                      <Check size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
               </div>
            </div>

            <button 
              onClick={() => addToCart(bundle, 'bundle')}
              disabled={isInCart}
              className={clsx(
                "w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/10",
                isInCart 
                  ? "bg-zinc-800 text-zinc-500 cursor-default" 
                  : "bg-primary text-white hover:scale-[1.02] active:scale-[0.98] hover:bg-primary/90"
              )}
            >
              {isInCart ? (
                <>
                  <Check size={24} />
                  Already In Cart
                </>
              ) : (
                <>
                  <ShoppingCart size={24} />
                  Buy Bundle Now
                </>
              )}
            </button>

            <div className="pt-8 border-t border-zinc-800">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold">Trust the Producer</h4>
                    <p className="text-xs text-zinc-500">Join 1,000+ artists who use these sounds.</p>
                  </div>
               </div>
               <Link 
                href={bundle.profiles?.username ? `/creator/${bundle.profiles.username}` : "/creators"}
                className="w-full py-3 border border-zinc-800 rounded-xl text-center text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all inline-block"
               >
                 View Producer Profile
               </Link>
            </div>
          </div>
        </div>
      </main>

      <ReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        bundleId={bundle.id}
        title={bundle.title}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
}
