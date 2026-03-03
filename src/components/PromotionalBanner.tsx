"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Music, User, Trophy, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePlayerStore } from '@/store/usePlayerStore';
import { supabase } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

interface BannerItem {
  id: string;
  type: 'producer' | 'beat' | 'artist';
  design_type?: 'floating' | 'chat' | 'large';
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  beat_data?: any;
}

interface PromotionalBannerProps {
  targetDesignType?: 'floating' | 'chat' | 'large';
}

export default function PromotionalBanner({ targetDesignType }: PromotionalBannerProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<BannerItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [showGesture, setShowGesture] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const minSwipeDistance = 50;
  const [bannerSettings, setBannerSettings] = useState({
    is_enabled: true,
    auto_slide: true,
    slide_duration: 8
  });
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();

  useEffect(() => {
    // Hide banners if we are on an admin page or a secured page
    const isAdminPath = pathname?.includes('admin') || pathname?.includes('beatpoppa-secured');
    if (isAdminPath) {
      setIsVisible(false);
      return;
    }

    // Check if user has closed this specific design type in this session
    const storageKey = `promo_banner_closed_${targetDesignType || 'all'}`;
    const isClosed = sessionStorage.getItem(storageKey);
    if (!isClosed) {
      fetchBannerData();
    }
  }, [targetDesignType, pathname]);

  const fetchBannerData = async () => {
    try {
      // Fetch settings and items in parallel
      const [settingsRes, itemsRes] = await Promise.all([
        supabase.from('platform_settings').select('value').eq('key', 'banner_settings').single(),
        supabase.from('promotional_banners').select(`
          *,
          beat_data:beats (
            id,
            title,
            cover_url,
            audio_url,
            price,
            profiles (
              display_name
            )
          )
        `).eq('is_active', true).order('order_index', { ascending: true })
      ]);

      if (settingsRes.data?.value) {
        setBannerSettings(settingsRes.data.value);
      }

      if (itemsRes.error) {
        console.error('Supabase error fetching banners:', itemsRes.error);
        throw itemsRes.error;
      }

      if (itemsRes.data && itemsRes.data.length > 0) {
        let filteredItems = itemsRes.data.map(item => ({
          ...item,
          design_type: item.design_type || 'floating'
        }));

        // Filter by targetDesignType if provided
        if (targetDesignType) {
          filteredItems = filteredItems.filter(item => item.design_type === targetDesignType);
        }

        if (filteredItems.length > 0) {
          setItems(filteredItems);
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } else {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error in fetchBannerData:', error);
      setIsVisible(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    const storageKey = `promo_banner_closed_${targetDesignType || 'all'}`;
    sessionStorage.setItem(storageKey, 'true');
  };

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => {
      if (items.length === 0) return 0;
      return (prev + 1) % items.length;
    });
    setProgress(0);
  }, [items.length]); // Depend on items.length instead of items to avoid unnecessary recreations

  const prevSlide = () => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setProgress(0);
  };

  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchEnd(null);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setTouchStart(clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setTouchEnd(clientX);
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      if (!hasSwiped) {
        setHasSwiped(true);
        setShowGesture(false);
      }
      
      if (isLeftSwipe) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    // Show gesture if there are multiple items and user hasn't swiped yet
    if (isVisible && items.length > 1 && !hasSwiped) {
      const timer = setTimeout(() => {
        setShowGesture(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowGesture(false);
    }
  }, [items.length, isVisible, hasSwiped]);

  // Handle auto-playing audio when sliding into a beat banner
  useEffect(() => {
    if (!isVisible) return;
    const currentItem = items[currentIndex];
    if (currentItem?.type === 'beat' && currentItem.beat_data) {
      const beat = currentItem.beat_data;
      if (currentTrack?.id !== beat.id) {
        // Only attempt auto-play if the user has interacted with the page
        // to avoid NotAllowedError from browsers
        const attemptPlay = async () => {
          try {
            await play({
              id: beat.id,
              title: beat.title,
              artist: beat.profiles?.display_name || 'Unknown',
              audioUrl: beat.audio_url,
              coverUrl: beat.cover_url,
              price: beat.price
            });
          } catch (error) {
            console.warn('Auto-play blocked by browser:', error);
          }
        };
        
        attemptPlay();
      }
    }
  }, [currentIndex, items, play, currentTrack, isVisible]);

  if (!isVisible || items.length === 0 || !bannerSettings.is_enabled) return null;

  const currentItem = items[currentIndex];
  const designType = currentItem.design_type || 'floating';

  // Animation Styles
  const animationStyles = (
    <style jsx global>{`
      @keyframes handSwipe {
        0% { transform: translateX(100px) translateY(0) rotate(0); opacity: 0; }
        15% { opacity: 1; }
        45% { transform: translateX(-100px) translateY(-5px) rotate(-15deg); }
        65% { transform: translateX(-100px) translateY(-5px) rotate(-15deg); opacity: 1; }
        100% { transform: translateX(-160px) translateY(-10px) rotate(-20deg); opacity: 0; }
      }
      .animate-swipe {
        animation: handSwipe 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }
      .perspective-1000 {
        perspective: 1000px;
      }
    `}</style>
  );

  const renderItemContent = (item: BannerItem, index: number) => {
    const isBeat = item.type === 'beat';
    const isPlayingCurrent = isPlaying && currentTrack?.id === item.beat_data?.id;
    const designType = item.design_type || 'floating';
    const isCurrent = index === currentIndex;
    const isPrev = index === (currentIndex - 1 + items.length) % items.length;
    const isNext = index === (currentIndex + 1) % items.length;

    const handleAction = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isBeat && item.beat_data) {
        if (isPlayingCurrent) {
          pause();
        } else {
          try {
            await play(item.beat_data, items.filter(i => i.type === 'beat').map(i => i.beat_data).filter(Boolean));
          } catch (error) {
            console.error('Playback failed:', error);
          }
        }
      }
    };

    const imageContainer = (
      <div className={`relative overflow-hidden transition-all duration-1000 ease-in-out ${
        isBeat 
          ? 'w-24 h-24 rounded-2xl rotate-3 group-hover:rotate-0' 
          : 'w-24 h-24 rounded-full scale-105 group-hover:scale-110'
      } border-2 border-white/20 shadow-2xl flex-shrink-0`}>
        <Image 
          src={item.image_url} 
          alt={item.title}
          fill
          className="object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        {isBeat && (
          <button 
            onClick={handleAction}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-xl scale-75 group-hover:scale-100 transition-transform duration-500">
              {isPlayingCurrent ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-1" />}
            </div>
          </button>
        )}
      </div>
    );

    const infoSection = (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20">
            {item.type}
          </span>
          {isBeat && <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold"><Music size={10} /> Auto-play</span>}
        </div>
        <h3 className="text-lg font-black text-white truncate leading-tight group-hover:text-primary transition-colors duration-500">
          {item.title}
        </h3>
        <p className="text-xs text-zinc-400 truncate font-medium">
          {item.subtitle}
        </p>
      </div>
    );

    const contentClasses = `w-full flex-shrink-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
      isCurrent ? 'opacity-100 scale-100 z-10' : 'opacity-40 scale-90 blur-[2px] z-0'
    }`;

    if (designType === 'large') {
      return (
        <div className={contentClasses}>
          <div className="flex flex-col items-center text-center p-10 lg:p-14 gap-8 relative w-full">
            {/* Background Mesh Gradient */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>

            <div className="relative flex-shrink-0">
              <div className={`relative overflow-hidden w-40 h-40 lg:w-48 lg:h-48 border-[6px] border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_0_15px_rgba(255,255,255,0.1)] transition-all duration-700 ${
                isBeat ? 'rounded-[40px]' : 'rounded-full'
              }`}>
                <Image src={item.image_url} alt={item.title} fill className="object-cover scale-105" />
                {isBeat && (
                  <button onClick={handleAction} className="absolute inset-0 bg-black/10 flex items-center justify-center group-hover:bg-black/30 transition-all backdrop-blur-[1px]">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-transform duration-300">
                      {isPlayingCurrent ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-1.5" />}
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6 relative z-10 max-w-md">
              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20 backdrop-blur-sm inline-block">
                  {item.type} Spotlight
                </span>
                <h2 className="text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tighter drop-shadow-xl">
                  {item.title}
                </h2>
                <p className="text-zinc-400 text-base font-medium leading-relaxed max-w-xs mx-auto">
                  {item.subtitle}
                </p>
              </div>

              <div className="flex flex-col items-center gap-5 pt-2">
                <Link 
                  href={item.link_url}
                  className="group/btn relative px-10 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_15px_30px_rgba(255,255,255,0.1)] flex items-center gap-3 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-primary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                  <span className="relative z-10 group-hover/btn:text-white transition-colors duration-500">Explore Now</span>
                  <ArrowRight size={16} className="relative z-10 group-hover/btn:text-white transition-colors duration-500 group-hover/btn:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (designType === 'chat') {
      return (
        <div className={contentClasses}>
          <div className="flex items-center gap-4 p-4 w-full">
            <div className="relative flex-shrink-0">
              <div className={`w-16 h-16 border-2 border-white/20 shadow-lg overflow-hidden ${
                isBeat ? 'rounded-xl' : 'rounded-full'
              }`}>
                <Image src={item.image_url} alt={item.title} fill className="object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-zinc-950 flex items-center justify-center text-white">
                {isBeat ? <Music size={12} /> : <User size={12} />}
              </div>
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <p className="text-[10px] font-black text-primary uppercase tracking-tighter mb-0.5">Recommendation</p>
              <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
              <p className="text-[11px] text-zinc-400 truncate">{item.subtitle}</p>
            </div>
          </div>
        </div>
      );
    }

    // Default: Floating
    return (
      <div className={contentClasses}>
        <div className="flex items-center gap-6 p-6 w-full">
          {imageContainer}
          {infoSection}
          <Link 
            href={item.link_url}
            className="px-6 py-3 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all duration-500 shadow-lg flex items-center gap-2 group-hover:gap-3 flex-shrink-0"
          >
            Check it out <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <>
      {animationStyles}
      <div className={`fixed z-[100] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95 pointer-events-none'
      } ${
        designType === 'large' 
          ? 'inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[20px] p-4 sm:p-6 lg:p-12' 
          : designType === 'chat'
            ? 'bottom-20 sm:bottom-8 right-4 sm:right-8 w-[280px] sm:w-[320px]'
            : 'bottom-20 sm:bottom-28 left-1/2 -translate-x-1/2 w-full max-w-[95%] sm:max-w-2xl px-2 sm:px-4'
      }`}>
        <div className={`relative group w-full ${
          designType === 'large' ? 'max-w-[90vw] sm:max-w-xl' : ''
        }`}>
          {/* Main Container */}
          <div 
            className={`relative overflow-hidden border border-white/10 bg-white/5 backdrop-blur-[32px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] transition-all duration-700 ${
              designType === 'large' ? 'rounded-[32px] sm:rounded-[48px]' : designType === 'chat' ? 'rounded-2xl sm:rounded-3xl' : 'rounded-[24px] sm:rounded-[40px]'
            } cursor-grab active:cursor-grabbing select-none`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onTouchStart}
            onMouseMove={onTouchMove}
            onMouseUp={onTouchEnd}
            onMouseLeave={onTouchEnd}
          >
            {/* Glass Shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none z-20" />
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none z-20" />
            
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 overflow-hidden z-30">
              <div 
                className="h-full bg-primary transition-all duration-100 linear shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Gesture Hand Animation */}
            {showGesture && items.length > 1 && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
                <div className="animate-swipe flex flex-col items-center">
                  <div className="text-7xl lg:text-8xl drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] transform -rotate-12">👆</div>
                  <div className="mt-6 bg-primary/90 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/20 shadow-2xl">
                    <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white whitespace-nowrap">Swipe to Browse</span>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              {items.length > 1 && (
                <div className="flex items-center bg-white/5 rounded-full border border-white/10 p-1 backdrop-blur-md">
                  <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="p-1.5 bg-white/5 hover:bg-red-500/20 rounded-full text-white/40 hover:text-red-500 transition-all border border-white/10 backdrop-blur-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Horizontal Slider Track */}
            <div 
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                transform: `translateX(-${currentIndex * 100}%)`,
                width: `${items.length * 100}%`
              }}
            >
              {items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="w-full flex-shrink-0">
                  {renderItemContent(item, idx)}
                </div>
              ))}
            </div>
          </div>

          {/* Indicators */}
          {items.length > 1 && (
            <div className={`flex justify-center gap-1.5 mt-4`}>
              {items.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-700 ${
                    idx === currentIndex ? 'w-8 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]' : 'w-2 bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
