-- Phase 5.3: Streak Calculation Repair, Centralization, and Database Authority

-- 1. Create a helper function to compute streak and last active date from focus sessions history
CREATE OR REPLACE FUNCTION public.calculate_streak(
  p_user_id UUID,
  p_today DATE
)
RETURNS TABLE (
  r_streak INTEGER,
  r_last_active_date TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE;
  v_max_date DATE;
BEGIN
  -- Get the most recent focus session date for the user
  SELECT MAX(session_date) INTO v_max_date
  FROM public.focus_sessions
  WHERE user_id = p_user_id;

  -- Determine starting point for checking consecutive calendar days
  IF EXISTS (
    SELECT 1 FROM public.focus_sessions 
    WHERE user_id = p_user_id AND session_date = p_today
  ) THEN
    v_check_date := p_today;
  ELSIF EXISTS (
    SELECT 1 FROM public.focus_sessions 
    WHERE user_id = p_user_id AND session_date = p_today - 1
  ) THEN
    v_check_date := p_today - 1;
  ELSE
    v_check_date := NULL;
  END IF;

  -- Loop backwards to count consecutive active calendar days
  IF v_check_date IS NOT NULL THEN
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.focus_sessions 
        WHERE user_id = p_user_id AND session_date = v_check_date
      ) THEN
        v_streak := v_streak + 1;
        v_check_date := v_check_date - 1;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END IF;

  r_streak := v_streak;
  r_last_active_date := COALESCE(to_char(v_max_date, 'YYYY-MM-DD'), '');
  RETURN NEXT;
END;
$$;

-- Secure helper: explicitly revoke execution from public, anon, and authenticated roles
REVOKE ALL ON FUNCTION public.calculate_streak(UUID, DATE) FROM PUBLIC, anon, authenticated;


-- 2. Drop and recreate the log_focus_session function with updated 4-argument signature
DROP FUNCTION IF EXISTS public.log_focus_session(DATE, INTEGER, TEXT);
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
  -- p_minutes limits (1 to 120 minutes)
  IF p_minutes IS NULL OR p_minutes < 1 OR p_minutes > 120 THEN
    RAISE EXCEPTION 'Invalid minutes: % must be between 1 and 120.', p_minutes;
  END IF;

  -- Validate p_session_date limits (allow +/- 1 day tolerance range relative to server date)
  IF p_session_date IS NULL OR p_session_date < CURRENT_DATE - INTERVAL '1 day' OR p_session_date > CURRENT_DATE + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'Invalid session date: % is outside the timezone tolerance range of +/- 1 day.', p_session_date;
  END IF;

  -- Validate p_today limits (allow +/- 2 days tolerance range relative to server date)
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

  -- A. Insert completion event to ensure idempotency (will trigger duplicate exception on conflict)
  INSERT INTO public.events (user_id, type, category, reference_id, metadata, timestamp)
  VALUES (
    v_user_id, 
    'focus_session_completed', 
    'focus', 
    v_reference_id, 
    jsonb_build_object('minutes', p_minutes, 'xp_earned', v_xp_earned), 
    now()
  );

  -- B. Award XP atomically to the user's profile and check row update status
  UPDATE public.profiles
  SET 
    xp = COALESCE(xp, 0) + v_xp_earned,
    updated_at = now()
  WHERE public.profiles.id = v_user_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated <> 1 THEN
    RAISE EXCEPTION 'Profile update failed: User profile not found.';
  END IF;

  -- Get resulting total XP
  SELECT xp INTO v_total_xp FROM public.profiles WHERE public.profiles.id = v_user_id;

  -- C. Upsert focus session daily aggregate row atomically
  INSERT INTO public.focus_sessions (user_id, session_date, minutes, sessions_count)
  VALUES (v_user_id, p_session_date, p_minutes, 1)
  ON CONFLICT (user_id, session_date)
  DO UPDATE SET
    minutes = public.focus_sessions.minutes + EXCLUDED.minutes,
    sessions_count = public.focus_sessions.sessions_count + 1
  RETURNING public.focus_sessions.id, public.focus_sessions.minutes, public.focus_sessions.sessions_count 
  INTO v_session_id, v_session_minutes, v_session_count;

  -- D. Calculate new streak & last active date from updated focus session history using local current date
  SELECT r_streak, r_last_active_date 
  INTO v_calculated_streak, v_calculated_last_active
  FROM public.calculate_streak(v_user_id, p_today);

  -- E. Update profiles.streak and profiles.last_active_date atomically
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

-- Revoke default public execution privileges to enforce auth role execution
REVOKE ALL ON FUNCTION public.log_focus_session(DATE, INTEGER, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_focus_session(DATE, INTEGER, TEXT, DATE) TO authenticated;


-- 3. Create the get_current_streak RPC function for startup/refresh checks
CREATE OR REPLACE FUNCTION public.get_current_streak(
  p_today DATE
)
RETURNS TABLE (
  current_streak INTEGER,
  last_active_date TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_calculated_streak INTEGER;
  v_calculated_last_active TEXT;
  v_stored_streak INTEGER;
  v_stored_last_active TEXT;
BEGIN
  -- Authenticate user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate current date tolerance (allow +/- 2 days)
  IF p_today IS NULL OR p_today < CURRENT_DATE - INTERVAL '2 days' OR p_today > CURRENT_DATE + INTERVAL '2 days' THEN
    RAISE EXCEPTION 'Invalid current date: % is outside the timezone tolerance range.', p_today;
  END IF;

  -- Get stored profile streak info
  SELECT streak, last_active_date INTO v_stored_streak, v_stored_last_active
  FROM public.profiles
  WHERE id = v_user_id;

  -- Enforce profile existence check
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', v_user_id;
  END IF;

  -- Calculate fresh streak info
  SELECT r_streak, r_last_active_date 
  INTO v_calculated_streak, v_calculated_last_active
  FROM public.calculate_streak(v_user_id, p_today);

  -- Synchronize profile table if values are stale
  IF v_stored_streak IS DISTINCT FROM v_calculated_streak 
     OR v_stored_last_active IS DISTINCT FROM v_calculated_last_active THEN
    UPDATE public.profiles
    SET streak = v_calculated_streak,
        last_active_date = v_calculated_last_active,
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  RETURN QUERY SELECT v_calculated_streak, v_calculated_last_active;
END;
$$;

-- Revoke public execution privileges
REVOKE ALL ON FUNCTION public.get_current_streak(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_streak(DATE) TO authenticated;


-- 4. Backfill/Repair data block (Provisional backfill relative to server CURRENT_DATE)
DO $$
DECLARE
  v_rec RECORD;
  v_streak INTEGER;
  v_last_active TEXT;
BEGIN
  FOR v_rec IN SELECT id FROM public.profiles LOOP
    -- Compute provisional values based on CURRENT_DATE for the server
    SELECT r_streak, r_last_active_date 
    INTO v_streak, v_last_active
    FROM public.calculate_streak(v_rec.id, CURRENT_DATE);

    -- Perform repair update
    UPDATE public.profiles
    SET streak = v_streak,
        last_active_date = v_last_active
    WHERE id = v_rec.id;
  END LOOP;
END $$;
