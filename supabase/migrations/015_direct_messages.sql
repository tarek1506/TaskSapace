-- ============================================================
-- Migration 015: Direct Messages (Private Chat)
-- Run this in your Supabase SQL editor
-- ============================================================

-- ─── 1. Threads table ────────────────────────────────────────
-- One row per unique conversation between two users in a workspace.
-- participant_a and participant_b are always stored in alphabetical order
-- (lower UUID first) so we never create duplicate threads.

CREATE TABLE IF NOT EXISTS public.direct_message_threads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  participant_a uuid NOT NULL,  -- always the lower UUID
  participant_b uuid NOT NULL,  -- always the higher UUID
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  UNIQUE (workspace_id, participant_a, participant_b)
);

-- ─── 2. Messages table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL,
  content    text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast thread message loading
CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_id
  ON public.direct_messages(thread_id, created_at DESC);

-- ─── 3. Read receipts table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.direct_message_reads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES public.direct_message_threads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  read_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

-- ─── 4. Auto-update last_message_at on new messages ─────────
CREATE OR REPLACE FUNCTION public.update_thread_last_message_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.direct_message_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_thread_last_message_at ON public.direct_messages;
CREATE TRIGGER trg_update_thread_last_message_at
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_last_message_at();

-- ─── 5. Row Level Security ───────────────────────────────────
ALTER TABLE public.direct_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_reads ENABLE ROW LEVEL SECURITY;

-- Threads: users can see/create threads they are a participant of
CREATE POLICY "Users can view their own threads"
  ON public.direct_message_threads FOR SELECT
  USING (
    auth.uid() = participant_a
    OR auth.uid() = participant_b
  );

CREATE POLICY "Users can create threads they participate in"
  ON public.direct_message_threads FOR INSERT
  WITH CHECK (
    auth.uid() = participant_a
    OR auth.uid() = participant_b
  );

-- Messages: users can read messages in threads they participate in
CREATE POLICY "Users can view messages in their threads"
  ON public.direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = thread_id
        AND (t.participant_a = auth.uid() OR t.participant_b = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their threads"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_message_threads t
      WHERE t.id = thread_id
        AND (t.participant_a = auth.uid() OR t.participant_b = auth.uid())
    )
  );

-- Read receipts: users can manage their own read receipts
CREATE POLICY "Users can view their own read receipts"
  ON public.direct_message_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own read receipts"
  ON public.direct_message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read receipts"
  ON public.direct_message_reads FOR UPDATE
  USING (user_id = auth.uid());

-- ─── 6. Enable Realtime ──────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_message_threads;
