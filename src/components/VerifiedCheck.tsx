"use client";

import { CheckCircle2 } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";

interface VerifiedCheckProps {
  size?: number;
  className?: string;
}

export default function VerifiedCheck({ size = 16, className = "text-blue-500" }: VerifiedCheckProps) {
  const { general } = useSettingsStore();
  const siteName = general?.site_name || "BeatPoppa";

  return (
    <div className="group relative inline-flex items-center">
      <CheckCircle2 
        size={size} 
        className={className} 
        fill="currentColor" 
        strokeWidth={1}
        stroke="black"
      />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-zinc-800 shadow-2xl z-[60] uppercase tracking-widest">
        This creator has been verified by {siteName}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900" />
      </div>
    </div>
  );
}
