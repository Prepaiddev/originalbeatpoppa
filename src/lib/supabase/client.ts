import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials missing in .env.local!');
  console.warn('Current URL:', supabaseUrl);
  console.warn('Current Key:', supabaseAnonKey ? 'Present (Hidden)' : 'Missing');
}

// Create a client with placeholders if env vars are missing to prevent crash
// This allows the app to load and show configuration instructions instead of a white screen
export const supabase = createBrowserClient(
  supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
