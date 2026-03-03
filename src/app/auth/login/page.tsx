"use client";

import Link from 'next/link';
import { ArrowLeft, Mail, Lock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/supabase/audit';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envError, setEnvError] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.type === 'email' ? 'email' : 'password']: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
           setEnvError(true);
           throw new Error('Could not connect to authentication server.');
        }
        throw error;
      }

      if (data.user) {
        // Log login
        await logActivity('login', 'user', data.user.id, { email: data.user.email });
        
        // Fetch user profile to get role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Fallback if profile not found (shouldn't happen ideally)
          router.push('/dashboard/buyer'); 
        } else {
          // Admin uses the special portal link
          if (profile.role === 'admin') {
            router.push('/beatpoppa-secured'); // Fallback to default if store not loaded, middleware handles the rest
          } else {
            router.push(`/dashboard/${profile.role}`);
          }
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setEnvError(true);
        setError('Connection failed. It looks like the Supabase project is not connected properly.');
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-4">
      {/* Back Button */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          Back
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2 tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-zinc-400">Sign in to continue</p>
        </div>

        {/* Configuration Warning */}
        {envError && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-4 rounded-xl mb-6 text-sm flex gap-3 items-start">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold mb-1">Configuration Required</p>
              <p>The app cannot connect to Supabase. Please update your <code className="bg-black/30 px-1 py-0.5 rounded">.env.local</code> file with your real Supabase URL and Anon Key.</p>
            </div>
          </div>
        )}

        {error && !envError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:text-red-400">Forgot?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-primary font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
