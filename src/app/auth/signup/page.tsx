"use client";

import Link from 'next/link';
import { ArrowLeft, Mail, Lock, User, Music, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<'buyer' | 'creator'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envError, setEnvError] = useState(false);
  const [authSettings, setAuthSettings] = useState<any>(null);
  const [checkingSettings, setCheckingSettings] = useState(true);

  useEffect(() => {
    async function fetchAuthSettings() {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'auth_settings')
          .single();
        
        if (data?.value) {
          setAuthSettings(data.value);
        }
      } catch (err) {
        console.error('Error fetching auth settings:', err);
      } finally {
        setCheckingSettings(false);
      }
    }
    fetchAuthSettings();
  }, []);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.type === 'email' ? 'email' : e.target.type === 'password' ? 'password' : e.target.id || e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (authSettings && authSettings.allow_signup === false) {
      setError('Registration is currently closed. Please check back later.');
      setLoading(false);
      return;
    }

    try {
      // Basic client-side validation
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
         throw new Error('Please fill in all fields');
      }

      // Check if email is in admin whitelist
      const isAdmin = authSettings?.admin_emails?.includes(formData.email);
      const finalRole = isAdmin ? 'admin' : (authSettings?.default_role || role);

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            role: finalRole,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Check for specific network errors that imply missing configuration
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
           setEnvError(true);
           throw new Error('Could not connect to authentication server. Please check your network or project configuration.');
        }
        throw error;
      }

      if (data.user) {
        // Successful signup
        router.push('/dashboard/' + role);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      // Handle "Failed to fetch" specifically
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setEnvError(true);
        setError('Connection failed. It looks like the Supabase project is not connected properly.');
      } else {
        setError(err.message || 'An error occurred during signup');
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
        {authSettings && authSettings.allow_signup === false ? (
          <div className="text-center p-8 bg-zinc-900 rounded-[32px] border border-zinc-800">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black mb-4 tracking-tight text-white uppercase text-center">Registration Closed</h1>
            <p className="text-zinc-500 text-sm font-medium mb-8 leading-relaxed text-center">
              We are currently not accepting new signups. Please check back later or contact our support team for more information.
            </p>
            <Link href="/" className="inline-block w-full py-4 bg-primary text-white font-black rounded-2xl hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-xs text-center">
              Return Home
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black mb-2 tracking-tight text-white uppercase">
                Create Account
              </h1>
              <p className="text-zinc-400">Join the BeatPoppa Marketplace</p>
            </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setRole('buyer')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              role === 'buyer' 
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
            }`}
            type="button"
          >
            <User size={24} />
            <span className="font-bold text-sm">I want to Buy</span>
          </button>
          <button 
            onClick={() => setRole('creator')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              role === 'creator' 
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
            }`}
            type="button"
          >
            <Music size={24} />
            <span className="font-bold text-sm">I want to Sell</span>
          </button>
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

        <form className="space-y-4" onSubmit={handleSignup}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">First Name</label>
              <input 
                type="text" 
                name="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Last Name</label>
              <input 
                type="text" 
                name="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="your@email.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Create password"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="policy" className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-primary focus:ring-primary" required />
            <label htmlFor="policy" className="text-xs text-zinc-500">
              I agree to the <Link href="/legal/terms" className="text-white hover:underline">Terms</Link> and <Link href="/legal/privacy" className="text-white hover:underline">Privacy Policy</Link>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 hover:bg-red-600 transition-all active:scale-95 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : `Create ${role === 'buyer' ? 'Buyer' : 'Creator'} Account`}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary font-bold hover:underline">
            Sign In
          </Link>
        </p>
          </>
        )}
      </div>
    </div>
  );
}
