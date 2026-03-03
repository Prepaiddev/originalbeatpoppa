"use client";

import { AlertCircle, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-zinc-400 mb-8">
          Buyers cannot upload beats. Please upgrade to a Creator account to start selling your music.
        </p>

        <div className="space-y-3">
          <Link 
            href="/profile/edit"
            className="block w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
          >
            Upgrade to Creator
          </Link>
          <Link 
            href="/dashboard/buyer"
            className="block w-full py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Go to Buyer Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
