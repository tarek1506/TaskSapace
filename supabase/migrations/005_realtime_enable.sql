-- ============================================================
-- 005_realtime_enable.sql
-- Run this in Supabase SQL Editor to enable real-time
-- notifications for the notifications table.
-- ============================================================

-- Add the notifications table to the Supabase Realtime publication
-- so that INSERT events are pushed to subscribed clients instantly.
-- The exception makes this safe to run if the table was already enabled in
-- the Supabase dashboard.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end;
$$;
