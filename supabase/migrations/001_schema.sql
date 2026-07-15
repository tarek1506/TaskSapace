-- ============================================================
-- TaskSpace Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES (synced from auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. WORKSPACES
-- ─────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────
-- 3. WORKSPACE MEMBERS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),

  -- Granular permissions (default: no access)
  can_create_task boolean not null default false,
  can_edit_task boolean not null default false,
  can_delete_task boolean not null default false,
  can_assign_task boolean not null default false,
  can_view_all_tasks boolean not null default false,
  can_edit_others_tasks boolean not null default false,

  -- Force password change on first login
  must_change_password boolean not null default false,

  joined_at timestamptz default now() not null,

  unique (workspace_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4. TASKS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  project_label text,
  project_color text,
  assigned_to uuid[] default '{}',
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────
-- 5. TASK COMMENTS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────
-- 6. INDEXES
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_tasks_workspace on public.tasks(workspace_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_task_comments_task on public.task_comments(task_id);
