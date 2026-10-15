-- =============================================================================
-- PHASE 1 CORRECTIVE: Goals & Milestones Security Hardening
-- =============================================================================
-- Created: 2026-10-13
-- Depends on: 20261013000000_goals_and_milestones.sql
-- Purpose: Address verified defects and hardening findings from the
--          Phase 1 corrective audit.
--
-- Changes:
--   1. BEFORE INSERT/UPDATE trigger enforcing goal-ownership and task-ownership
--   2. Task-link uniqueness scoped to active (completed=false) milestones
--   3. Column-level INSERT + UPDATE privilege restrictions on goals and goal_milestones
--   4. Progress validation in complete_goal (milestone + manual)
--   5. Non-negative XP and deadline >= start_date constraints (idempotent)
--   6. Zero-XP guard before award_xp_internal calls
--
-- SAFE TO RUN: Uses IF NOT EXISTS, IF EXISTS, CREATE OR REPLACE.
-- NON-DESTRUCTIVE: Does not drop data, columns, or tables.
-- =============================================================================

BEGIN;

-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 1: CROSS-TABLE OWNERSHIP ENFORCEMENT TRIGGER (A.1 + A.2)
-- ████████████████████████████████████████████████████████████████████████████
--
-- Prevents:
--   - Inserting a milestone under another user's goal
--   - Linking a milestone to another user's task
-- Fires on INSERT and UPDATE to catch both creation and editing.

CREATE OR REPLACE FUNCTION private.enforce_milestone_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_goal_user_id UUID;
BEGIN
  -- 1. Verify milestone user_id matches parent goal's user_id
  SELECT user_id INTO v_goal_user_id
  FROM public.goals
  WHERE id = NEW.goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found: %', NEW.goal_id;
  END IF;

  IF v_goal_user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Milestone user_id must match goal owner';
  END IF;

  -- 2. Verify linked task belongs to the same user (if set)
  IF NEW.linked_task_id IS NOT NULL THEN
    PERFORM 1 FROM public.tasks
    WHERE id = NEW.linked_task_id AND user_id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked task must belong to the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION private.enforce_milestone_ownership() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_enforce_milestone_ownership ON public.goal_milestones;
CREATE TRIGGER trg_enforce_milestone_ownership
  BEFORE INSERT OR UPDATE ON public.goal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_milestone_ownership();


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 2: TASK-LINK UNIQUENESS SCOPED TO ACTIVE MILESTONES (B.1)
-- ████████████████████████████████████████████████████████████████████████████
--
-- Original index prevented ANY two milestones from linking the same task.
-- Corrected: only ACTIVE (completed=false) milestones are constrained.
-- Completed milestones release their task link for reuse.

DROP INDEX IF EXISTS public.goal_milestones_active_task_link_idx;

CREATE UNIQUE INDEX goal_milestones_active_task_link_idx
  ON public.goal_milestones(linked_task_id)
  WHERE linked_task_id IS NOT NULL AND completed = false;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 3: COLUMN-LEVEL INSERT + UPDATE PRIVILEGE RESTRICTIONS (C.1 + S1)
-- ████████████████████████████████████████████████████████████████████████████
--
-- Prevents authenticated clients from directly setting or modifying:
--   Goals INSERT:  status, completed_at, base_xp, bonus_xp (use server defaults)
--   Goals UPDATE:  status, completed_at, base_xp, bonus_xp
--   Milestones INSERT:  completed, completed_at, xp_reward (use server defaults)
--   Milestones UPDATE:  completed, completed_at, xp_reward
--
-- These fields can only be set/modified by SECURITY DEFINER RPCs (running as
-- postgres). Legitimate creation and editing of title, description, deadline,
-- etc. remains permitted.
--
-- This is the first use of column-level grants in the project, introduced
-- because XP configuration fields are directly exploitable (XP → Level).
-- Without INSERT restrictions, a client could INSERT a goal with
-- base_xp=9999 and immediately call complete_goal to claim inflated XP.

-- 3a. Goals: revoke blanket INSERT, grant specific safe columns
--     Protected columns default to safe values:
--       status → 'in_progress', base_xp → 50, bonus_xp → 25,
--       completed_at → NULL, id/created_at/updated_at → server-generated
REVOKE INSERT ON public.goals FROM authenticated;
GRANT INSERT (
  user_id,
  title,
  description,
  period,
  progress_method,
  manual_progress_pct,
  start_date,
  deadline,
  is_strict
) ON public.goals TO authenticated;

-- 3b. Goals: revoke blanket UPDATE, grant specific safe columns
REVOKE UPDATE ON public.goals FROM authenticated;
GRANT UPDATE (
  title,
  description,
  period,
  progress_method,
  manual_progress_pct,
  start_date,
  deadline,
  is_strict,
  updated_at
) ON public.goals TO authenticated;

-- 3c. Goal milestones: revoke blanket INSERT, grant specific safe columns
--     Protected columns default to safe values:
--       completed → false, xp_reward → 10, completed_at → NULL,
--       id/created_at/updated_at → server-generated
REVOKE INSERT ON public.goal_milestones FROM authenticated;
GRANT INSERT (
  goal_id,
  user_id,
  title,
  sort_order,
  linked_task_id
) ON public.goal_milestones TO authenticated;

-- 3d. Goal milestones: revoke blanket UPDATE, grant specific safe columns
REVOKE UPDATE ON public.goal_milestones FROM authenticated;
GRANT UPDATE (
  title,
  sort_order,
  linked_task_id,
  updated_at
) ON public.goal_milestones TO authenticated;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 4: SCHEMA CONSTRAINTS (G.1, G.2) — Idempotent
-- ████████████████████████████████████████████████████████████████████████████
--
-- Uses DO $$ IF NOT EXISTS guards following the convention established in
-- 20260729000000_friends_bootstrap.sql (L92-105).

DO $$
BEGIN
  -- 4a. Non-negative XP constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_base_xp_non_negative') THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_base_xp_non_negative CHECK (base_xp >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_bonus_xp_non_negative') THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_bonus_xp_non_negative CHECK (bonus_xp >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goal_milestones_xp_reward_non_negative') THEN
    ALTER TABLE public.goal_milestones
      ADD CONSTRAINT goal_milestones_xp_reward_non_negative CHECK (xp_reward >= 0);
  END IF;

  -- 4b. Deadline must be on or after start_date
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_deadline_after_start') THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_deadline_after_start CHECK (deadline IS NULL OR deadline >= start_date);
  END IF;
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 5: CORRECTED complete_milestone RPC
-- ████████████████████████████████████████████████████████████████████████████
--
-- Changes from original:
--   - Adds xp_reward > 0 guard before calling award_xp_internal
--     (award_xp_internal requires p_xp_amount > 0; xp_reward=0 must be handled)

CREATE OR REPLACE FUNCTION public.complete_milestone(
  p_milestone_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id UUID;
  v_milestone RECORD;
  v_goal RECORD;
  v_total_xp INTEGER;
  v_xp_earned INTEGER;
  v_reference_id TEXT;
  v_completed_at TIMESTAMPTZ;
BEGIN
  -- 1. Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_milestone_id IS NULL THEN
    RAISE EXCEPTION 'Milestone ID cannot be null';
  END IF;

  -- 2. Lock milestone row
  SELECT * INTO v_milestone
  FROM public.goal_milestones
  WHERE id = p_milestone_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found or not owned by user';
  END IF;

  -- 3. Verify parent goal is actionable
  SELECT * INTO v_goal
  FROM public.goals
  WHERE id = v_milestone.goal_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent goal not found or not owned by user';
  END IF;

  IF v_goal.status NOT IN ('in_progress', 'delayed') THEN
    RAISE EXCEPTION 'Cannot complete milestone: parent goal status is "%"', v_goal.status;
  END IF;

  -- 4. Idempotency check
  IF v_milestone.completed THEN
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
    RETURN jsonb_build_object(
      'milestone_id', p_milestone_id,
      'goal_id', v_milestone.goal_id,
      'completed', true,
      'completed_at', v_milestone.completed_at,
      'xp_earned', 0,
      'total_xp', v_total_xp,
      'already_completed', true
    );
  END IF;

  -- 5. Mark as completed
  v_completed_at := now();
  UPDATE public.goal_milestones
  SET completed = true, completed_at = v_completed_at, updated_at = now()
  WHERE id = p_milestone_id;

  -- 6. Award XP (only if xp_reward > 0)
  v_reference_id := 'goal_milestone_' || p_milestone_id::text;
  v_xp_earned := 0;

  IF v_milestone.xp_reward > 0 THEN
    -- Defensive: check if XP was already awarded
    PERFORM 1 FROM public.events
    WHERE user_id = v_user_id AND type = 'milestone_completed' AND reference_id = v_reference_id AND metadata ? 'xp_earned';

    IF FOUND THEN
      SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
    ELSE
      v_xp_earned := v_milestone.xp_reward;
      v_total_xp := private.award_xp_internal(
        v_user_id,
        v_xp_earned,
        'milestone_completed',
        'goals',
        v_reference_id,
        jsonb_build_object(
          'milestone_id', p_milestone_id,
          'milestone_title', v_milestone.title,
          'goal_id', v_milestone.goal_id,
          'goal_title', v_goal.title
        )
      );
    END IF;
  END IF;

  -- Fetch XP if not yet set (zero-reward path)
  IF v_total_xp IS NULL THEN
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
  END IF;

  -- 7. Update parent goal's updated_at to signal change
  UPDATE public.goals
  SET updated_at = now()
  WHERE id = v_milestone.goal_id;

  RETURN jsonb_build_object(
    'milestone_id', p_milestone_id,
    'goal_id', v_milestone.goal_id,
    'completed', true,
    'completed_at', v_completed_at,
    'xp_earned', v_xp_earned,
    'total_xp', v_total_xp,
    'already_completed', false
  );
END;
$$;

ALTER FUNCTION public.complete_milestone(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.complete_milestone(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_milestone(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_milestone(UUID) TO authenticated;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 6: CORRECTED uncomplete_milestone RPC
-- ████████████████████████████████████████████████████████████████████████████
--
-- No logic changes from original. Re-declared for completeness and to
-- ensure the function definition is up-to-date after any search_path or
-- ownership changes.

CREATE OR REPLACE FUNCTION public.uncomplete_milestone(
  p_milestone_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id UUID;
  v_milestone RECORD;
  v_was_completed BOOLEAN;
BEGIN
  -- 1. Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_milestone_id IS NULL THEN
    RAISE EXCEPTION 'Milestone ID cannot be null';
  END IF;

  -- 2. Lock milestone row
  SELECT * INTO v_milestone
  FROM public.goal_milestones
  WHERE id = p_milestone_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found or not owned by user';
  END IF;

  v_was_completed := v_milestone.completed;

  -- 3. Reset completion state (XP remains untouched — non-deductible)
  IF v_was_completed THEN
    UPDATE public.goal_milestones
    SET completed = false, completed_at = NULL, updated_at = now()
    WHERE id = p_milestone_id;

    -- Update parent goal's updated_at
    UPDATE public.goals
    SET updated_at = now()
    WHERE id = v_milestone.goal_id;
  END IF;

  RETURN jsonb_build_object(
    'milestone_id', p_milestone_id,
    'goal_id', v_milestone.goal_id,
    'completed', false,
    'was_completed', v_was_completed
  );
END;
$$;

ALTER FUNCTION public.uncomplete_milestone(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.uncomplete_milestone(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uncomplete_milestone(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.uncomplete_milestone(UUID) TO authenticated;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 7: CORRECTED complete_goal RPC (D.1 + G.1 zero-xp guard)
-- ████████████████████████████████████████████████████████████████████████████
--
-- Changes from original:
--   1. Validates progress before allowing completion:
--      - milestone-based: all milestones must be completed
--        (empty milestone-based goals ARE completable per UD-2)
--      - manual: manual_progress_pct must be 100
--   2. Guards base_xp > 0 and bonus_xp > 0 before calling award_xp_internal

CREATE OR REPLACE FUNCTION public.complete_goal(
  p_goal_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id UUID;
  v_goal RECORD;
  v_total_xp INTEGER;
  v_base_xp_earned INTEGER := 0;
  v_bonus_xp_earned INTEGER := 0;
  v_bonus_eligible BOOLEAN;
  v_base_ref TEXT;
  v_bonus_ref TEXT;
  v_completed_at TIMESTAMPTZ;
  v_incomplete_count INTEGER;
BEGIN
  -- 1. Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_goal_id IS NULL THEN
    RAISE EXCEPTION 'Goal ID cannot be null';
  END IF;

  -- 2. Lock goal row
  SELECT * INTO v_goal
  FROM public.goals
  WHERE id = p_goal_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found or not owned by user';
  END IF;

  -- 3. Check if already completed
  IF v_goal.status = 'completed' THEN
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
    RETURN jsonb_build_object(
      'goal_id', p_goal_id,
      'status', 'completed',
      'completed_at', v_goal.completed_at,
      'base_xp_earned', 0,
      'bonus_xp_earned', 0,
      'total_xp', v_total_xp,
      'already_completed', true
    );
  END IF;

  -- 4. Only in_progress or delayed goals can be completed
  IF v_goal.status NOT IN ('in_progress', 'delayed') THEN
    RAISE EXCEPTION 'Cannot complete goal: status is "%"', v_goal.status;
  END IF;

  -- 5. PROGRESS VALIDATION (D.1 corrective)
  IF v_goal.progress_method = 'milestone' THEN
    -- All milestones must be completed (empty goals pass per UD-2)
    SELECT COUNT(*) INTO v_incomplete_count
    FROM public.goal_milestones
    WHERE goal_id = p_goal_id AND completed = false;

    IF v_incomplete_count > 0 THEN
      RAISE EXCEPTION 'Cannot complete goal: % incomplete milestone(s) remain', v_incomplete_count;
    END IF;
  ELSIF v_goal.progress_method = 'manual' THEN
    IF v_goal.manual_progress_pct < 100 THEN
      RAISE EXCEPTION 'Cannot complete goal: manual progress is %, expected 100', v_goal.manual_progress_pct;
    END IF;
  END IF;

  -- 6. Mark as completed
  v_completed_at := now();
  UPDATE public.goals
  SET status = 'completed', completed_at = v_completed_at, updated_at = now()
  WHERE id = p_goal_id;

  -- 7. Determine bonus eligibility
  v_bonus_eligible := (
    v_goal.is_strict = false
    OR v_goal.deadline IS NULL
    OR CURRENT_DATE <= v_goal.deadline
  );

  -- 8. Award base XP (idempotent, only if base_xp > 0)
  IF v_goal.base_xp > 0 THEN
    v_base_ref := 'goal_completion_' || p_goal_id::text;

    PERFORM 1 FROM public.events
    WHERE user_id = v_user_id AND type = 'goal_completed' AND reference_id = v_base_ref AND metadata ? 'xp_earned';

    IF FOUND THEN
      v_base_xp_earned := 0;
      SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
    ELSE
      v_base_xp_earned := v_goal.base_xp;
      v_total_xp := private.award_xp_internal(
        v_user_id,
        v_base_xp_earned,
        'goal_completed',
        'goals',
        v_base_ref,
        jsonb_build_object(
          'goal_id', p_goal_id,
          'goal_title', v_goal.title,
          'period', v_goal.period,
          'is_strict', v_goal.is_strict,
          'reward_type', 'base'
        )
      );
    END IF;
  END IF;

  -- 9. Award bonus XP if eligible (separate idempotent entry, only if bonus_xp > 0)
  IF v_bonus_eligible AND v_goal.bonus_xp > 0 THEN
    v_bonus_ref := 'goal_early_bonus_' || p_goal_id::text;

    PERFORM 1 FROM public.events
    WHERE user_id = v_user_id AND type = 'goal_completed' AND reference_id = v_bonus_ref AND metadata ? 'xp_earned';

    IF NOT FOUND THEN
      v_bonus_xp_earned := v_goal.bonus_xp;
      v_total_xp := private.award_xp_internal(
        v_user_id,
        v_bonus_xp_earned,
        'goal_completed',
        'goals',
        v_bonus_ref,
        jsonb_build_object(
          'goal_id', p_goal_id,
          'goal_title', v_goal.title,
          'period', v_goal.period,
          'is_strict', v_goal.is_strict,
          'reward_type', 'early_bonus',
          'deadline', v_goal.deadline,
          'completed_date', CURRENT_DATE
        )
      );
    END IF;
  END IF;

  -- Fetch final authoritative XP if neither branch set it
  IF v_total_xp IS NULL THEN
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'goal_id', p_goal_id,
    'status', 'completed',
    'completed_at', v_completed_at,
    'base_xp_earned', v_base_xp_earned,
    'bonus_xp_earned', v_bonus_xp_earned,
    'bonus_eligible', v_bonus_eligible,
    'total_xp', v_total_xp,
    'already_completed', false
  );
END;
$$;

ALTER FUNCTION public.complete_goal(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.complete_goal(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_goal(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_goal(UUID) TO authenticated;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 8: RELOAD POSTGREST SCHEMA CACHE
-- ████████████████████████████████████████████████████████████████████████████

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- END OF CORRECTIVE MIGRATION
-- =============================================================================
-- Verify after applying:
--   ✅ Trigger:     SELECT tgname FROM pg_trigger WHERE tgname = 'trg_enforce_milestone_ownership';
--   ✅ Index:       SELECT indexdef FROM pg_indexes WHERE indexname = 'goal_milestones_active_task_link_idx';
--                   (should contain 'AND completed = false')
--   ✅ Constraints: SELECT conname FROM pg_constraint WHERE conrelid = 'public.goals'::regclass;
--                   (should include goals_base_xp_non_negative, goals_bonus_xp_non_negative, goals_deadline_after_start)
--   ✅ Privileges:  SELECT privilege_type, column_name FROM information_schema.column_privileges
--                   WHERE table_name = 'goals' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';
--   ✅ Functions:   SELECT proname FROM pg_proc WHERE proname IN ('complete_milestone', 'uncomplete_milestone', 'complete_goal');
-- =============================================================================
