-- ============================================================
-- 004_notifications.sql
-- Run in your Supabase SQL Editor to enable notifications
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  action_type text not null, -- 'task_created', 'task_updated', 'task_deleted', 'comment_added'
  details jsonb not null, -- e.g., {"task_title": "Setup DB", ...}
  created_at timestamptz default now() not null
);

-- Index for fast queries by workspace
create index if not exists idx_notifications_workspace on public.notifications(workspace_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- Enable RLS
alter table public.notifications enable row level security;

-- Select policy: workspace members can read notifications
create policy "notifications_select" on public.notifications
  for select using (is_workspace_member(workspace_id));

-- Trigger function for task changes
create or replace function public.handle_task_changes()
returns trigger
language plpgsql
security definer
as $$
declare
  ws_id uuid;
  act_type text;
  det jsonb;
  curr_user uuid;
begin
  curr_user := auth.uid();
  if curr_user is null then
    if (TG_OP = 'DELETE') then
      return old;
    else
      return new;
    end if;
  end if;

  if (TG_OP = 'INSERT') then
    ws_id := new.workspace_id;
    act_type := 'task_created';
    det := jsonb_build_object('task_title', new.title, 'task_id', new.id);
  elsif (TG_OP = 'UPDATE') then
    -- Only log if key fields changed
    if (old.title = new.title and 
        coalesce(old.description, '') = coalesce(new.description, '') and 
        old.status = new.status and 
        coalesce(old.start_date, '1970-01-01'::timestamptz) = coalesce(new.start_date, '1970-01-01'::timestamptz) and
        old.assigned_to = new.assigned_to) then
      return new;
    end if;

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
  elsif (TG_OP = 'DELETE') then
    ws_id := old.workspace_id;
    act_type := 'task_deleted';
    det := jsonb_build_object('task_title', old.title);
  end if;

  insert into public.notifications (workspace_id, user_id, task_id, action_type, details)
  values (
    ws_id,
    curr_user,
    case when TG_OP = 'DELETE' then null else new.id end,
    act_type,
    det
  );

  if (TG_OP = 'DELETE') then
    return old;
  else
    return new;
  end if;
end;
$$;

-- Create trigger on tasks
drop trigger if exists on_task_changes on public.tasks;
create trigger on_task_changes
  after insert or update or delete on public.tasks
  for each row execute function public.handle_task_changes();

-- Trigger function for comment changes
create or replace function public.handle_comment_changes()
returns trigger
language plpgsql
security definer
as $$
declare
  ws_id uuid;
  t_title text;
  curr_user uuid;
begin
  curr_user := auth.uid();
  if curr_user is null then
    return new;
  end if;

  -- Get workspace_id and task title
  select workspace_id, title into ws_id, t_title from public.tasks where id = new.task_id;

  if ws_id is not null then
    insert into public.notifications (workspace_id, user_id, task_id, action_type, details)
    values (
      ws_id,
      curr_user,
      new.task_id,
      'comment_added',
      jsonb_build_object(
        'task_title', t_title,
        'task_id', new.task_id,
        'comment_preview', substring(new.content from 1 for 40)
      )
    );
  end if;

  return new;
end;
$$;

-- Create trigger on task_comments
drop trigger if exists on_comment_changes on public.task_comments;
create trigger on_comment_changes
  after insert on public.task_comments
  for each row execute function public.handle_comment_changes();

-- Grants
grant all on public.notifications to anon, authenticated;
