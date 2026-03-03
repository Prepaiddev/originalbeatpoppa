-- Consolidated migration for Profile System Revamp

-- 1. Enhance PROFILES table (Base User)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS currency_pref text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

-- 2. Create CREATOR_PROFILES table (Extension for Creators)
CREATE TABLE IF NOT EXISTS creator_profiles (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  cover_url text,
  genres text[], -- Array of genres like ['Afrobeats', 'Amapiano']
  verification_status text CHECK (verification_status IN ('unverified', 'pending', 'verified')) DEFAULT 'unverified',
  payout_status text CHECK (payout_status IN ('active', 'pending', 'suspended')) DEFAULT 'pending',
  total_sales_cache integer DEFAULT 0,
  rating_cache decimal(3, 2) DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator profiles are viewable by everyone" 
  ON creator_profiles FOR SELECT USING (true);

CREATE POLICY "Creators can update their own profile" 
  ON creator_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Creators can insert their own profile" 
  ON creator_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Update REVIEWS table to include verified_purchase flag if not exists
-- (Already added in previous migration but ensuring consistency)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'verified_purchase') THEN
    ALTER TABLE reviews ADD COLUMN verified_purchase boolean DEFAULT false;
  END IF;
END $$;

-- 4. Create function to Auto-Create Creator Profile on Upgrade
CREATE OR REPLACE FUNCTION public.handle_creator_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- If role changes to 'creator', ensure creator_profile exists
  IF NEW.role = 'creator' AND OLD.role != 'creator' THEN
    INSERT INTO public.creator_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_upgrade ON profiles;
CREATE TRIGGER on_profile_upgrade
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_creator_upgrade();
