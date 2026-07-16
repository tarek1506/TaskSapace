-- ============================================================
-- 006_avatar_storage.sql
-- Add avatar_url to profiles and configure storage
-- ============================================================

-- Add avatar_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- ============================================================
-- MANUAL STEP REQUIRED IN SUPABASE DASHBOARD:
-- ============================================================
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create a new bucket named "avatars" (make it Public)
-- 3. The policies will be created automatically
-- ============================================================

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
