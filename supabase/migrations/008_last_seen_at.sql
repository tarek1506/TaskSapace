-- ============================================================
-- Add last_seen_at to profiles for online status
-- ============================================================

-- Add last_seen_at column to profiles
alter table public.profiles
add column if not exists last_seen_at timestamptz default now();

-- Create index for faster queries
create index if not exists idx_profiles_last_seen on public.profiles(last_seen_at);

-- Function to update last_seen_at
create or replace function public.update_last_seen()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid();
  return new;
end;
$$;

-- Trigger on auth state change (login/refresh)
drop trigger if exists on_auth_session_updated on auth.sessions;
create trigger on_auth_session_updated
  after update on auth.sessions
  for each row execute function public.update_last_seen();

-- Also update on user metadata changes
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.update_last_seen();
