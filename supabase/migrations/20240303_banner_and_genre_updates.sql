-- Complete Banner and Genre Updates Migration

-- 1. Create promotional_banners table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.promotional_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('producer', 'beat', 'artist')),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT NOT NULL,
    beat_id UUID REFERENCES public.beats(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add design_type to promotional_banners (if not already there)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotional_banners' AND column_name = 'design_type') THEN
        ALTER TABLE public.promotional_banners ADD COLUMN design_type TEXT DEFAULT 'floating' CHECK (design_type IN ('floating', 'chat', 'large'));
    END IF;
END $$;

-- 3. Enable RLS on promotional_banners
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- 4. Policies for promotional_banners
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promotional_banners' AND policyname = 'Anyone can view active banners') THEN
        CREATE POLICY "Anyone can view active banners" ON public.promotional_banners
        FOR SELECT USING (is_active = true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'promotional_banners' AND policyname = 'Admins can manage banners') THEN
        CREATE POLICY "Admins can manage banners" ON public.promotional_banners
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            )
        );
    END IF;
END $$;

-- 5. Add genre_bar settings to platform_settings
INSERT INTO public.platform_settings (key, value)
VALUES (
    'genre_bar',
    '{
        "is_enabled": true,
        "items": [
            {"label": "All", "icon": "🏠"},
            {"label": "Trap", "icon": "🔥"},
            {"label": "Hip Hop", "icon": "🎤"},
            {"label": "R&B", "icon": "🎹"},
            {"label": "Pop", "icon": "🌟"},
            {"label": "Rock", "icon": "🎸"},
            {"label": "Jazz", "icon": "🎷"},
            {"label": "Lo-fi", "icon": "☕"},
            {"label": "Afrobeat", "icon": "🥁"},
            {"label": "Drill", "icon": "🥶"},
            {"label": "Phonk", "icon": "🚗"},
            {"label": "Reggaeton", "icon": "💃"},
            {"label": "EDM", "icon": "🔊"},
            {"label": "Soul", "icon": "✨"},
            {"label": "Funk", "icon": "🕺"},
            {"label": "Blues", "icon": "🎸"},
            {"label": "Country", "icon": "🤠"},
            {"label": "Metal", "icon": "🤘"},
            {"label": "Indie", "icon": "🎸"},
            {"label": "Classical", "icon": "🎻"},
            {"label": "Latin", "icon": "💃"}
        ]
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 6. Policy for genre_bar settings
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'Anyone can read genre_bar setting') THEN
        CREATE POLICY "Anyone can read genre_bar setting" ON public.platform_settings
        FOR SELECT USING (key = 'genre_bar');
    END IF;
END $$;
