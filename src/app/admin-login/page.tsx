"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, Eye, EyeOff, ArrowLeft, Smartphone, RefreshCcw, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useSettingsStore } from '@/store/useSettingsStore';
import { logActivity } from '@/lib/supabase/audit';
import * as otplib from 'otplib';
const { verifySync } = otplib;

export default function AdminLoginPage() {
  const { adminPath, fetchAdminPath } = useSettingsStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2FA state
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Check if user is admin and if 2FA is enabled
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, two_factor_enabled, two_factor_secret')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Admin Login: Profile fetch error:', profileError);
        await supabase.auth.signOut();
        throw new Error(`Access denied. Error verifying profile: ${profileError.message}`);
      }

      if (profile?.role !== 'admin') {
        console.warn('Admin Login: Non-admin user attempted login:', { userId: data.user.id, role: profile?.role });
        await supabase.auth.signOut();
        throw new Error('Access denied. This area is for administrators only.');
      }

      // Check for 2FA
      if (profile.two_factor_enabled && profile.two_factor_secret) {
        setTempUser(data.user);
        setMfaSecret(profile.two_factor_secret);
        setShowMfa(true);
        setLoading(false);
        return;
      }

      // Success - show success state and redirect
      await completeLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6 || !mfaSecret) return;
    
    setLoading(true);
    setError(null);

    try {
      // Real TOTP verification using otplib v13
      const result = verifySync({
        token: mfaCode,
        secret: mfaSecret
      });

      if (!result.valid) {
        throw new Error('Invalid verification code. Please try again.');
      }
      
      await completeLogin(tempUser);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setLoading(false);
      setMfaCode('');
    }
  };

  const completeLogin = async (user: any) => {
    setSuccess(true);
    const path = await fetchAdminPath();
    
    // Log login
    await logActivity('login', 'admin', user.id, { email: user.email });
    
    // Small delay to ensure cookies are set before hard redirect
    setTimeout(() => {
      window.location.href = `/${path}`;
    }, 500);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-primary selection:text-black">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6 border border-primary/20">
            <Shield size={40} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            BeatPoppa <span className="text-primary">Portal</span>
          </h1>
          <p className="text-zinc-500 font-medium mt-2 italic">Secure Administrative Access</p>
        </div>

        {/* Login Form */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[32px] backdrop-blur-xl shadow-2xl">
          {!showMfa ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Authentication successful! Redirecting to BeatPoppa Portal...
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">
                  Portal Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-primary transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-14 pr-4 text-white font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                    placeholder="admin@beatpoppa.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">
                  Security Key
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-14 pr-14 text-white font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                    placeholder="••••••••••••"
                    required
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
                className="w-full bg-primary hover:bg-primary/90 text-black font-black py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Authenticate
                    <Shield size={18} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyMfa} className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4 border border-primary/20">
                  <KeyRound size={32} className="text-primary" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Two-Factor Auth</h2>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2 leading-relaxed">
                  Enter the 6-digit code from your <br />
                  <span className="text-primary">Google Authenticator</span> app
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-6 text-center text-4xl font-black tracking-[0.5em] text-primary focus:border-primary outline-none transition-all placeholder:text-zinc-800"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>

              <div className="flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-black py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify Code
                      <Shield size={18} />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMfa(false);
                    setMfaCode('');
                    setError(null);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors py-2"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-zinc-800/50 flex items-center justify-between">
            <Link 
              href="/"
              className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={12} />
              Return to Site
            </Link>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
              v1.0.5 Secure
            </span>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em] mt-8">
          Unauthorized Access is Strictly Prohibited
        </p>
      </div>
    </div>
  );
}
