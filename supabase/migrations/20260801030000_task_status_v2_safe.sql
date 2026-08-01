-- SAFE MIGRATION: Add status column without dropping completed to preserve existing data

-- 1. Add status column to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'completed', 'wont_do'));

-- 2. Migrate existing completed boolean to status safely
UPDATE public.tasks 
SET status = 'completed' 
WHERE completed = true;

NOTIFY pgrst, 'reload schema';

-- 3. Add status column to task_completions
ALTER TABLE public.task_completions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed' 
CHECK (status IN ('pending', 'completed', 'wont_do'));

-- 4. Migrate task_completions completed boolean to status safely
UPDATE public.task_completions 
SET status = 'completed' 
WHERE completed = true;

NOTIFY pgrst, 'reload schema';

-- 5. Update complete_task RPC to use status but keep completed backward compatible
CREATE OR REPLACE FUNCTION public.complete_task(
  p_task_id UUID,
  p_occurrence_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id UUID;
  v_task RECORD;
  v_xp_earned INTEGER;
  v_total_xp INTEGER;
  v_reference_id TEXT;
  v_is_recurring BOOLEAN;
  v_is_valid_occ BOOLEAN;
  v_completed_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_task 
  FROM public.tasks 
  WHERE id = p_task_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not owned by user';
  END IF;

  v_is_recurring := (v_task.recurrence_type IS NOT NULL AND v_task.recurrence_type <> 'none');

  IF v_task.priority = 'high' THEN
    v_xp_earned := 20;
  ELSIF v_task.priority = 'medium' THEN
    v_xp_earned := 10;
  ELSE
    v_xp_earned := 5;
  END IF;

  IF v_is_recurring THEN
    v_is_valid_occ := private.is_valid_task_occurrence(v_task.scheduled_date, v_task.recurrence_type, v_task.recurrence_interval, v_task.recurrence_weekdays, v_task.recurrence_end_date, p_occurrence_date);
    
    v_reference_id := 'task_' || p_task_id::text || '_occurrence_' || to_char(p_occurrence_date, 'YYYY-MM-DD');

    PERFORM 1 FROM public.task_completions 
    WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date AND status = 'completed';
    
    IF FOUND THEN
      SELECT completed_at INTO v_completed_at FROM public.task_completions WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date AND status = 'completed';
      SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
      RETURN jsonb_build_object('task_id', p_task_id, 'occurrence_date', p_occurrence_date, 'status', 'completed', 'completed_at', v_completed_at, 'xp_earned', 0, 'total_xp', v_total_xp, 'already_completed', true, 'reference_id', v_reference_id);
    END IF;

    -- Delete wont_do if exists, since we are now completing it
    DELETE FROM public.task_completions WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date;

    v_completed_at := now();
    -- ALSO update completed=true for backward compatibility
    INSERT INTO public.task_completions (user_id, task_id, occurrence_date, status, completed, completed_at, created_at, updated_at)
    VALUES (v_user_id, p_task_id, p_occurrence_date, 'completed', true, v_completed_at, now(), now());

  ELSE
    v_reference_id := 'task_' || p_task_id::text;

    IF v_task.status = 'completed' THEN
      SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
      RETURN jsonb_build_object('task_id', p_task_id, 'occurrence_date', p_occurrence_date, 'status', 'completed', 'completed_at', v_task.completed_at, 'xp_earned', 0, 'total_xp', v_total_xp, 'already_completed', true, 'reference_id', v_reference_id);
    END IF;

    v_completed_at := now();
    UPDATE public.tasks 
    SET status = 'completed', completed = true, completed_at = v_completed_at, updated_at = now()
    WHERE id = p_task_id;
  END IF;

  PERFORM 1 FROM public.events 
  WHERE user_id = v_user_id AND type = 'task_completed' AND reference_id = v_reference_id AND metadata ? 'xp_earned';
  
  IF FOUND THEN
    v_xp_earned := 0;
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
  ELSE
    v_total_xp := private.award_xp_internal(v_user_id, v_xp_earned, 'task_completed', 'tasks', v_reference_id, jsonb_build_object('task_id', p_task_id, 'occurrence_date', p_occurrence_date, 'title', v_task.title, 'priority', v_task.priority));
  END IF;

  RETURN jsonb_build_object('task_id', p_task_id, 'occurrence_date', p_occurrence_date, 'status', 'completed', 'completed_at', v_completed_at, 'xp_earned', v_xp_earned, 'total_xp', v_total_xp, 'already_completed', false, 'reference_id', v_reference_id);
END;
$$;

-- 6. Update uncomplete_task RPC to use status and keep completed backward compatible
CREATE OR REPLACE FUNCTION public.uncomplete_task(
  p_task_id UUID,
  p_occurrence_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id UUID;
  v_task RECORD;
  v_is_recurring BOOLEAN;
  v_was_completed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not owned by user';
  END IF;
  v_is_recurring := (v_task.recurrence_type IS NOT NULL AND v_task.recurrence_type <> 'none');
  IF v_is_recurring THEN
    DELETE FROM public.task_completions WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date AND user_id = v_user_id;
    v_was_completed := FOUND;
  ELSE
    v_was_completed := (v_task.status <> 'pending');
    IF v_was_completed THEN
      UPDATE public.tasks SET status = 'pending', completed = false, completed_at = NULL, updated_at = now() WHERE id = p_task_id;
    END IF;
  END IF;
  RETURN jsonb_build_object('task_id', p_task_id, 'occurrence_date', p_occurrence_date, 'status', 'pending', 'was_completed', v_was_completed);
END;
$$;

-- 7. Create mark_task_wont_do RPC
CREATE OR REPLACE FUNCTION public.mark_task_wont_do(
  p_task_id UUID,
  p_occurrence_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id UUID;
  v_task RECORD;
  v_is_recurring BOOLEAN;
  v_completed_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not owned by user';
  END IF;
  v_is_recurring := (v_task.recurrence_type IS NOT NULL AND v_task.recurrence_type <> 'none');
  v_completed_at := now();
  IF v_is_recurring THEN
    -- Delete if exists (like pending), then insert as wont_do
    DELETE FROM public.task_completions WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date AND user_id = v_user_id;
    INSERT INTO public.task_completions (user_id, task_id, occurrence_date, status, completed, completed_at, created_at, updated_at)
    VALUES (v_user_id, p_task_id, p_occurrence_date, 'wont_do', false, v_completed_at, now(), now());
  ELSE
    UPDATE public.tasks SET status = 'wont_do', completed = false, completed_at = v_completed_at, updated_at = now() WHERE id = p_task_id;
  END IF;
  RETURN jsonb_build_object('task_id', p_task_id, 'occurrence_date', p_occurrence_date, 'status', 'wont_do', 'completed_at', v_completed_at);
END;
$$;
