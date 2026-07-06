-- Migration to extend the task system for FocusForge

-- 1. Create task_sections table
CREATE TABLE IF NOT EXISTS task_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'folder',
  color text NOT NULL DEFAULT '#a855f7',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on task_sections
ALTER TABLE task_sections ENABLE ROW LEVEL SECURITY;

-- Create Policies for task_sections
CREATE POLICY "Users can view own task sections"
  ON task_sections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task sections"
  ON task_sections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task sections"
  ON task_sections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own task sections"
  ON task_sections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS task_sections_user_id_idx ON task_sections(user_id);


-- 2. Alter tasks table to support new fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES task_sections(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS has_no_end_date boolean NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_time text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_weekdays text[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date date;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index for section_id on tasks
CREATE INDEX IF NOT EXISTS tasks_section_id_idx ON tasks(section_id);
CREATE INDEX IF NOT EXISTS tasks_scheduled_date_idx ON tasks(scheduled_date);


-- 3. Create task_completions table for recurring occurrence completions
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_task_occurrence UNIQUE(task_id, occurrence_date)
);

-- Enable RLS on task_completions
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Create Policies for task_completions
CREATE POLICY "Users can view own task completions"
  ON task_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task completions"
  ON task_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task completions"
  ON task_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own task completions"
  ON task_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes on task_completions
CREATE INDEX IF NOT EXISTS task_completions_user_id_idx ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS task_completions_task_id_idx ON task_completions(task_id);
