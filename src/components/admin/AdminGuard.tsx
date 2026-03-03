"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";
import Link from "next/link";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { role, isLoading, isInitialized, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Only call initialize if not already initialized
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Only show loading if we haven't initialized yet
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 animate-pulse font-medium">Verifying BeatPoppa Access...</p>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Access Denied</h1>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            You do not have the required permissions to view this area. This section is restricted to platform administrators only.
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => router.back()}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
            
            <Link 
              href="/"
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-all active:scale-[0.98]"
            >
              <Home size={18} />
              Return Home
            </Link>
          </div>
          
          <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            <Lock size={12} />
            Secure BeatPoppa Protocol
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
