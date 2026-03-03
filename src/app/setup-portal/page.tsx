"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Shield, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';

export default function AdminInitializationPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 1. Sign up the user in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            role: 'admin'
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Failed to create user');

      // 2. Ensure the profile exists and has the admin role
      // We use upsert to create or update the profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: signUpData.user.id,
          username: username,
          display_name: 'Administrator',
          role: 'admin',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) throw profileError;

      setMessage({ 
        type: 'success', 
        text: 'BeatPoppa Portal Initialized! You can now log in with these credentials.' 
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Initialization failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleFixRole = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to fix your role. Please sign in first.');

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          role: 'admin',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Your account has been promoted to Admin! You can now access the portal.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="pt-[120px] max-w-md mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6 border border-primary/20">
            <Shield size={40} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Portal <span className="text-primary">Setup</span>
          </h1>
          <p className="text-zinc-500 font-medium mt-2 italic">Create your first administrative account</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[32px] backdrop-blur-xl">
          {message ? (
            <div className="text-center space-y-6 py-4">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {message.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
              </div>
              <p className={`font-medium ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {message.text}
              </p>
              {message.type === 'success' && (
                <button 
                  onClick={() => window.location.href = '/beatpoppa-secured/login'}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
                >
                  Go to Login
                </button>
              )}
              {message.type === 'error' && (
                <button 
                  onClick={() => setMessage(null)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleInitialize} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-zinc-500 group-focus-within:text-primary transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="admin_username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-zinc-500 group-focus-within:text-primary transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="admin@beatpoppa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Secure Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-zinc-500 group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-14 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-5 flex items-center text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-sm"
              >
                {loading ? "Initializing..." : "Create Admin Account"}
              </button>

              <div className="pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleFixRole}
                  disabled={loading}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest"
                >
                  Already signed up? Fix my role to Admin
                </button>
              </div>
            </form>
          )}
        </div>
        
        <p className="text-center text-zinc-600 text-xs mt-8">
          This setup page should be deleted after the first administrator is created.
        </p>
      </main>
    </div>
  );
}
