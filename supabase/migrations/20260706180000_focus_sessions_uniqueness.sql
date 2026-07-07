-- 1. Identify and consolidate only duplicate groups in focus_sessions table
WITH duplicates AS (
  SELECT 
    user_id,
    session_date,
    MIN(id) as keep_id,
    SUM(COALESCE(minutes, 0)) as total_minutes,
    SUM(COALESCE(sessions_count, 1)) as total_count
  FROM focus_sessions
  GROUP BY user_id, session_date
  HAVING COUNT(*) > 1
)
UPDATE focus_sessions f
SET 
  minutes = d.total_minutes,
  sessions_count = d.total_count
FROM duplicates d
WHERE f.id = d.keep_id;

-- 2. Delete only the redundant rows from confirmed duplicate groups
DELETE FROM focus_sessions
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, session_date ORDER BY id) as rn
    FROM focus_sessions
  ) t
  WHERE rn > 1
);

-- 3. Idempotently add UNIQUE constraint to public.focus_sessions

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t
      ON t.oid = c.conrelid
    JOIN pg_namespace n
      ON n.oid = t.relnamespace
    WHERE c.conname = 'focus_sessions_user_id_session_date_key'
      AND c.contype = 'u'
      AND n.nspname = 'public'
      AND t.relname = 'focus_sessions'
  ) THEN
    ALTER TABLE public.focus_sessions
      ADD CONSTRAINT focus_sessions_user_id_session_date_key
      UNIQUE (user_id, session_date);
  END IF;
END $$;

-- 4. Check for duplicate reference_ids in events to prevent silent data loss, before creating unique index
DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_duplicate_count
  FROM (
    SELECT user_id, reference_id
    FROM events
    WHERE reference_id IS NOT NULL
    GROUP BY user_id, reference_id
    HAVING COUNT(*) > 1
  ) t;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: found % duplicate reference_id event groups in the database. Please resolve manually.', v_duplicate_count;
  END IF;
END $$;

-- 5. Create Partial Unique Index to events for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS events_user_reference_idx 
  ON events (user_id, reference_id) 
  WHERE reference_id IS NOT NULL;

-- 6. Create atomic, security-hardened RPC function to log focus sessions
CREATE OR REPLACE FUNCTION log_focus_session(
  p_session_date DATE,
  p_minutes INTEGER,
  p_reference_id TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  session_date DATE,
  minutes INTEGER,
  sessions_count INTEGER,
  xp_earned INTEGER,
  total_xp INTEGER
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

  -- p_session_date limits (allow CURRENT_DATE - 1 to CURRENT_DATE + 1 for local timezone shifts)
  IF p_session_date IS NULL OR p_session_date < CURRENT_DATE - INTERVAL '1 day' OR p_session_date > CURRENT_DATE + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'Invalid session date: % is outside the timezone tolerance range.', p_session_date;
  END IF;
IF p_reference_id IS NULL THEN
  RAISE EXCEPTION 'Reference ID cannot be null.';
END IF;

v_reference_id := trim(p_reference_id);

IF length(v_reference_id) = 0
   OR length(v_reference_id) > 100 THEN

  RAISE EXCEPTION
    'Invalid reference ID: must be non-empty and maximum 100 characters.';
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

  -- 1. Insert completion event to ensure idempotency (will trigger duplicate exception on conflict)
  INSERT INTO public.events (user_id, type, category, reference_id, metadata, timestamp)
  VALUES (
    v_user_id, 
    'focus_session_completed', 
    'focus', 
    v_reference_id, 
    jsonb_build_object('minutes', p_minutes, 'xp_earned', v_xp_earned), 
    now()
  );

  -- 2. Award XP atomically to the user's profile and check row update status
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

  -- 3. Upsert focus session daily aggregate row atomically
  INSERT INTO public.focus_sessions (user_id, session_date, minutes, sessions_count)
  VALUES (v_user_id, p_session_date, p_minutes, 1)
  ON CONFLICT (user_id, session_date)
  DO UPDATE SET
    minutes = public.focus_sessions.minutes + EXCLUDED.minutes,
    sessions_count = public.focus_sessions.sessions_count + 1
  RETURNING public.focus_sessions.id, public.focus_sessions.minutes, public.focus_sessions.sessions_count 
  INTO v_session_id, v_session_minutes, v_session_count;

  RETURN QUERY SELECT 
    v_session_id, 
    v_user_id, 
    p_session_date, 
    v_session_minutes, 
    v_session_count, 
    v_xp_earned, 
    v_total_xp;
END;
$$;

-- Revoke default public execution privileges to enforce auth role execution
REVOKE ALL ON FUNCTION log_focus_session(DATE, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_focus_session(DATE, INTEGER, TEXT) TO authenticated;
