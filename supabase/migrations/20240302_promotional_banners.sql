
-- Create promotional_banners table
CREATE TABLE IF NOT EXISTS public.promotional_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    link_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('producer', 'beat', 'artist')),
    beat_id UUID REFERENCES public.beats(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Anyone can view active banners
CREATE POLICY "Anyone can view active banners" ON public.promotional_banners
    FOR SELECT USING (is_active = true);

-- Only admins can manage banners
-- Assuming 'admin' role exists in profiles or we use a specific check
CREATE POLICY "Admins can manage banners" ON public.promotional_banners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_promotional_banners_updated_at
    BEFORE UPDATE ON public.promotional_banners
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
