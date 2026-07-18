-- ============================================================
-- Add order_index column to tasks table for drag-and-drop reordering
-- ============================================================

alter table public.tasks
  add column if not exists order_index integer not null default 0;

-- Set initial order based on created_at for existing tasks
update public.tasks set order_index = sub.row_num - 1
from (
  select id, row_number() over (partition by workspace_id, status order by created_at) as row_num
  from public.tasks
) sub
where tasks.id = sub.id;
