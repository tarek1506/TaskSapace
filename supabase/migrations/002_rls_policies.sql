-- ============================================================
-- Row Level Security (RLS) Policies
-- Run AFTER 001_schema.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- HELPER FUNCTION: is_workspace_member
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
    and user_id = auth.uid()
  );
$$;

-- Helper: is owner
create or replace function public.is_workspace_owner(ws_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
    and user_id = auth.uid()
    and role = 'owner'
  );
$$;

-- Helper: get member permission flag
create or replace function public.member_has_permission(ws_id uuid, perm text)
returns boolean
language plpgsql
stable
security definer
as $$
declare
  result boolean;
begin
  execute format(
    'select coalesce(%I, false) from public.workspace_members where workspace_id = $1 and user_id = $2',
    perm
  ) into result using ws_id, auth.uid();
  return coalesce(result, false);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles_own" on public.profiles
  for all using (id = auth.uid());

-- Allow workspace members to see each others' profiles
create policy "profiles_workspace_peers" on public.profiles
  for select using (
    exists (
      select 1 from public.workspace_members wm1
      join public.workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = auth.uid()
      and wm2.user_id = profiles.id
    )
  );

-- ─────────────────────────────────────────────────────────────
-- WORKSPACES
-- ─────────────────────────────────────────────────────────────
alter table public.workspaces enable row level security;

-- Members can view workspaces they belong to
create policy "workspaces_select" on public.workspaces
  for select using (is_workspace_member(id));

-- Any authenticated user can create a workspace
create policy "workspaces_insert" on public.workspaces
  for insert with check (auth.uid() = owner_id);

-- Only owner can update
create policy "workspaces_update" on public.workspaces
  for update using (is_workspace_owner(id));

-- Only owner can delete
create policy "workspaces_delete" on public.workspaces
  for delete using (is_workspace_owner(id));

-- ─────────────────────────────────────────────────────────────
-- WORKSPACE MEMBERS
-- ─────────────────────────────────────────────────────────────
alter table public.workspace_members enable row level security;

-- Members can see all members of workspaces they belong to
create policy "members_select" on public.workspace_members
  for select using (is_workspace_member(workspace_id));

-- Only owners can insert members
create policy "members_insert" on public.workspace_members
  for insert with check (
    is_workspace_owner(workspace_id)
    or (auth.uid() = user_id and role = 'owner')  -- allow self-insert as owner during workspace creation
  );

-- Only owners can update member permissions
create policy "members_update" on public.workspace_members
  for update using (is_workspace_owner(workspace_id));

-- Owners can remove members (not themselves)
create policy "members_delete" on public.workspace_members
  for delete using (
    is_workspace_owner(workspace_id)
    and user_id != auth.uid()
  );

-- ─────────────────────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────────────────────
alter table public.tasks enable row level security;

-- SELECT: member must belong to workspace.
-- If can_view_all_tasks is false, they can only see tasks assigned to them.
create policy "tasks_select" on public.tasks
  for select using (
    is_workspace_member(workspace_id)
    and (
      is_workspace_owner(workspace_id)
      or member_has_permission(workspace_id, 'can_view_all_tasks')
      or auth.uid() = any(assigned_to)
      or auth.uid() = created_by
    )
  );

-- INSERT: must have can_create_task or be owner
create policy "tasks_insert" on public.tasks
  for insert with check (
    is_workspace_member(workspace_id)
    and (
      is_workspace_owner(workspace_id)
      or member_has_permission(workspace_id, 'can_create_task')
    )
  );

-- UPDATE: owner, or has can_edit_task (own) / can_edit_others_tasks
create policy "tasks_update" on public.tasks
  for update using (
    is_workspace_member(workspace_id)
    and (
      is_workspace_owner(workspace_id)
      or member_has_permission(workspace_id, 'can_edit_others_tasks')
      or (
        member_has_permission(workspace_id, 'can_edit_task')
        and (auth.uid() = any(assigned_to) or auth.uid() = created_by)
      )
    )
  );

-- DELETE: owner or has can_delete_task and is creator
create policy "tasks_delete" on public.tasks
  for delete using (
    is_workspace_member(workspace_id)
    and (
      is_workspace_owner(workspace_id)
      or (
        member_has_permission(workspace_id, 'can_delete_task')
        and auth.uid() = created_by
      )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- TASK COMMENTS
-- ─────────────────────────────────────────────────────────────
alter table public.task_comments enable row level security;

-- Anyone who can see the task can see comments
create policy "comments_select" on public.task_comments
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
      and is_workspace_member(t.workspace_id)
    )
  );

-- Any workspace member can comment (no permission check)
create policy "comments_insert" on public.task_comments
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
      and is_workspace_member(t.workspace_id)
    )
  );

-- Users can only edit their own comments
create policy "comments_update" on public.task_comments
  for update using (auth.uid() = user_id);

-- Users can delete their own comments; owners can delete any
create policy "comments_delete" on public.task_comments
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
    )
  );
