import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AudioPlayer from "@/components/AudioPlayer";
import HeadSettings from "@/components/HeadSettings";
import GlobalAlert from "@/components/GlobalAlert";
import RealtimeMaintenance from "@/components/RealtimeMaintenance";
import CurrencySelectionModal from "@/components/CurrencySelectionModal";
import CurrencyInitializer from "@/components/CurrencyInitializer";
import PromotionalBanner from "@/components/PromotionalBanner";
import ScrollToTop from "@/components/ScrollToTop";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'seo_settings')
      .single();

    if (data?.value) {
      const seo = data.value;
      return {
        title: seo.meta_title || "BeatPoppa - Beat Marketplace",
        description: seo.meta_description || "Buy and sell beats on the go",
        keywords: seo.meta_keywords || "beats, afrobeats, music, marketplace",
      };
    }
  } catch (error) {
    console.error('Error fetching SEO metadata:', error);
  }

  return {
    title: "BeatPoppa - Beat Marketplace",
    description: "Buy and sell beats on the go",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <RealtimeMaintenance />
        <HeadSettings />
        <GlobalAlert />
        <CurrencyInitializer />
        <CurrencySelectionModal />
        
        {/* Promotional Banners by Type */}
        <PromotionalBanner targetDesignType="floating" />
        <PromotionalBanner targetDesignType="chat" />
        <PromotionalBanner targetDesignType="large" />

        <main className="pb-[120px] min-h-screen">
          {children}
        </main>
        
        {/* Persistent Player & Navigation */}
        <>
          <ScrollToTop />
          <AudioPlayer />
          <BottomNav />
        </>
      </body>
    </html>
  );
}
