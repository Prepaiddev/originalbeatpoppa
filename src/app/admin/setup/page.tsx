"use client";

import { useState } from 'react';
import Header from '@/components/Header';
import { Database, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminSetupPage() {
  const [copied, setCopied] = useState(false);

  const sqlCode = `-- BEATPOPPA PLATFORM INITIALIZATION
-- Run this in your Supabase SQL Editor to fix the "platform_settings" error 
-- and setup all required admin tables.

-- 1. Platform Settings Table (Fixes the current error)
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Audit Logs Table (For admin tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Withdrawals Table (For creator payouts)
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
  payment_method TEXT,
  payment_details JSONB,
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'sale', 'user_signup', 'withdrawal_request', 'verification_request'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Insert Default Settings
INSERT INTO platform_settings (key, value)
VALUES 
  ('admin_config', '{"path": "beatpoppa-secured"}'::jsonb),
  ('general_settings', '{"site_name": "BeatPoppa", "site_description": "Premium Beats Marketplace", "contact_email": "admin@beatpoppa.com"}'::jsonb),
  ('seo_settings', '{"meta_title": "BeatPoppa | Premium Beats", "meta_description": "Buy and sell premium afrobeats."}'::jsonb),
  ('currency_settings', '{"default": "USD", "rates": {"NGN": 1500, "GHS": 15, "ZAR": 19, "KSH": 130, "GBP": 0.79, "EUR": 0.92, "USD": 1}}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6. Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- 7. Admin Policies
DROP POLICY IF EXISTS "Admins can manage platform_settings" ON platform_settings;
CREATE POLICY "Admins can manage platform_settings" ON platform_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7.1 Public Read for Non-Sensitive Settings
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON platform_settings;
CREATE POLICY "Public can view non-sensitive settings" ON platform_settings
  FOR SELECT USING (key IN ('maintenance_settings', 'general_settings', 'seo_settings', 'currency_settings'));

DROP POLICY IF EXISTS "Admins can view audit_logs" ON audit_logs;
CREATE POLICY "Admins can view audit_logs" ON audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage withdrawals" ON withdrawals;
CREATE POLICY "Admins can manage withdrawals" ON withdrawals
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Creators can view own withdrawals" ON withdrawals;
CREATE POLICY "Creators can view own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins can manage admin_notifications" ON admin_notifications;
CREATE POLICY "Admins can manage admin_notifications" ON admin_notifications
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 8. User Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL, -- 'sale', 'follow', 'review', 'submission_status', 'withdrawal_status', 'payout'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. User Notifications Policy
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 10. License Management System
CREATE TABLE IF NOT EXISTS license_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_price DECIMAL(10, 2) NOT NULL,
  features TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS beat_licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id UUID REFERENCES beats(id) ON DELETE CASCADE NOT NULL,
  license_type_id UUID REFERENCES license_types(id) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(beat_id, license_type_id)
);

-- 11. Enable RLS for Licenses
ALTER TABLE license_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE beat_licenses ENABLE ROW LEVEL SECURITY;

-- 12. License Policies
DROP POLICY IF EXISTS "Public can view active license_types" ON license_types;
CREATE POLICY "Public can view active license_types" ON license_types
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage license_types" ON license_types;
CREATE POLICY "Admins can manage license_types" ON license_types
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Public can view beat_licenses" ON beat_licenses;
CREATE POLICY "Public can view beat_licenses" ON beat_licenses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can manage own beat_licenses" ON beat_licenses;
CREATE POLICY "Creators can manage own beat_licenses" ON beat_licenses
  FOR ALL USING (EXISTS (SELECT 1 FROM beats WHERE id = beat_licenses.beat_id AND artist_id = auth.uid()));

-- 13. Insert Default License Types
INSERT INTO license_types (name, description, default_price, features)
VALUES 
  ('Basic License', 'MP3 only, non-exclusive, 1 project use', 29.99, ARRAY['MP3 File', 'Used for 1 project', 'Non-exclusive']),
  ('Premium License', 'WAV + MP3, track stems, higher distribution', 79.99, ARRAY['WAV + MP3', 'Higher Distribution', 'Track Stems']),
  ('Exclusive License', 'Full ownership, unlimited rights, removed from store', 499.99, ARRAY['Full Ownership', 'Unlimited Rights', 'Removed from Store'])
ON CONFLICT DO NOTHING;

-- 14. Creator Verifications Table
CREATE TABLE IF NOT EXISTS creator_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  id_document_url TEXT,
  selfie_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Add status to beats table if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='beats' AND column_name='status') THEN
    ALTER TABLE beats ADD COLUMN status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';
  END IF;
END $$;

-- 16. Creator Verification Policies
ALTER TABLE creator_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification" ON creator_verifications;
CREATE POLICY "Users can view own verification" ON creator_verifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own verification" ON creator_verifications;
CREATE POLICY "Users can create own verification" ON creator_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own verification" ON creator_verifications;
CREATE POLICY "Users can update own verification" ON creator_verifications
  FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'rejected'));

DROP POLICY IF EXISTS "Admins can manage creator_verifications" ON creator_verifications;
CREATE POLICY "Admins can manage creator_verifications" ON creator_verifications
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 13. Add 2FA, is_banned and Verification Columns to Profiles
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_banned') THEN
    ALTER TABLE profiles ADD COLUMN is_banned BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='two_factor_secret') THEN
    ALTER TABLE profiles ADD COLUMN two_factor_secret TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='two_factor_enabled') THEN
    ALTER TABLE profiles ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='two_factor_recovery_codes') THEN
    ALTER TABLE profiles ADD COLUMN two_factor_recovery_codes TEXT[];
  END IF;
END $$;

-- 13.1 Profile Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT USING (true);

-- 14. Create Storage Buckets (if not exists)
-- This might need to be done in the Supabase Dashboard, but let's add the SQL just in case
INSERT INTO storage.buckets (id, name, public) 
VALUES ('platform', 'platform', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 15. Storage Policies for 'platform' bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'platform');
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'platform' AND (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')));
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'platform' AND (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')));
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-4xl mx-auto px-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-10 backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary border border-primary/20">
              <Database size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">Database <span className="text-primary">Initialization</span></h1>
              <p className="text-zinc-500 font-medium">Setup the required tables for the BeatPoppa Portal</p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <AlertTriangle className="text-yellow-500 shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-black uppercase text-xs tracking-widest text-yellow-500 mb-1 text-left">Action Required</h3>
              <p className="text-sm text-zinc-400 leading-relaxed text-left">
                Due to security restrictions, the application cannot create database tables automatically. 
                Please copy the SQL code below and run it in your <strong>Supabase SQL Editor</strong>.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/5"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'COPIED!' : 'COPY SQL'}
              </button>
            </div>
            
            <div className="bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 bg-zinc-900/50 border-b border-zinc-800">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-2">initialize_tables.sql</span>
              </div>
              <pre className="p-8 text-xs font-mono text-zinc-400 overflow-x-auto leading-relaxed max-h-[400px]">
                {sqlCode}
              </pre>
            </div>
          </div>

          <div className="mt-10 pt-10 border-t border-zinc-800 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="font-black uppercase text-sm tracking-widest mb-2">Once Finished</h4>
            <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed mb-8">
              After running the SQL in Supabase, the "table not found" errors will disappear and you'll be able to manage your platform settings.
            </p>
            <button 
              onClick={() => window.location.href = '/beatpoppadjs/admin'}
              className="bg-white text-black font-black py-4 px-10 rounded-2xl hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
