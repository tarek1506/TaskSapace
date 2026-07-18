-- ============================================================
-- Allow workspace owners to update member profiles
-- ============================================================

-- Drop existing update policy
drop policy if exists "profiles_update" on public.profiles;

-- Users can always update their own profile
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Workspace owners can update any member's profile in their workspace
create policy "profiles_update_by_owner" on public.profiles
  for update using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.user_id = profiles.id
      and workspace_members.workspace_id in (
        select workspace_id from public.workspace_members
        where user_id = auth.uid()
        and role = 'owner'
      )
    )
  );
