"use client";

import { X, Check, Music, BarChart, DollarSign, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface CreatorUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatorUpgradeModal({ isOpen, onClose }: CreatorUpgradeModalProps) {
  const router = useRouter();
  const { user, refreshProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Update the role in profiles table
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ 
          role: 'creator',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (roleError) throw roleError;
      
      // 2. Refresh global profile state
      await refreshProfile();
      
      // 3. Close and redirect with a success flag
      onClose();
      router.push('/dashboard/creator?newly_upgraded=true');
    } catch (err) {
      console.error("Upgrade failed:", err);
      alert("Failed to upgrade account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Header Section */}
        <div className="relative p-10 pb-6">
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-all z-20"
          >
            <X size={20} />
          </button>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-primary/20">
            <Sparkles size={12} className="fill-current" />
            Limited Time: Free Upgrade
          </div>
          
          <h2 className="text-5xl font-black text-white leading-tight mb-4 tracking-tight">
            Level up to <span className="text-primary italic">Creator</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
            Turn your passion into profit. Start selling your beats to thousands of artists globally.
          </p>
        </div>

        <div className="p-10 pt-0">
          {/* Perks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <div className="bg-zinc-800/30 p-5 rounded-3xl border border-zinc-800/50 group hover:border-primary/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Music size={24} />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">Unlimited Uploads</h3>
              <p className="text-sm text-zinc-500 leading-snug">Share your entire catalog without any restrictions.</p>
            </div>
            
            <div className="bg-zinc-800/30 p-5 rounded-3xl border border-zinc-800/50 group hover:border-green-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <DollarSign size={24} />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">High Payouts</h3>
              <p className="text-sm text-zinc-500 leading-snug">Keep up to 90% of every sale you make.</p>
            </div>

            <div className="bg-zinc-800/30 p-5 rounded-3xl border border-zinc-800/50 group hover:border-blue-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart size={24} />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">Deep Analytics</h3>
              <p className="text-sm text-zinc-500 leading-snug">Understand your audience with real-time data.</p>
            </div>

            <div className="bg-zinc-800/30 p-5 rounded-3xl border border-zinc-800/50 group hover:border-purple-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <h3 className="font-bold text-white text-lg mb-1">Verified Status</h3>
              <p className="text-sm text-zinc-500 leading-snug">Get the blue checkmark and build instant trust.</p>
            </div>
          </div>

          {/* Explicit Data Preservation Assurance */}
          <div className="bg-black/40 rounded-3xl p-6 mb-10 border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Shield size={64} className="text-white" />
            </div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Check size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="font-black text-white text-sm uppercase tracking-widest mb-1">Zero Data Loss Guarantee</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Your <span className="text-white font-bold">Purchased Beats</span>, <span className="text-white font-bold">Favorites</span>, and <span className="text-white font-bold">Order History</span> are 100% safe. Upgrading simply unlocks creator tools on your existing account.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-5 bg-primary text-white font-black text-lg rounded-2xl shadow-2xl shadow-primary/30 hover:bg-rose-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></span>
              ) : (
                <>
                  Get Started as a Creator
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-zinc-500 font-medium">
              By upgrading, you agree to our Creator Terms & Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
