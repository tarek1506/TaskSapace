-- ============================================================
-- QUICK FIX: Run this in Supabase SQL Editor if you get
-- "violates row-level security policy" errors on workspaces
-- ============================================================

-- 1. Make sure the helper functions exist
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(ws_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- 2. Re-enable RLS on all tables
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

-- 3. Drop and recreate workspace policies cleanly
drop policy if exists "workspaces_select" on public.workspaces;
drop policy if exists "workspaces_insert" on public.workspaces;
drop policy if exists "workspaces_update" on public.workspaces;
drop policy if exists "workspaces_delete" on public.workspaces;

-- Owner can always see their own workspace (covers the post-insert window before
-- they are added to workspace_members). Members see via is_workspace_member.
create policy "workspaces_select" on public.workspaces
  for select using (
    auth.uid() = owner_id
    or is_workspace_member(id)
  );

create policy "workspaces_insert" on public.workspaces
  for insert with check (auth.uid() = owner_id);

create policy "workspaces_update" on public.workspaces
  for update using (is_workspace_owner(id));

create policy "workspaces_delete" on public.workspaces
  for delete using (is_workspace_owner(id));

-- 4. Drop and recreate workspace_members policies cleanly
drop policy if exists "members_select" on public.workspace_members;
drop policy if exists "members_insert" on public.workspace_members;
drop policy if exists "members_update" on public.workspace_members;
drop policy if exists "members_delete" on public.workspace_members;

create policy "members_select" on public.workspace_members
  for select using (is_workspace_member(workspace_id));

-- Allow insert if: you are the owner of that workspace, OR you are adding yourself as 'owner' (first time setup)
create policy "members_insert" on public.workspace_members
  for insert with check (
    is_workspace_owner(workspace_id)
    or (auth.uid() = user_id and role = 'owner')
  );

create policy "members_update" on public.workspace_members
  for update using (is_workspace_owner(workspace_id));

create policy "members_delete" on public.workspace_members
  for delete using (
    is_workspace_owner(workspace_id) and user_id != auth.uid()
  );

-- 5. Tasks policies
drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_select" on public.tasks
  for select using (
    is_workspace_member(workspace_id)
    and (
      is_workspace_owner(workspace_id)
      or (select can_view_all_tasks from public.workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
      or auth.uid() = any(assigned_to)
      or auth.uid() = created_by
    )
  );

create policy "tasks_insert" on public.tasks
  for insert with check (
    is_workspace_member(workspace_id)
    and (
      is_workspace_owner(workspace_id)
      or (select can_create_task from public.workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
    )
  );

create policy "tasks_update" on public.tasks
  for update using (
    is_workspace_member(workspace_id)
    and (
      is_workspace_owner(workspace_id)
      or (select can_edit_others_tasks from public.workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
      or (
        (select can_edit_task from public.workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
        and (auth.uid() = any(assigned_to) or auth.uid() = created_by)
      )
    )
  );

create policy "tasks_delete" on public.tasks
  for delete using (
    is_workspace_member(workspace_id)
    and (
      is_workspace_owner(workspace_id)
      or (
        (select can_delete_task from public.workspace_members where workspace_id = tasks.workspace_id and user_id = auth.uid())
        and auth.uid() = created_by
      )
    )
  );

-- 6. Comments policies
drop policy if exists "comments_select" on public.task_comments;
drop policy if exists "comments_insert" on public.task_comments;
drop policy if exists "comments_update" on public.task_comments;
drop policy if exists "comments_delete" on public.task_comments;

create policy "comments_select" on public.task_comments
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and is_workspace_member(t.workspace_id))
  );

create policy "comments_insert" on public.task_comments
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.tasks t where t.id = task_id and is_workspace_member(t.workspace_id))
  );

create policy "comments_update" on public.task_comments
  for update using (auth.uid() = user_id);

create policy "comments_delete" on public.task_comments
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_id and wm.user_id = auth.uid() and wm.role = 'owner'
    )
  );

-- ============================================================
-- 7. GRANTS — Required when tables are created via raw SQL
--    (Supabase UI does this automatically, but raw SQL doesn't)
-- ============================================================
grant usage on schema public to anon, authenticated;

grant all on public.profiles          to anon, authenticated;
grant all on public.workspaces        to anon, authenticated;
grant all on public.workspace_members to anon, authenticated;
grant all on public.tasks             to anon, authenticated;
grant all on public.task_comments     to anon, authenticated;

