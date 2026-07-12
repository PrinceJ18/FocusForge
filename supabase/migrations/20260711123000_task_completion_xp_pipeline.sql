BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

-- 1. Create Private Recurrence Helper
CREATE OR REPLACE FUNCTION private.is_valid_task_occurrence(
  p_scheduled_date DATE,
  p_recurrence_type TEXT,
  p_recurrence_interval INTEGER,
  p_recurrence_weekdays TEXT[],
  p_recurrence_end_date DATE,
  p_occurrence_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_days_diff INTEGER;
  v_months_diff INTEGER;
  v_target_year INTEGER;
  v_target_month INTEGER;
  v_max_days INTEGER;
  v_target_day INTEGER;
  v_expected_date DATE;
  v_dow INTEGER;
  v_dow_name TEXT;
  v_interval INTEGER;
BEGIN
  IF p_scheduled_date IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_occurrence_date < p_scheduled_date THEN
    RETURN FALSE;
  END IF;

  IF p_recurrence_end_date IS NOT NULL AND p_occurrence_date > p_recurrence_end_date THEN
    RETURN FALSE;
  END IF;

  v_interval := COALESCE(p_recurrence_interval, 1);
  IF v_interval <= 0 THEN
    v_interval := 1;
  END IF;

  IF p_recurrence_type IN ('daily', 'custom') THEN
    v_days_diff := p_occurrence_date - p_scheduled_date;
    RETURN (v_days_diff % v_interval) = 0;

  ELSIF p_recurrence_type = 'weekly' THEN
    v_days_diff := p_occurrence_date - p_scheduled_date;
    RETURN (v_days_diff % (7 * v_interval)) = 0;

  ELSIF p_recurrence_type = 'monthly' THEN
    v_months_diff := (EXTRACT(YEAR FROM p_occurrence_date) - EXTRACT(YEAR FROM p_scheduled_date))::int * 12 + 
                     (EXTRACT(MONTH FROM p_occurrence_date) - EXTRACT(MONTH FROM p_scheduled_date))::int;
    
    IF v_months_diff < 0 OR (v_months_diff % v_interval) <> 0 THEN
      RETURN FALSE;
    END IF;

    v_target_year := (EXTRACT(YEAR FROM p_scheduled_date)::int * 12 + EXTRACT(MONTH FROM p_scheduled_date)::int - 1 + v_months_diff) / 12;
    v_target_month := ((EXTRACT(YEAR FROM p_scheduled_date)::int * 12 + EXTRACT(MONTH FROM p_scheduled_date)::int - 1 + v_months_diff) % 12) + 1;

    -- Clamp to last day of month if necessary
    v_max_days := EXTRACT(DAY FROM (make_date(v_target_year::int, v_target_month::int, 1) + interval '1 month' - interval '1 day'));
    v_target_day := LEAST(EXTRACT(DAY FROM p_scheduled_date)::int, v_max_days);
    v_expected_date := make_date(v_target_year::int, v_target_month::int, v_target_day::int);

    RETURN v_expected_date = p_occurrence_date;

  ELSIF p_recurrence_type = 'weekdays' THEN
    IF p_recurrence_weekdays IS NULL OR array_length(p_recurrence_weekdays, 1) = 0 THEN
      RETURN FALSE;
    END IF;
    
    v_dow := EXTRACT(ISODOW FROM p_occurrence_date);
    v_dow_name := CASE v_dow
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
      WHEN 7 THEN 'sunday'
    END;

    RETURN v_dow_name = ANY(p_recurrence_weekdays);

  ELSIF p_recurrence_type = 'none' THEN
    RETURN FALSE;

  ELSE
    -- Unknown recurrence type
    RETURN FALSE;
  END IF;
END;
$$;

ALTER FUNCTION private.is_valid_task_occurrence(DATE, TEXT, INTEGER, TEXT[], DATE, DATE) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.is_valid_task_occurrence(DATE, TEXT, INTEGER, TEXT[], DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_valid_task_occurrence(DATE, TEXT, INTEGER, TEXT[], DATE, DATE) FROM anon;
REVOKE ALL ON FUNCTION private.is_valid_task_occurrence(DATE, TEXT, INTEGER, TEXT[], DATE, DATE) FROM authenticated;

-- 2. Create public.complete_task RPC
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

  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'Task ID cannot be null';
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
    IF p_occurrence_date IS NULL THEN
      RAISE EXCEPTION 'Occurrence date cannot be null for recurring task';
    END IF;

    v_is_valid_occ := private.is_valid_task_occurrence(
      v_task.scheduled_date,
      v_task.recurrence_type,
      v_task.recurrence_interval,
      v_task.recurrence_weekdays,
      v_task.recurrence_end_date,
      p_occurrence_date
    );

    IF NOT v_is_valid_occ THEN
      RAISE EXCEPTION 'Invalid occurrence date for this recurring task';
    END IF;

    v_reference_id := 'task_' || p_task_id::text || '_occurrence_' || to_char(p_occurrence_date, 'YYYY-MM-DD');

    PERFORM 1 FROM public.task_completions 
    WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date;
    
    IF FOUND THEN
      SELECT completed_at INTO v_completed_at FROM public.task_completions WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date;
      SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
      RETURN jsonb_build_object(
        'task_id', p_task_id,
        'occurrence_date', p_occurrence_date,
        'completed', true,
        'completed_at', v_completed_at,
        'xp_earned', 0,
        'total_xp', v_total_xp,
        'already_completed', true,
        'reference_id', v_reference_id
      );
    END IF;

    v_completed_at := now();
    INSERT INTO public.task_completions (user_id, task_id, occurrence_date, completed, completed_at, created_at, updated_at)
    VALUES (v_user_id, p_task_id, p_occurrence_date, true, v_completed_at, now(), now());

  ELSE
    v_reference_id := 'task_' || p_task_id::text;

    IF v_task.completed THEN
      SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
      RETURN jsonb_build_object(
        'task_id', p_task_id,
        'occurrence_date', p_occurrence_date,
        'completed', true,
        'completed_at', v_task.completed_at,
        'xp_earned', 0,
        'total_xp', v_total_xp,
        'already_completed', true,
        'reference_id', v_reference_id
      );
    END IF;

    v_completed_at := now();
    UPDATE public.tasks 
    SET completed = true, completed_at = v_completed_at, updated_at = now()
    WHERE id = p_task_id;
  END IF;

  PERFORM 1 FROM public.events 
  WHERE user_id = v_user_id AND type = 'task_completed' AND reference_id = v_reference_id AND metadata ? 'xp_earned';
  
  IF FOUND THEN
    v_xp_earned := 0;
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
  ELSE
    v_total_xp := private.award_xp_internal(
      v_user_id,
      v_xp_earned,
      'task_completed',
      'tasks',
      v_reference_id,
      jsonb_build_object(
        'task_id', p_task_id,
        'occurrence_date', p_occurrence_date,
        'title', v_task.title,
        'priority', v_task.priority
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'task_id', p_task_id,
    'occurrence_date', p_occurrence_date,
    'completed', true,
    'completed_at', v_completed_at,
    'xp_earned', v_xp_earned,
    'total_xp', v_total_xp,
    'already_completed', false,
    'reference_id', v_reference_id
  );
END;
$$;

ALTER FUNCTION public.complete_task(UUID, DATE) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.complete_task(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_task(UUID, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_task(UUID, DATE) TO authenticated;

-- 3. Create public.uncomplete_task RPC
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
  v_is_valid_occ BOOLEAN;
  v_total_xp INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'Task ID cannot be null';
  END IF;

  SELECT * INTO v_task 
  FROM public.tasks 
  WHERE id = p_task_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not owned by user';
  END IF;

  v_is_recurring := (v_task.recurrence_type IS NOT NULL AND v_task.recurrence_type <> 'none');

  IF v_is_recurring THEN
    IF p_occurrence_date IS NULL THEN
      RAISE EXCEPTION 'Occurrence date cannot be null for recurring task';
    END IF;

    v_is_valid_occ := private.is_valid_task_occurrence(
      v_task.scheduled_date,
      v_task.recurrence_type,
      v_task.recurrence_interval,
      v_task.recurrence_weekdays,
      v_task.recurrence_end_date,
      p_occurrence_date
    );

    IF NOT v_is_valid_occ THEN
      RAISE EXCEPTION 'Invalid occurrence date for this recurring task';
    END IF;

    PERFORM 1 FROM public.task_completions 
    WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date;

    IF NOT FOUND THEN
      SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
      RETURN jsonb_build_object(
        'task_id', p_task_id,
        'occurrence_date', p_occurrence_date,
        'completed', false,
        'already_incomplete', true,
        'total_xp', v_total_xp
      );
    END IF;

    DELETE FROM public.task_completions 
    WHERE task_id = p_task_id AND occurrence_date = p_occurrence_date;
  ELSE
    IF NOT v_task.completed THEN
      SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
      RETURN jsonb_build_object(
        'task_id', p_task_id,
        'occurrence_date', p_occurrence_date,
        'completed', false,
        'already_incomplete', true,
        'total_xp', v_total_xp
      );
    END IF;

    UPDATE public.tasks 
    SET completed = false, completed_at = NULL, updated_at = now()
    WHERE id = p_task_id;
  END IF;

  SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'task_id', p_task_id,
    'occurrence_date', p_occurrence_date,
    'completed', false,
    'already_incomplete', false,
    'total_xp', v_total_xp
  );
END;
$$;

ALTER FUNCTION public.uncomplete_task(UUID, DATE) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.uncomplete_task(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uncomplete_task(UUID, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.uncomplete_task(UUID, DATE) TO authenticated;

COMMIT;
