-- Initialize Banner Settings in platform_settings
INSERT INTO public.platform_settings (key, value)
VALUES (
    'banner_settings',
    '{
        "is_enabled": true,
        "auto_slide": true,
        "slide_duration": 8
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Policy for banner_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'Anyone can read banner_settings') THEN
        CREATE POLICY "Anyone can read banner_settings" ON public.platform_settings
        FOR SELECT USING (key = 'banner_settings');
    END IF;
END $$;
