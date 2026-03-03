import { Play, TrendingUp, Music, Users, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function Hero() {
  const { general } = useSettingsStore();

  return (
    <section className="relative h-[400px] md:h-[500px] w-full flex items-center justify-center overflow-hidden">
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

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black z-10" />

      {/* Content */}
      <div className="relative z-20 max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 text-xs font-medium text-primary mb-6 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          The Sound of Africa
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight animate-fade-in-up animation-delay-100 text-white">
          Discover <br className="md:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
            {general?.site_name ? `Authentic Beats on ${general.site_name}` : "Authentic Beats"}
          </span>
        </h1>
        
        <p className="text-zinc-200 mb-8 leading-relaxed text-sm md:text-lg max-w-xl mx-auto px-4 animate-fade-in-up animation-delay-200 drop-shadow-lg">
          {general?.site_description || "Premium Afrobeats, Amapiano & more from Africa's finest producers. No borders, no limits."}
        </p>

        <div className="flex items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
          <Link 
            href="/explore"
            className="h-12 px-8 rounded-full bg-primary hover:bg-red-600 text-white font-bold flex items-center gap-2 shadow-xl shadow-primary/30 transition-all active:scale-95 hover:scale-105"
          >
            <Play fill="currentColor" size={18} />
            Explore Beats
          </Link>
        </div>
      </div>
    </section>
  );
}
