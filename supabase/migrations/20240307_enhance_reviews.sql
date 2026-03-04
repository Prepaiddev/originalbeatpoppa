-- Migration to enhance reviews system with bundle support and better metadata
-- 20240307_enhance_reviews.sql

-- 1. Add bundle_id to reviews to support reviewing bundles
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES bundles(id) ON DELETE CASCADE;

-- 2. Update the constraint to ensure either beat_id or bundle_id is set
-- First, drop the old NOT NULL constraint on beat_id if it exists
ALTER TABLE reviews ALTER COLUMN beat_id DROP NOT NULL;

-- Add a check constraint to ensure we're reviewing either a beat or a bundle
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_check_item;
ALTER TABLE reviews ADD CONSTRAINT reviews_check_item 
  CHECK ((beat_id IS NOT NULL AND bundle_id IS NULL) OR (beat_id IS NULL AND bundle_id IS NOT NULL));

-- 3. Add helpful metadata to reviews
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending', 'published', 'hidden')) DEFAULT 'published';

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS reviews_beat_id_idx ON reviews(beat_id);
CREATE INDEX IF NOT EXISTS reviews_bundle_id_idx ON reviews(bundle_id);
CREATE INDEX IF NOT EXISTS reviews_reviewer_id_idx ON reviews(reviewer_id);

-- 5. RLS Policies (Ensure they are up to date)
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;

-- Create enhanced policies
CREATE POLICY "Reviews are viewable by everyone" ON reviews 
FOR SELECT USING (is_public = true AND status = 'published');

CREATE POLICY "Authenticated users can insert reviews" ON reviews 
FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" ON reviews 
FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews" ON reviews 
FOR DELETE USING (auth.uid() = reviewer_id);

-- 6. Function to update average rating in profiles
CREATE OR REPLACE FUNCTION update_profile_avg_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_creator_id uuid;
    new_avg_rating decimal(3, 2);
BEGIN
    -- Determine the creator of the beat or bundle
    IF NEW.beat_id IS NOT NULL THEN
        SELECT artist_id INTO target_creator_id FROM beats WHERE id = NEW.beat_id;
    ELSE
        SELECT creator_id INTO target_creator_id FROM bundles WHERE id = NEW.bundle_id;
    END IF;

    -- Calculate new average rating for that creator
    -- This includes all reviews for all beats/bundles owned by this creator
    SELECT AVG(rating)::decimal(3, 2) INTO new_avg_rating
    FROM reviews r
    WHERE EXISTS (
        SELECT 1 FROM beats b WHERE b.id = r.beat_id AND b.artist_id = target_creator_id
    ) OR EXISTS (
        SELECT 1 FROM bundles bn WHERE bn.id = r.bundle_id AND bn.creator_id = target_creator_id
    );

    -- Update the profile
    UPDATE profiles 
    SET avg_rating = COALESCE(new_avg_rating, 0.00)
    WHERE id = target_creator_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to update average rating on review changes
DROP TRIGGER IF EXISTS on_review_change ON reviews;
CREATE TRIGGER on_review_change
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_profile_avg_rating();
