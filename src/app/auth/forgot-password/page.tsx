"use client";

import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col p-4">
      {/* Back Button */}
      <div className="mb-8">
        <Link href="/auth/login" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2 tracking-tight text-white">
            Reset Password
          </h1>
          <p className="text-zinc-400">Enter your email to receive reset instructions</p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="email" 
                placeholder="your@email.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 hover:bg-red-600 transition-all active:scale-95"
          >
            Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
}
