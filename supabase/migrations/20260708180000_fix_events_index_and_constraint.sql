-- Phase 5.3 Final Corrective Migration
-- Repairs the events idempotency index to match the verified live database state.
--
-- The original migration (20260706180000) created events_user_reference_idx as a
-- broad partial unique index on (user_id, reference_id) WHERE reference_id IS NOT NULL.
-- The live database was manually repaired to use a focus-specific partial unique index
-- named events_focus_completion_reference_idx that restricts uniqueness to
-- focus_session_completed events only, preventing unintended collisions between
-- reference_ids of different event types.
--
-- Additionally, the ON CONFLICT clause in log_focus_session used positional column
-- syntax (user_id, session_date) which works but should use the named constraint
-- for explicitness. The log_focus_session function is recreated to use:
--   ON CONFLICT ON CONSTRAINT focus_sessions_user_id_session_date_key

-- 1. Drop the old broad index and create the correct focus-specific partial unique index
DROP INDEX IF EXISTS public.events_user_reference_idx;

CREATE UNIQUE INDEX IF NOT EXISTS events_focus_completion_reference_idx
  ON public.events (user_id, reference_id)
  WHERE reference_id IS NOT NULL
    AND type = 'focus_session_completed';

-- 2. Recreate log_focus_session to use explicit named constraint ON CONFLICT
DROP FUNCTION IF EXISTS public.log_focus_session(DATE, INTEGER, TEXT, DATE);

CREATE OR REPLACE FUNCTION public.log_focus_session(
  p_session_date DATE,
  p_minutes INTEGER,
  p_reference_id TEXT,
  p_today DATE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  session_date DATE,
  minutes INTEGER,
  sessions_count INTEGER,
  xp_earned INTEGER,
  total_xp INTEGER,
  current_streak INTEGER,
  last_active_date TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_reference_id TEXT;
  v_xp_earned INTEGER;
  v_total_xp INTEGER;
  v_rows_updated INTEGER;
  v_session_id UUID;
  v_session_minutes INTEGER;
  v_session_count INTEGER;
  v_calculated_streak INTEGER;
  v_calculated_last_active TEXT;
BEGIN
  -- Authenticate user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Input Validations
  IF p_minutes IS NULL OR p_minutes < 1 OR p_minutes > 120 THEN
    RAISE EXCEPTION 'Invalid minutes: % must be between 1 and 120.', p_minutes;
  END IF;

  IF p_session_date IS NULL OR p_session_date < CURRENT_DATE - INTERVAL '1 day' OR p_session_date > CURRENT_DATE + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'Invalid session date: % is outside the timezone tolerance range of +/- 1 day.', p_session_date;
  END IF;

  IF p_today IS NULL OR p_today < CURRENT_DATE - INTERVAL '2 days' OR p_today > CURRENT_DATE + INTERVAL '2 days' THEN
    RAISE EXCEPTION 'Invalid current date: % is outside the timezone tolerance range of +/- 2 days.', p_today;
  END IF;

  IF p_reference_id IS NULL THEN
    RAISE EXCEPTION 'Reference ID cannot be null.';
  END IF;

  v_reference_id := trim(p_reference_id);

  IF length(v_reference_id) = 0 OR length(v_reference_id) > 100 THEN
    RAISE EXCEPTION 'Invalid reference ID: must be non-empty and maximum 100 characters.';
  END IF;

  -- Verify user profile exists
  PERFORM 1 FROM public.profiles WHERE public.profiles.id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', v_user_id;
  END IF;

  -- Server-side Focus XP calculation
  IF p_minutes >= 60 THEN
    v_xp_earned := 30;
  ELSIF p_minutes >= 45 THEN
    v_xp_earned := 20;
  ELSIF p_minutes >= 25 THEN
    v_xp_earned := 10;
  ELSE
    v_xp_earned := 5;
  END IF;

  -- A. Insert completion event to ensure idempotency (duplicate reference_id for focus events will fail)
  INSERT INTO public.events (user_id, type, category, reference_id, metadata, timestamp)
  VALUES (
    v_user_id, 
    'focus_session_completed', 
    'focus', 
    v_reference_id, 
    jsonb_build_object('minutes', p_minutes, 'xp_earned', v_xp_earned), 
    now()
  );

  -- B. Award XP atomically
  UPDATE public.profiles
  SET 
    xp = COALESCE(xp, 0) + v_xp_earned,
    updated_at = now()
  WHERE public.profiles.id = v_user_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated <> 1 THEN
    RAISE EXCEPTION 'Profile update failed: User profile not found.';
  END IF;

  SELECT xp INTO v_total_xp FROM public.profiles WHERE public.profiles.id = v_user_id;

  -- C. Upsert focus session daily aggregate using named constraint
  INSERT INTO public.focus_sessions (user_id, session_date, minutes, sessions_count)
  VALUES (v_user_id, p_session_date, p_minutes, 1)
  ON CONFLICT ON CONSTRAINT focus_sessions_user_id_session_date_key
  DO UPDATE SET
    minutes = public.focus_sessions.minutes + EXCLUDED.minutes,
    sessions_count = public.focus_sessions.sessions_count + 1
  RETURNING public.focus_sessions.id, public.focus_sessions.minutes, public.focus_sessions.sessions_count 
  INTO v_session_id, v_session_minutes, v_session_count;

  -- D. Calculate streak from updated focus session history
  SELECT r_streak, r_last_active_date 
  INTO v_calculated_streak, v_calculated_last_active
  FROM public.calculate_streak(v_user_id, p_today);

  -- E. Persist streak and last_active_date atomically
  UPDATE public.profiles
  SET streak = v_calculated_streak,
      last_active_date = v_calculated_last_active,
      updated_at = now()
  WHERE public.profiles.id = v_user_id;

  RETURN QUERY SELECT 
    v_session_id, 
    v_user_id, 
    p_session_date, 
    v_session_minutes, 
    v_session_count, 
    v_xp_earned, 
    v_total_xp,
    v_calculated_streak,
    v_calculated_last_active;
END;
$$;

-- Revoke default public execution privileges
REVOKE ALL ON FUNCTION public.log_focus_session(DATE, INTEGER, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_focus_session(DATE, INTEGER, TEXT, DATE) TO authenticated;
