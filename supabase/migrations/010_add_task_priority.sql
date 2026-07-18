-- ============================================================
-- Add priority column to tasks table
-- ============================================================

-- Add priority column with a default of 'none' for existing rows
alter table public.tasks
  add column if not exists priority text not null default 'none';

-- Constrain to valid values
do $$ begin
  alter table public.tasks
    add constraint tasks_priority_check
    check (priority in ('high', 'medium', 'low', 'none'));
exception when duplicate_object then null;
end $$;
