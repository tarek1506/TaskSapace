-- ============================================================
-- Migration 016: Chat File Attachments
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Add file attachment columns to direct_messages table
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint;

-- 2. Relax non-empty content check so messages can contain files without text
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_content_check;

ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_content_check
  CHECK (
    (content IS NOT NULL AND char_length(content) > 0 AND char_length(content) <= 4000)
    OR file_url IS NOT NULL
  );

-- ============================================================
-- MANUAL STEP IN SUPABASE DASHBOARD:
-- ============================================================
-- 1. Go to Storage -> Buckets in your Supabase Dashboard
-- 2. Create a bucket named "chat-attachments" (set it as PUBLIC)
-- ============================================================
