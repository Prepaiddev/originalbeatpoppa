-- Migration to add social features and profile enhancements

-- 1. Add missing columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS total_sales integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_beats integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_rating decimal(3, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS account_status text CHECK (account_status IN ('active', 'suspended', 'flagged')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb, -- { "instagram": "url", "youtube": "url" }
ADD COLUMN IF NOT EXISTS badges text[] DEFAULT ARRAY[]::text[]; -- ['verified', 'top-seller']

-- 2. Create REVIEWS table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id uuid REFERENCES beats(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES profiles(id) NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  is_verified_purchase boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- ideally strictly check for verified purchase in application logic or trigger

-- 3. Create FOLLOWS table
CREATE TABLE IF NOT EXISTS follows (
  follower_id uuid REFERENCES profiles(id) NOT NULL,
  following_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- 4. Helper function to calculate stats (optional, but good for triggers)
-- For now we can compute on read or use simple increment logic in app
