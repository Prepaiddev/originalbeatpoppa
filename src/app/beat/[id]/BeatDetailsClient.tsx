"use client";

import Header from '@/components/Header';
import { Play, Pause, ShoppingCart, Heart, Share2, Check, X, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import clsx from 'clsx';
import Link from 'next/link';
import AudioWaveformPlayer from '@/components/AudioWaveformPlayer';
import { useCartStore } from '@/store/useCartStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { recordActivity } from '@/lib/activity';
import StatusModal from '@/components/StatusModal';
import VerifiedCheck from '@/components/VerifiedCheck';

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
  
  const [beat, setBeat] = useState<Track & { description?: string, preview_duration?: number, username?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedBeats, setRelatedBeats] = useState<(Track & { username?: string })[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, title: '', message: '' });
  const [beatLicenses, setBeatLicenses] = useState<License[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string>('');
  
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  const { addToCart } = useCartStore();
  const isCurrent = beat && currentTrack?.id === beat.id;
  const isActive = isCurrent && isPlaying;

  useEffect(() => {
    async function fetchBeat() {
      if (!id) return;
      setLoading(true);
      try {
        // 1. Fetch Beat with Profile
        const { data, error } = await supabase
          .from('beats')
          .select('*, profiles(display_name, username, is_verified)')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('Supabase error fetching beat:', error.message, error.details);
          return;
        }

        if (!data) {
          console.warn(`Beat with ID ${id} not found.`);
          setBeat(null);
          return;
        }
          const mappedBeat: Track & { description?: string, preview_duration?: number, username?: string } = {
            id: data.id,
            title: data.title,
            artist: data.profiles?.display_name || 'Unknown Producer',
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
            preview_duration: data.preview_duration
          };
          setBeat(mappedBeat);

          // 2. Fetch Beat Licenses
          const { data: licenseData, error: lError } = await supabase
            .from('beat_licenses')
            .select('*, license_types(*)')
            .eq('beat_id', id)
            .eq('is_active', true);
          
          if (!lError && licenseData) {
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
            }
          }

          // 3. Check if favorited
          if (user) {
            const { data: favData } = await supabase
              .from('favorites')
              .select('*')
              .eq('user_id', user.id)
              .eq('beat_id', data.id)
              .single();
            
            if (favData) setIsFavorite(true);
          }

          // 4. Fetch related beats (same artist)
          if (data.artist_id) {
             const { data: relatedData } = await supabase
              .from('beats')
              .select('*, profiles(display_name, username, is_verified)')
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
      } catch (error) {
        console.error('Error fetching beat:', error);
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
      addToCart(beat, {
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

    // Optimistic Update
    const previousState = isFavorite;
    setIsFavorite(!previousState);

    try {
      if (previousState) {
        // Remove
        const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('beat_id', beat.id);
        if (error) throw error;

        await recordActivity(user.id, beat.id, 'unfavorite');
      } else {
        // Add
        const { error } = await supabase.from('favorites').insert({ user_id: user.id, beat_id: beat.id });
        if (error) throw error;

        await recordActivity(user.id, beat.id, 'favorite');

        // Create notification for the buyer
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'info',
          title: 'Beat Favorited',
          message: `You favorited ${beat.title}.`,
          link: `/beat/${beat.id}`
        });

        // Create notification for the creator (if it's not the buyer themselves)
        if (beat.artist_id !== user.id) {
           await supabase.from('notifications').insert({
            user_id: beat.artist_id,
            type: 'info',
            title: 'New Favorite!',
            message: `Someone favorited your beat: ${beat.title}`,
            link: `/beat/${beat.id}`
          });
        }
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
      setIsFavorite(previousState); // Revert on error
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
      <div className="relative h-[40vh] min-h-[300px] w-full">
        <Image 
          src={beat.coverUrl} 
          alt={beat.title} 
          fill 
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-800 flex-shrink-0">
               <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl font-black mb-2 animate-fade-in-up">{beat.title}</h1>
              <div className="flex items-center gap-2 mb-2">
                <Link 
                  href={beat.username ? `/creator/${beat.username}` : "/creators"} 
                  className="text-xl text-primary font-bold hover:underline animate-fade-in-up animation-delay-100"
                >
                  {beat.artist}
                </Link>
                {beat.isVerified && <VerifiedCheck size={18} />}
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4 text-sm font-mono text-zinc-400 animate-fade-in-up animation-delay-200">
                <span className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">{beat.bpm || 140} BPM</span>
                <span className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">Key: {beat.key || 'Am'}</span>
                <span className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">{beat.genre || 'Afrobeats'}</span>
                {beat.preview_duration && (
                   <span className="bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 text-yellow-500">{beat.preview_duration}s Preview</span>
                )}
              </div>
            </div>

            <div className="flex gap-3 animate-fade-in-up animation-delay-300">
               <button 
                onClick={handlePlay}
                className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
              <button 
                onClick={toggleFavorite}
                className={`w-14 h-14 rounded-full border border-zinc-800 flex items-center justify-center transition-colors ${isFavorite ? 'bg-red-500 text-white border-red-500' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
              >
                <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={() => setIsShareOpen(true)}
                className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <Share2 size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
           {/* Visualizer */}
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-[180px]">
              <AudioWaveformPlayer 
                audioUrl={beat.audioUrl} 
                trackId={beat.id} 
                height={130}
                onPlay={handlePlay}
                onPause={handlePlay}
              />
           </div>

           {/* Description */}
           <div>
             <h3 className="text-xl font-bold mb-4">About this Beat</h3>
             <div className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
               {beat.description ? beat.description : (
                 <p>
                   This is a high-energy {beat.genre || 'Afrobeats'} instrumental featuring heavy drums, catchy melodies, and a deep bassline. 
                   Perfect for artists looking for that authentic sound. 
                   Produced by {beat.artist} with professional analog gear for maximum warmth and punch.
                 </p>
               )}
             </div>
           </div>

           {/* Related Beats */}
           {relatedBeats.length > 0 && (
             <div>
               <h3 className="text-xl font-bold mb-4">More from {beat.artist}</h3>
               <div className="space-y-2">
                 {relatedBeats.map((b) => (
                   <Link href={`/beat/${b.id}`} key={b.id} className="flex items-center p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer block">
                      <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-zinc-800 mr-4">
                        <Image src={b.coverUrl} alt={b.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{b.title}</h4>
                        <Link 
                          href={b.username ? `/creator/${b.username}` : "/creators"} 
                          className="text-xs text-zinc-500 hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {b.artist}
                        </Link>
                      </div>
                      <span className="font-bold text-sm text-zinc-400">{b.price === 0 ? 'Free' : formatPrice(b.price, currency, exchangeRates)}</span>
                   </Link>
                 ))}
               </div>
             </div>
           )}
        </div>

        {/* Right Column: License Picker */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Select License</h3>
            
            <div className="space-y-3 mb-8">
              {beatLicenses.map((license) => (
                <button
                  key={license.id}
                  onClick={() => setSelectedLicenseId(license.id)}
                  className={clsx(
                    "w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden",
                    selectedLicenseId === license.id 
                      ? "border-primary bg-primary/10" 
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                        <span className={clsx("font-bold", selectedLicenseId === license.id ? "text-primary" : "text-white")}>
                          {license.name}
                        </span>
                        <span className="font-bold text-white">{formatPrice(license.price, currency, exchangeRates)}</span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {license.features.join(' • ')}
                      </div>
                      {selectedLicenseId === license.id && (
                        <div className="absolute top-0 right-0 p-1.5 bg-primary rounded-bl-xl text-white">
                          <Check size={12} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleAddToCart}
                  className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Add to Cart - {formatPrice(beatLicenses.find(l => l.id === selectedLicenseId)?.price || 0, currency, exchangeRates)}
                </button>
            
            <p className="text-center text-xs text-zinc-500 mt-4">
              Secure checkout • Instant download
            </p>
          </div>
        </div>

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
    </div>
  );
}
