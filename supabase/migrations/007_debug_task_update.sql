-- ============================================================
-- Debug: Simplify task UPDATE policy
-- This makes any workspace member able to update tasks in their workspace
-- Remove or adjust after debugging
-- ============================================================

-- First, check existing policies
-- SELECT * FROM pg_policies WHERE tablename = 'tasks';

-- Drop restrictive update policy
drop policy if exists "tasks_update" on public.tasks;

-- Create a permissive policy for debugging
-- Any workspace member can update any task in their workspace
create policy "tasks_update_debug" on public.tasks
  for update using (
    is_workspace_member(workspace_id)
  );

-- Also add a permissive INSERT policy for debugging
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert_debug" on public.tasks
  for insert with check (
    is_workspace_member(workspace_id)
  );

-- For SELECT, make it very permissive during debug
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select_debug" on public.tasks
  for select using (
    is_workspace_member(workspace_id)
    or true  -- Allow all for debugging
  );

-- Add logging function to see what's happening
create or replace function public.log_task_update(task_id uuid, new_status text, user_id uuid)
returns void as $$
begin
  raise log 'Task update attempt: id=%, new_status=%, user_id=%', task_id, new_status, user_id;
end;
$$ language plpgsql security definer;
