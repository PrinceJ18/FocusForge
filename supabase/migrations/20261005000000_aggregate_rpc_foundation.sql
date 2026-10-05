-- =============================================================================
-- Phase 5.3: Server-Side Aggregate RPC Foundation
--
-- Creates three secure RPCs that compute lifetime aggregates server-side,
-- eliminating the future need to hydrate entire historical datasets into
-- the browser.
--
-- RPCs created:
--   1. get_lifetime_focus_stats  — total focus minutes & session count
--   2. get_lifetime_task_stats   — total completed task count
--   3. get_available_months      — distinct YYYY-MM periods with activity
--
-- Security model:
--   - All RPCs use SECURITY DEFINER with explicit search_path
--   - All RPCs authenticate via auth.uid() — no user_id parameter
--   - Execution restricted to 'authenticated' role only
--   - Follows existing project conventions (get_current_streak pattern)
-- =============================================================================


-- =============================================================================
-- RPC #1: get_lifetime_focus_stats
--
-- Returns the authenticated user's all-time focus aggregates.
-- Replaces the client-side calculation in:
--   - src/lib/statistics/focus.ts → calculateAllTimeFocusMinutes()
--   - src/lib/statistics/focus.ts → calculateAllTimeFocusSessions()
--   - src/lib/statsUtils.ts → getAllTimeFocusMinutes()
--   - src/lib/statsUtils.ts → getAllTimeFocusSessions()
--
-- Schema reference (from 20260525174459_create_spendwise_tables.sql):
--   focus_sessions.minutes    INTEGER NOT NULL DEFAULT 0
--   focus_sessions.sessions_count INTEGER DEFAULT 1
--   focus_sessions.user_id    UUID NOT NULL REFERENCES auth.users(id)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_lifetime_focus_stats()
RETURNS TABLE (
  total_minutes BIGINT,
  total_sessions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(fs.minutes)::BIGINT, 0) AS total_minutes,
    COALESCE(SUM(fs.sessions_count)::BIGINT, 0) AS total_sessions
  FROM public.focus_sessions fs
  WHERE fs.user_id = v_user_id;
END;
$$;

-- Restrict access: only authenticated users may call this RPC
REVOKE ALL ON FUNCTION public.get_lifetime_focus_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lifetime_focus_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lifetime_focus_stats() TO authenticated;


-- =============================================================================
-- RPC #2: get_lifetime_task_stats
--
-- Returns the authenticated user's all-time completed task count.
-- Matches the client-side calculation in:
--   - src/lib/statistics/tasks.ts → calculateCompletedTasks()
--   - src/lib/statsUtils.ts → getCompletedTasksCount()
--
-- Business logic (from existing code):
--   completedTasks = 
--     tasks.filter(t => (!t.recurrence_type || t.recurrence_type === 'none') 
--                       && t.status === 'completed').length
--     + taskCompletions.filter(c => c.status === 'completed').length
--
-- Schema references:
--   tasks.status             TEXT NOT NULL DEFAULT 'pending' 
--                            CHECK (status IN ('pending','completed','wont_do'))
--   tasks.recurrence_type    TEXT (nullable, 'none'|'daily'|'weekly'|etc.)
--   tasks.user_id            UUID NOT NULL
--   task_completions.status  TEXT NOT NULL DEFAULT 'completed'
--                            CHECK (status IN ('pending','completed','wont_do'))
--   task_completions.user_id UUID NOT NULL
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_lifetime_task_stats()
RETURNS TABLE (
  completed_tasks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
  v_non_recurring BIGINT;
  v_recurring BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Count non-recurring completed tasks
  -- Matches: tasks.filter(t => (!t.recurrence_type || t.recurrence_type === 'none')
  --                            && t.status === 'completed')
  SELECT COUNT(*)::BIGINT INTO v_non_recurring
  FROM public.tasks t
  WHERE t.user_id = v_user_id
    AND t.status = 'completed'
    AND (t.recurrence_type IS NULL OR t.recurrence_type = 'none');

  -- Count recurring task completions
  -- Matches: taskCompletions.filter(c => c.status === 'completed')
  SELECT COUNT(*)::BIGINT INTO v_recurring
  FROM public.task_completions tc
  WHERE tc.user_id = v_user_id
    AND tc.status = 'completed';

  completed_tasks := v_non_recurring + v_recurring;
  RETURN NEXT;
END;
$$;

-- Restrict access: only authenticated users may call this RPC
REVOKE ALL ON FUNCTION public.get_lifetime_task_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lifetime_task_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lifetime_task_stats() TO authenticated;


-- =============================================================================
-- RPC #3: get_available_months
--
-- Returns the distinct YYYY-MM periods that have user activity, ordered
-- newest first. Used by the Reports month selector.
--
-- Matches client-side logic in Reports.tsx (lines 63-92):
--   focusSessions → session_date.slice(0, 7)
--   expenses      → expense_date.slice(0, 7)
--   tasks         → completed_at.slice(0, 7), created_at.slice(0, 7)
--
-- Note: goalsHistory (useDailyGoalsStore) is localStorage-only, NOT 
-- backed by Supabase, so it is correctly excluded from this RPC.
--
-- Schema references:
--   focus_sessions.session_date  DATE NOT NULL
--   expenses.expense_date        DATE NOT NULL
--   tasks.completed_at           TIMESTAMPTZ (nullable)
--   tasks.created_at             TIMESTAMPTZ
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_available_months()
RETURNS TABLE (
  month TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT DISTINCT m.month_val AS month
  FROM (
    -- Focus sessions: extract YYYY-MM from session_date (DATE type)
    SELECT to_char(fs.session_date, 'YYYY-MM') AS month_val
    FROM public.focus_sessions fs
    WHERE fs.user_id = v_user_id

    UNION

    -- Expenses: extract YYYY-MM from expense_date (DATE type)
    SELECT to_char(e.expense_date, 'YYYY-MM') AS month_val
    FROM public.expenses e
    WHERE e.user_id = v_user_id

    UNION

    -- Tasks completed_at: extract YYYY-MM from completed_at (TIMESTAMPTZ)
    SELECT to_char(t.completed_at, 'YYYY-MM') AS month_val
    FROM public.tasks t
    WHERE t.user_id = v_user_id
      AND t.completed_at IS NOT NULL

    UNION

    -- Tasks created_at: extract YYYY-MM from created_at (TIMESTAMPTZ)
    SELECT to_char(t2.created_at, 'YYYY-MM') AS month_val
    FROM public.tasks t2
    WHERE t2.user_id = v_user_id
      AND t2.created_at IS NOT NULL
  ) m
  WHERE m.month_val IS NOT NULL
  ORDER BY month DESC;
END;
$$;

-- Restrict access: only authenticated users may call this RPC
REVOKE ALL ON FUNCTION public.get_available_months() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_available_months() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_available_months() TO authenticated;
