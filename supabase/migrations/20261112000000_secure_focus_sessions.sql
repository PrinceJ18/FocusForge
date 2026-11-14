-- =============================================================================
-- Migration: 20261112000000_secure_focus_sessions.sql
-- Phase 3 / Step 3B — Focus Sessions Hardening
-- 
-- Purpose:
--   Prevent authenticated and anonymous clients from directly writing to
--   public.focus_sessions. All writes must flow through the SECURITY DEFINER
--   RPC log_focus_session(). Additionally harden the search_path of all
--   three focus-session RPCs and re-affirm their EXECUTE grants.
--
-- Safety:
--   - Does NOT modify existing focus_session records or XP balances.
--   - Does NOT enable FORCE ROW LEVEL SECURITY.
--   - Does NOT revoke service_role privileges.
--   - Does NOT change unrelated tables, functions, policies, or grants.
--   - Does NOT rewrite RPC business logic (logic and behavior are identical).
--   - Preserves the SELECT policy and SELECT privilege for authenticated users.
--   - Revokes ALL privileges (including SELECT) from anon and PUBLIC.
--
-- Live schema reconciliation (2026-11-12):
--   - Policy names confirmed as "own sessions" (not "own focus sessions").
--   - Live columns: id, user_id, session_date (text), minutes, sessions_count.
--   - created_at column does NOT exist in live database — removed from all
--     column-level REVOKE statements.
--   - session_date is TEXT in live DB, DATE in RPC signatures.
--     Explicit casts added for data-type compatibility (2026-11-13):
--       * to_char(date, 'YYYY-MM-DD') for DATE→TEXT comparisons (preserves index)
--       * ::date cast for TEXT→DATE assignment (strict — rejects invalid dates)
--     These are data-type compatibility changes, not business logic changes.
--     The streak algorithm, XP calculation, event insertion, and upsert
--     behavior are identical to the source migrations.
--
-- Prerequisite:
--   V7 diagnostic (in review report) MUST be run before application to
--   confirm all stored session_date values are valid ISO 8601 dates.
--   If any invalid values exist, this migration MUST NOT be applied.
-- =============================================================================

BEGIN;

-- =========================================================================
-- A. DROP DIRECT-WRITE RLS POLICIES
-- =========================================================================
-- All writes to focus_sessions are performed by log_focus_session() which
-- runs as SECURITY DEFINER (postgres). These client-facing write policies
-- are unnecessary and expose the table to direct manipulation.

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.focus_sessions;

-- NOTE: "Users can view own sessions" is intentionally preserved.
-- The frontend relies on SELECT queries against focus_sessions for
-- Analytics, Reports, and store hydration (useStore.ts:82).

-- =========================================================================
-- B. REVOKE UNNECESSARY CLIENT PRIVILEGES
-- =========================================================================

-- B1. Table-level revocations
-- Revoke all write and administrative privileges from client-facing roles.
-- SELECT is preserved for authenticated only; revoked from anon and PUBLIC.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.focus_sessions FROM authenticated;

REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.focus_sessions FROM anon;

REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.focus_sessions FROM PUBLIC;

-- B2. Column-level revocations
-- Supabase default privileges may have granted column-level INSERT/UPDATE.
-- Explicitly revoke to prevent any residual column-level write access.
-- Live columns: id, user_id, session_date, minutes, sessions_count
-- (created_at does NOT exist in the live database)
REVOKE INSERT (id, user_id, session_date, minutes, sessions_count)
  ON public.focus_sessions FROM authenticated, anon, PUBLIC;

REVOKE UPDATE (id, user_id, session_date, minutes, sessions_count)
  ON public.focus_sessions FROM authenticated, anon, PUBLIC;

REVOKE REFERENCES (id, user_id, session_date, minutes, sessions_count)
  ON public.focus_sessions FROM authenticated, anon, PUBLIC;

-- B2b. Column-level SELECT revocations for anon and PUBLIC
-- Prevent any residual column-level SELECT grants from surviving the
-- table-level revocation. authenticated is excluded — they retain SELECT.
REVOKE SELECT (id, user_id, session_date, minutes, sessions_count)
  ON public.focus_sessions FROM anon, PUBLIC;

-- B3. Establish final privilege state
-- Only authenticated users may read focus_sessions. anon and PUBLIC have
-- had ALL privileges (including SELECT) explicitly revoked above.
GRANT SELECT ON public.focus_sessions TO authenticated;


-- =========================================================================
-- C. HARDEN RPC SEARCH PATHS
-- =========================================================================
-- All three focus-session RPCs currently use SET search_path = public.
-- This is vulnerable to search_path injection. Update to the hardened
-- search_path: pg_catalog, public, private.
--
-- Function bodies preserve identical business logic to the authoritative
-- source migrations. Changes from source are limited to:
--   1. SET search_path = pg_catalog, public, private (was: public)
--   2. Explicit date casts for session_date TEXT↔DATE compatibility:
--      - to_char(date, 'YYYY-MM-DD') for DATE→TEXT (comparisons, INSERT)
--      - ::date for TEXT→DATE (MAX result assignment)
--   These do not alter streak calculation, XP awards, or upsert behavior.

-- -------------------------------------------------------------------------
-- C1. log_focus_session(DATE, INTEGER, TEXT, DATE)
-- Source: 20260708180000_fix_events_index_and_constraint.sql:27-164
-- Changes: search_path hardened; explicit to_char() on INSERT into TEXT column
-- -------------------------------------------------------------------------
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
SET search_path = pg_catalog, public, private
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
  -- Explicit to_char() ensures ISO 8601 format regardless of DateStyle setting,
  -- since the live session_date column is TEXT (not DATE).
  INSERT INTO public.focus_sessions (user_id, session_date, minutes, sessions_count)
  VALUES (v_user_id, to_char(p_session_date, 'YYYY-MM-DD'), p_minutes, 1)
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

-- Ensure postgres ownership
ALTER FUNCTION public.log_focus_session(DATE, INTEGER, TEXT, DATE) OWNER TO postgres;

-- -------------------------------------------------------------------------
-- C2. calculate_streak(UUID, DATE)
-- Source: 20260707120000_streak_calculation_repair.sql:4-60
-- Changes: search_path hardened; explicit ::date and to_char() for TEXT column
-- -------------------------------------------------------------------------
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
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE;
  v_max_date DATE;
BEGIN
  -- Get the most recent focus session date for the user
  -- session_date is TEXT in live DB. ::date cast is used (not to_date()) because
  -- PostgreSQL's date input parser is strict: it rejects impossible dates like
  -- '2026-02-30', whereas to_date() would silently wrap to '2026-03-02'.
  -- Lexicographic MAX on ISO 8601 text equals chronological MAX.
  -- PREREQUISITE: V7 diagnostic must confirm all stored values are valid dates.
  SELECT MAX(session_date)::date INTO v_max_date
  FROM public.focus_sessions
  WHERE user_id = p_user_id;

  -- Determine starting point for checking consecutive calendar days
  -- to_char() converts DATE parameters to TEXT for comparison against the TEXT column.
  -- This preserves index usage on session_date and guarantees ISO format.
  IF EXISTS (
    SELECT 1 FROM public.focus_sessions 
    WHERE user_id = p_user_id AND session_date = to_char(p_today, 'YYYY-MM-DD')
  ) THEN
    v_check_date := p_today;
  ELSIF EXISTS (
    SELECT 1 FROM public.focus_sessions 
    WHERE user_id = p_user_id AND session_date = to_char(p_today - 1, 'YYYY-MM-DD')
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
        WHERE user_id = p_user_id AND session_date = to_char(v_check_date, 'YYYY-MM-DD')
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

-- Ensure postgres ownership
ALTER FUNCTION public.calculate_streak(UUID, DATE) OWNER TO postgres;

-- -------------------------------------------------------------------------
-- C3. get_current_streak(DATE)
-- Source: 20260707120000_streak_calculation_repair.sql:219-275
-- Changes: search_path hardened (no direct session_date references in body)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_streak(
  p_today DATE
)
RETURNS TABLE (
  current_streak INTEGER,
  last_active_date TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
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

-- Ensure postgres ownership
ALTER FUNCTION public.get_current_streak(DATE) OWNER TO postgres;


-- =========================================================================
-- D. RE-AFFIRM EXECUTE GRANTS
-- =========================================================================
-- CREATE OR REPLACE preserves existing grants, but we re-affirm them
-- explicitly for defense-in-depth and auditability.

-- D1. log_focus_session: callable by authenticated users only
REVOKE ALL ON FUNCTION public.log_focus_session(DATE, INTEGER, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_focus_session(DATE, INTEGER, TEXT, DATE) TO authenticated;

-- D2. calculate_streak: internal helper, not callable by any client role
REVOKE ALL ON FUNCTION public.calculate_streak(UUID, DATE) FROM PUBLIC, anon, authenticated;

-- D3. get_current_streak: callable by authenticated users only
REVOKE ALL ON FUNCTION public.get_current_streak(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_streak(DATE) TO authenticated;


-- =========================================================================
-- E. RELOAD POSTGREST SCHEMA CACHE
-- =========================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;

