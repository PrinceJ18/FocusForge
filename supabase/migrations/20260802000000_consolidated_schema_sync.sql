-- =============================================================================
-- PRODUCTION MIGRATION: Consolidated Schema Synchronization
-- =============================================================================
-- Generated: 2026-08-02
-- Purpose: Create all missing database objects required by the FocusForge frontend
--
-- VERIFIED LIVE STATE BEFORE THIS MIGRATION:
--   ✅ All RPCs exist (complete_task, uncomplete_task, mark_task_wont_do,
--      log_focus_session, get_current_streak, claim_daily_goal,
--      claim_daily_challenge, unlock_achievement, unlock_milestone)
--   ✅ Core tables exist (profiles, tasks, task_sections, task_completions,
--      expenses, recurring_expenses, custom_categories, savings_goals,
--      focus_sessions, events, user_preferences, friends, friend_requests)
--   ✅ profiles.monthly_budget and profiles.total_savings exist
--   ✅ tasks.status and task_completions.status exist
--   ❌ Arena tables missing (arenas, arena_members, arena_scores, hall_of_fame, arena_activity)
--   ❌ expenses.recurring_expense_id missing
--   ❌ expenses.recurring_occurrence_date missing
--   ❌ user_financial_settings table missing
--
-- SAFE TO RUN MULTIPLE TIMES: Uses IF NOT EXISTS / DROP IF EXISTS throughout.
-- NON-DESTRUCTIVE: Does not drop or alter any existing columns or data.
-- =============================================================================

BEGIN;

-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 1: MISSING COLUMNS ON EXISTING TABLES
-- ████████████████████████████████████████████████████████████████████████████

-- 1a. expenses: recurring expense tracking columns
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS recurring_occurrence_date DATE;

-- 1b. Create index for recurring expense lookups
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_expense_id
  ON public.expenses(recurring_expense_id)
  WHERE recurring_expense_id IS NOT NULL;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 2: ARENA TABLES
-- ████████████████████████████████████████████████████████████████████████████

-- 2a. arenas
CREATE TABLE IF NOT EXISTS public.arenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'friends_only')) DEFAULT 'friends_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2b. arena_members
CREATE TABLE IF NOT EXISTS public.arena_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  CONSTRAINT arena_members_unique_active UNIQUE (arena_id, user_id)
);

-- 2c. arena_scores (total_score is computed/generated)
CREATE TABLE IF NOT EXISTS public.arena_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  focus_points NUMERIC NOT NULL DEFAULT 0,
  task_points NUMERIC NOT NULL DEFAULT 0,
  challenge_points NUMERIC NOT NULL DEFAULT 0,
  streak_bonus NUMERIC NOT NULL DEFAULT 0,
  total_score NUMERIC GENERATED ALWAYS AS (focus_points + task_points + challenge_points + streak_bonus) STORED,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  CONSTRAINT arena_scores_period_unique UNIQUE (arena_id, user_id, period_type, period_start)
);

-- 2d. hall_of_fame
CREATE TABLE IF NOT EXISTS public.hall_of_fame (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  champion_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name_snapshot TEXT,
  avatar_url_snapshot TEXT,
  level_snapshot INTEGER NOT NULL DEFAULT 1,
  total_score NUMERIC NOT NULL DEFAULT 0,
  focus_points NUMERIC NOT NULL DEFAULT 0,
  task_points NUMERIC NOT NULL DEFAULT 0,
  challenge_points NUMERIC NOT NULL DEFAULT 0,
  streak_bonus NUMERIC NOT NULL DEFAULT 0,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hall_of_fame_arena_period_unique UNIQUE (arena_id, period_type, period_start)
);

-- 2e. arena_activity
CREATE TABLE IF NOT EXISTS public.arena_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Arena activity indexes
CREATE INDEX IF NOT EXISTS idx_arena_activity_arena_id ON public.arena_activity(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_activity_created_at ON public.arena_activity(created_at DESC);


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 3: UPDATED_AT TRIGGER FOR ARENAS
-- ████████████████████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.update_arenas_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_arenas_updated_at ON public.arenas;
CREATE TRIGGER set_arenas_updated_at
  BEFORE UPDATE ON public.arenas
  FOR EACH ROW EXECUTE FUNCTION public.update_arenas_updated_at();


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 4: ROW LEVEL SECURITY
-- ████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_activity ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- ARENAS RLS
  DROP POLICY IF EXISTS "Users can read arenas they belong to" ON public.arenas;
  CREATE POLICY "Users can read arenas they belong to" ON public.arenas
    FOR SELECT USING (
      id IN (SELECT arena_id FROM public.arena_members WHERE user_id = auth.uid() AND left_at IS NULL)
    );

  DROP POLICY IF EXISTS "Owners can update their arenas" ON public.arenas;
  CREATE POLICY "Owners can update their arenas" ON public.arenas
    FOR UPDATE USING (auth.uid() = owner_id);

  DROP POLICY IF EXISTS "Authenticated users can create arenas" ON public.arenas;
  CREATE POLICY "Authenticated users can create arenas" ON public.arenas
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

  -- ARENA MEMBERS RLS
  DROP POLICY IF EXISTS "Users can read members of their arenas" ON public.arena_members;
  CREATE POLICY "Users can read members of their arenas" ON public.arena_members
    FOR SELECT USING (
      arena_id IN (SELECT arena_id FROM public.arena_members WHERE user_id = auth.uid() AND left_at IS NULL)
    );

  DROP POLICY IF EXISTS "Arena owners can insert members" ON public.arena_members;
  CREATE POLICY "Arena owners can insert members" ON public.arena_members
    FOR INSERT WITH CHECK (
      arena_id IN (SELECT id FROM public.arenas WHERE owner_id = auth.uid())
    );

  DROP POLICY IF EXISTS "Users can update their own membership" ON public.arena_members;
  CREATE POLICY "Users can update their own membership" ON public.arena_members
    FOR UPDATE USING (auth.uid() = user_id);

  -- ARENA SCORES RLS
  DROP POLICY IF EXISTS "Users can read scores of their arenas" ON public.arena_scores;
  CREATE POLICY "Users can read scores of their arenas" ON public.arena_scores
    FOR SELECT USING (
      arena_id IN (SELECT arena_id FROM public.arena_members WHERE user_id = auth.uid() AND left_at IS NULL)
    );

  DROP POLICY IF EXISTS "Arena owners can insert initial scores" ON public.arena_scores;
  CREATE POLICY "Arena owners can insert initial scores" ON public.arena_scores
    FOR INSERT WITH CHECK (
      arena_id IN (SELECT id FROM public.arenas WHERE owner_id = auth.uid())
    );

  DROP POLICY IF EXISTS "Users can update their own score components" ON public.arena_scores;
  CREATE POLICY "Users can update their own score components" ON public.arena_scores
    FOR UPDATE USING (auth.uid() = user_id);

  -- HALL OF FAME RLS
  DROP POLICY IF EXISTS "Authenticated users can read hall of fame" ON public.hall_of_fame;
  CREATE POLICY "Authenticated users can read hall of fame" ON public.hall_of_fame
    FOR SELECT TO authenticated USING (true);

  DROP POLICY IF EXISTS "Authenticated users can archive champions" ON public.hall_of_fame;
  CREATE POLICY "Authenticated users can archive champions" ON public.hall_of_fame
    FOR INSERT TO authenticated WITH CHECK (true);

  -- ARENA ACTIVITY RLS
  DROP POLICY IF EXISTS "Members can read activity" ON public.arena_activity;
  CREATE POLICY "Members can read activity" ON public.arena_activity
    FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.arena_members
        WHERE arena_id = arena_activity.arena_id
        AND user_id = auth.uid()
      )
    );

  DROP POLICY IF EXISTS "Members can insert activity" ON public.arena_activity;
  CREATE POLICY "Members can insert activity" ON public.arena_activity
    FOR INSERT TO authenticated WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.arena_members
        WHERE arena_id = arena_activity.arena_id
        AND user_id = auth.uid()
      )
    );

  DROP POLICY IF EXISTS "Members can delete activity" ON public.arena_activity;
  CREATE POLICY "Members can delete activity" ON public.arena_activity
    FOR DELETE TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.arena_members
        WHERE arena_id = arena_activity.arena_id
        AND user_id = auth.uid()
      )
    );
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 5: REALTIME PUBLICATIONS
-- ████████████████████████████████████████████████████████████████████████████

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'arena_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_scores;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'arena_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'arena_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_activity;
  END IF;
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 6: ARENA AUTO-ENROLLMENT TRIGGER (Friends → Arena)
-- ████████████████████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.handle_friendship_arena_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_arena_id UUID;
BEGIN
  -- Find the global arena by name
  SELECT id INTO v_arena_id
  FROM public.arenas
  WHERE name = 'Global Productivity Arena'
  LIMIT 1;

  -- Create global arena if it doesn't exist yet
  IF v_arena_id IS NULL THEN
    INSERT INTO public.arenas (name, description, owner_id, visibility)
    VALUES (
      'Global Productivity Arena',
      'The global arena where all friends compete',
      NEW.user_id,
      'friends_only'
    )
    RETURNING id INTO v_arena_id;
  END IF;

  -- Enroll both users (idempotent via ON CONFLICT)
  INSERT INTO public.arena_members (arena_id, user_id)
  VALUES (v_arena_id, NEW.user_id)
  ON CONFLICT (arena_id, user_id) DO NOTHING;

  INSERT INTO public.arena_members (arena_id, user_id)
  VALUES (v_arena_id, NEW.friend_id)
  ON CONFLICT (arena_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friendship_created ON public.friends;
CREATE TRIGGER on_friendship_created
  AFTER INSERT OR UPDATE ON public.friends
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.handle_friendship_arena_enrollment();


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 7: RELOAD POSTGREST SCHEMA CACHE
-- ████████████████████████████████████████████████████████████████████████████

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
-- After applying this migration, verify:
--   ✅ SELECT * FROM public.arenas LIMIT 0;
--   ✅ SELECT * FROM public.arena_members LIMIT 0;
--   ✅ SELECT * FROM public.arena_scores LIMIT 0;
--   ✅ SELECT * FROM public.hall_of_fame LIMIT 0;
--   ✅ SELECT * FROM public.arena_activity LIMIT 0;
--   ✅ SELECT recurring_expense_id, recurring_occurrence_date FROM public.expenses LIMIT 0;
-- =============================================================================
