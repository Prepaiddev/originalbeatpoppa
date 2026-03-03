"use client";

import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';

export default function BannedPage() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl p-10 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="text-red-500" size={40} />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">
          Account <span className="text-red-500">Banned</span>
        </h1>
        
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Your account has been suspended for violating our platform's terms of service. 
          If you believe this is a mistake, please contact our support team.
        </p>

        <div className="space-y-4">
          <a 
            href="mailto:support@beatpoppa.com"
            className="flex items-center justify-center gap-3 w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-colors"
          >
            <Mail size={20} />
            Contact Support
          </a>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
