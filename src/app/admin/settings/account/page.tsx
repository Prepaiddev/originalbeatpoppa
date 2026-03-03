"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { User, Lock, Mail, Save, Shield, AlertCircle, CheckCircle, Eye, EyeOff, Smartphone, QrCode, RefreshCcw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import StatusModal from '@/components/StatusModal';
import * as otplib from 'otplib';
const { verifySync } = otplib;

export default function AdminAccountSettings() {
  const { user, profile, refreshProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // 2FA state
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showMfaEnroll, setShowMfaEnroll] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading' | 'auth';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
    }
  }, [profile]);

  // MFA Functions
  const handleStartMfaEnroll = async () => {
    setMfaLoading(true);
    try {
      // Generate a random 32-character base32 secret
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let secret = '';
      for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setMfaSecret(secret);
      
      // Generate QR code URL using a public API (Google Charts)
      const label = encodeURIComponent(`BeatPoppa Admin (${user?.email})`);
      const issuer = encodeURIComponent('BeatPoppa');
      const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;
      const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`;
      setMfaQrCode(qrUrl);
      
      setShowMfaEnroll(true);
    } catch (error: any) {
      console.error('MFA Enrollment error:', error);
      setMessage({ type: 'error', text: 'Failed to start MFA enrollment' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyAndEnableMfa = async () => {
    if (mfaCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a 6-digit code' });
      return;
    }

    setMfaLoading(true);
    try {
      // Real TOTP verification using otplib v13
      const result = verifySync({
        token: mfaCode,
        secret: mfaSecret
      });

      if (!result.valid) {
        throw new Error('Invalid verification code. Please check your authenticator app and try again.');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          two_factor_secret: mfaSecret,
          two_factor_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
      setShowMfaEnroll(false);
      setMfaCode('');
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: '2FA Enabled',
        message: 'Google Authenticator 2FA has been successfully enabled for your account.'
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to enable 2FA' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setMfaLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          two_factor_secret: null,
          two_factor_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: '2FA Disabled',
        message: 'Two-factor authentication has been disabled.'
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to disable 2FA' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          username: username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
      <Header />
      
      <main className="pt-[100px] max-w-4xl mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">
            BeatPoppa <span className="text-primary">Account</span>
          </h1>
          <p className="text-zinc-500 font-medium italic">Manage your administrative credentials</p>
        </div>

        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-500' 
              : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <p className="text-xs font-bold uppercase tracking-widest">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Profile Settings */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <User size={24} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Public Profile</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Username</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-10 pr-6 text-white font-bold focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> Update Profile</>}
              </button>
            </form>
          </div>

          {/* Password Settings */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                <Lock size={24} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Security</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Confirm New Password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword}
                className="w-full bg-red-500 text-white font-black py-4 rounded-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Shield size={16} /> Change Password</>}
              </button>
            </form>
          </div>
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                <Smartphone size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Two-Factor Authentication</h2>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Google Authenticator / TOTP</p>
              </div>
            </div>
            
            <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${
              profile?.two_factor_enabled 
                ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                : 'bg-zinc-500/10 border-zinc-800 text-zinc-500'
            }`}>
              {profile?.two_factor_enabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          {!profile?.two_factor_enabled && !showMfaEnroll && (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <p className="text-zinc-400 mb-6 leading-relaxed">
                  Add an extra layer of security to your account. Once enabled, you'll be required to enter a 6-digit verification code from your Google Authenticator app when signing in.
                </p>
                <button
                  onClick={handleStartMfaEnroll}
                  disabled={mfaLoading}
                  className="bg-purple-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-purple-700 transition-all flex items-center gap-2 uppercase tracking-widest text-xs"
                >
                  {mfaLoading ? <RefreshCcw size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Enable 2FA Now</>}
                </button>
              </div>
              <div className="w-32 h-32 bg-zinc-950 border border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-800">
                <QrCode size={64} />
              </div>
            </div>
          )}

          {showMfaEnroll && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-500">
              <div className="space-y-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 flex items-center justify-center">
                  <img src={mfaQrCode} alt="MFA QR Code" className="w-full max-w-[200px] h-auto rounded-xl shadow-2xl" />
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Manual Setup Key</p>
                  <code className="text-primary font-mono font-bold break-all select-all">{mfaSecret}</code>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-black uppercase tracking-tight">Step 2: Verify Code</h3>
                  <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                    Scan the QR code with your Google Authenticator app, then enter the 6-digit code shown in the app below to complete setup.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-center text-3xl font-black tracking-[0.5em] text-primary focus:border-primary outline-none transition-all placeholder:text-zinc-800"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleVerifyAndEnableMfa}
                    disabled={mfaLoading || mfaCode.length !== 6}
                    className="flex-1 bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                  >
                    {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                  <button
                    onClick={() => setShowMfaEnroll(false)}
                    className="px-6 bg-zinc-800 text-white font-black py-4 rounded-2xl hover:bg-zinc-700 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {profile?.two_factor_enabled && (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-green-500 mb-4">
                  <ShieldCheck size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Your account is secured</span>
                </div>
                <p className="text-zinc-400 mb-6 leading-relaxed">
                  Two-factor authentication is currently active. You'll be prompted for a code every time you sign in to the BeatPoppa administrative portal.
                </p>
                <button
                  onClick={handleDisableMfa}
                  disabled={mfaLoading}
                  className="bg-red-500/10 text-red-500 border border-red-500/20 font-black py-4 px-8 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 uppercase tracking-widest text-xs"
                >
                  {mfaLoading ? <RefreshCcw size={16} className="animate-spin" /> : 'Disable Two-Factor Authentication'}
                </button>
              </div>
              <div className="w-32 h-32 bg-green-500/10 border border-green-500/20 rounded-3xl flex items-center justify-center text-green-500">
                <ShieldCheck size={64} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
