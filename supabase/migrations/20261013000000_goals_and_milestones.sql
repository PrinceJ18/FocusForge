-- =============================================================================
-- PHASE 1: Goals & Milestones Database Foundation
-- =============================================================================
-- Created: 2026-10-13
-- Purpose: Create public.goals and public.goal_milestones tables with RLS,
--          task-linking uniqueness, and atomic XP RPCs.
--
-- Dependencies:
--   ✅ auth.users (FK target for user_id)
--   ✅ public.profiles (XP storage, used by private.award_xp_internal)
--   ✅ public.tasks (FK target for linked_task_id)
--   ✅ public.events (XP ledger, used by private.award_xp_internal)
--   ✅ private.award_xp_internal (server-authoritative XP function)
--   ✅ events_xp_idempotency_idx (duplicate-award prevention)
--
-- SAFE TO RUN: Uses IF NOT EXISTS for tables and indexes.
-- NON-DESTRUCTIVE: Does not drop or alter any existing objects.
-- =============================================================================

BEGIN;

-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 1: GOALS TABLE
-- ████████████████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'custom', 'long_term')),
  progress_method TEXT NOT NULL CHECK (progress_method IN ('milestone', 'manual')),
  manual_progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (manual_progress_pct BETWEEN 0 AND 100),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'delayed', 'abandoned')),
  is_strict BOOLEAN NOT NULL DEFAULT false,
  base_xp INTEGER NOT NULL DEFAULT 50,
  bonus_xp INTEGER NOT NULL DEFAULT 25,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 2: GOAL MILESTONES TABLE
-- ████████████████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal milestones"
  ON public.goal_milestones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal milestones"
  ON public.goal_milestones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal milestones"
  ON public.goal_milestones FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal milestones"
  ON public.goal_milestones FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 3: TASK-LINKING 1-TO-1 UNIQUENESS CONSTRAINT
-- ████████████████████████████████████████████████████████████████████████████

-- A task may be linked to at most one milestone across all goals.
-- NULL linked_task_id values are excluded, permitting unlimited standalone milestones.
CREATE UNIQUE INDEX IF NOT EXISTS goal_milestones_active_task_link_idx
  ON public.goal_milestones(linked_task_id)
  WHERE linked_task_id IS NOT NULL;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 4: PERFORMANCE INDEXES
-- ████████████████████████████████████████████████████████████████████████████

CREATE INDEX IF NOT EXISTS goals_user_id_idx
  ON public.goals(user_id);

CREATE INDEX IF NOT EXISTS goals_user_status_idx
  ON public.goals(user_id, status);

CREATE INDEX IF NOT EXISTS goal_milestones_goal_id_idx
  ON public.goal_milestones(goal_id);

CREATE INDEX IF NOT EXISTS goal_milestones_user_id_idx
  ON public.goal_milestones(user_id);

CREATE INDEX IF NOT EXISTS goal_milestones_linked_task_idx
  ON public.goal_milestones(linked_task_id)
  WHERE linked_task_id IS NOT NULL;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 5: RPC — complete_milestone
-- ████████████████████████████████████████████████████████████████████████████
--
-- Atomically marks a milestone as completed and awards XP.
-- Idempotent: re-completing returns already_completed with 0 XP.
-- XP reference_id: 'goal_milestone_<milestone_id>'

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

  -- 6. Award XP
  v_reference_id := 'goal_milestone_' || p_milestone_id::text;
  v_xp_earned := v_milestone.xp_reward;

  -- Defensive: check if XP was already awarded (e.g. partial transaction recovery)
  PERFORM 1 FROM public.events
  WHERE user_id = v_user_id AND type = 'milestone_completed' AND reference_id = v_reference_id AND metadata ? 'xp_earned';

  IF FOUND THEN
    v_xp_earned := 0;
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
  ELSE
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
-- SECTION 6: RPC — uncomplete_milestone
-- ████████████████████████████████████████████████████████████████████████████
--
-- Reopens a completed milestone WITHOUT deducting XP.
-- Already-earned XP is non-deductible per product rules.
-- Re-completing later will be idempotent (XP event already exists).

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

  -- 3. Reset completion state (XP remains untouched)
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
-- SECTION 7: RPC — complete_goal
-- ████████████████████████████████████████████████████████████████████████████
--
-- Atomically marks a goal as completed and awards XP.
-- Awards base_xp always, plus bonus_xp if deadline is not passed (or not strict).
-- Two separate idempotent XP entries:
--   Base:  reference_id = 'goal_completion_<goal_id>'
--   Bonus: reference_id = 'goal_early_bonus_<goal_id>'

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

  -- 5. Mark as completed
  v_completed_at := now();
  UPDATE public.goals
  SET status = 'completed', completed_at = v_completed_at, updated_at = now()
  WHERE id = p_goal_id;

  -- 6. Determine bonus eligibility
  -- Bonus is awarded if:
  --   a) Goal is not strict (is_strict = false), OR
  --   b) Goal has no deadline (deadline IS NULL), OR
  --   c) Current date is on or before the deadline
  v_bonus_eligible := (
    v_goal.is_strict = false
    OR v_goal.deadline IS NULL
    OR CURRENT_DATE <= v_goal.deadline
  );

  -- 7. Award base XP (idempotent)
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

  -- 8. Award bonus XP if eligible (separate idempotent entry)
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
-- END OF MIGRATION
-- =============================================================================
-- After applying this migration, verify:
--   ✅ SELECT * FROM public.goals LIMIT 0;
--   ✅ SELECT * FROM public.goal_milestones LIMIT 0;
--   ✅ SELECT proname FROM pg_proc WHERE proname IN ('complete_milestone', 'uncomplete_milestone', 'complete_goal');
--   ✅ SELECT indexname FROM pg_indexes WHERE tablename IN ('goals', 'goal_milestones');
--   ✅ SELECT policyname FROM pg_policies WHERE tablename IN ('goals', 'goal_milestones');
-- =============================================================================
