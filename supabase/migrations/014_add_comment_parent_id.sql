ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES task_comments(id) ON DELETE CASCADE;
