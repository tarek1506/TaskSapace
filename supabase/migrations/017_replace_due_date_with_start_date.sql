-- ============================================================
-- Migration 017: Replace due_date with start_date
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Drop trigger temporarily to prevent column rename dependency locks
DROP TRIGGER IF EXISTS on_task_changes ON public.tasks;

-- 2. Rename due_date column to start_date (or ensure start_date column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.tasks RENAME COLUMN due_date TO start_date;
  ELSE
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date timestamptz;
  END IF;
END $$;

-- 3. Re-create notification trigger function referencing start_date instead of due_date
CREATE OR REPLACE FUNCTION public.handle_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ws_id uuid;
  act_type text;
  det jsonb;
  curr_user uuid;
BEGIN
  curr_user := auth.uid();
  IF curr_user IS NULL THEN
    IF (TG_OP = 'DELETE') THEN RETURN old; ELSE RETURN new; END IF;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    ws_id := new.workspace_id;
    act_type := 'task_created';
    det := jsonb_build_object('task_title', new.title, 'task_id', new.id);
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (old.title = new.title AND 
        coalesce(old.description, '') = coalesce(new.description, '') AND 
        old.status = new.status AND 
        coalesce(old.start_date, '1970-01-01'::timestamptz) = coalesce(new.start_date, '1970-01-01'::timestamptz) AND
        coalesce(old.deadline, '1970-01-01'::timestamptz) = coalesce(new.deadline, '1970-01-01'::timestamptz) AND
        old.assigned_to = new.assigned_to) THEN
      RETURN new;
    END IF;

    ws_id := new.workspace_id;
    act_type := 'task_updated';
    det := jsonb_build_object(
      'task_title', new.title,
      'task_id', new.id,
      'status_changed', (old.status != new.status),
      'old_status', old.status,
      'new_status', new.status,
      'title_changed', (old.title != new.title),
      'old_title', old.title,
      'new_title', new.title
    );
  ELSIF (TG_OP = 'DELETE') THEN
    ws_id := old.workspace_id;
    act_type := 'task_deleted';
    det := jsonb_build_object('task_title', old.title);
  END IF;

  INSERT INTO public.notifications (workspace_id, user_id, task_id, action_type, details)
  VALUES (
    ws_id,
    curr_user,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE new.id END,
    act_type,
    det
  );

  IF (TG_OP = 'DELETE') THEN RETURN old; ELSE RETURN new; END IF;
END;
$$;

-- 4. Re-attach trigger to tasks table
CREATE TRIGGER on_task_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_changes();
