# Project Status: BeatPoppa (Afrobeats Hub)

## 🚨 Critical Setup Required
The application is currently failing because it cannot connect to your Supabase project.

### 1. Update Environment Variables
You must open `.env.local` and replace the placeholder values with your real Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
*Get these from Supabase Dashboard > Settings > API.*

### 2. Run Database Setup
I cannot run this for you remotely. You must:
1.  Open the file: `supabase/migrations/20240228_consolidated_setup.sql`
2.  Copy all the code.
3.  Go to **Supabase Dashboard > SQL Editor**.
4.  Paste the code and click **Run**.

This will create:
*   `profiles`, `beats`, `orders`, `payment_settings` tables.
*   `beats` and `covers` storage buckets.
*   Security policies (RLS).

---

## Recent Fixes
*   **Fixed Hydration Error**: Updated `src/data/beats.ts` to use deterministic pricing (no more random mismatches).
*   **Fixed Database Schema**: Created a consolidated SQL script to fix "relation profiles does not exist" errors.
*   **Admin Payments**: Added `payment_settings` table for dynamic Stripe/Paystack switching.

## Current Features
*   **Authentication**: Sign Up/Login with Supabase Auth (Working once `.env.local` is fixed).
*   **Creator Dashboard**: Upload beats (MP3/WAV) + Cover Art to Supabase Storage.
*   **Buyer Dashboard**: Purchase flow with dynamic payment providers.
*   **Admin Dashboard**: Manage users, beats, and payouts.

## Next Steps
1.  **Verify Payments**: Test the Stripe/Paystack integration in Checkout.
2.  **Deploy**: Prepare for Vercel deployment.
