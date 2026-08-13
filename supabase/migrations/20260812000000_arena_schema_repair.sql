-- =============================================================================
-- PRODUCTION MIGRATION: Arena Schema Repair
-- =============================================================================
-- Root Cause: The arenas table was originally created by 20260726000000 with
-- columns (slug, is_default) and WITHOUT (owner_id, visibility, updated_at).
-- Later migrations used CREATE TABLE IF NOT EXISTS which silently skipped
-- because the table already existed with the old schema.
--
-- This migration adds the missing columns and cleans up the old ones.
-- SAFE TO RUN MULTIPLE TIMES: Uses IF NOT EXISTS / IF EXISTS throughout.
-- =============================================================================

BEGIN;

-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 1: ADD MISSING COLUMNS TO arenas
-- ████████████████████████████████████████████████████████████████████████████

-- 1a. Add owner_id (required by createArena, RLS policies, and UI)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arenas' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.arenas ADD COLUMN owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    -- Set existing rows to NULL (they were seed data). New rows will require owner_id.
    RAISE NOTICE 'Added owner_id column to arenas';
  END IF;
END $$;

-- 1b. Add visibility (required by createArena)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arenas' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.arenas ADD COLUMN visibility TEXT NOT NULL DEFAULT 'friends_only'
      CHECK (visibility IN ('private', 'friends_only'));
    RAISE NOTICE 'Added visibility column to arenas';
  END IF;
END $$;

-- 1c. Add updated_at (required by arena update trigger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arenas' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.arenas ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    RAISE NOTICE 'Added updated_at column to arenas';
  END IF;
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 2: ADD MISSING COLUMNS TO arena_members
-- ████████████████████████████████████████████████████████████████████████████

-- 2a. Add left_at (required by One-Arena enforcement and membership queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_members' AND column_name = 'left_at'
  ) THEN
    ALTER TABLE public.arena_members ADD COLUMN left_at TIMESTAMPTZ;
    RAISE NOTICE 'Added left_at column to arena_members';
  END IF;
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 3: FIX arena_scores SCHEMA
-- ████████████████████████████████████████████████████████████████████████████

-- The old schema had: period_end, arena_score, rank, focus_minutes, tasks_completed,
--                      productivity_score_snapshot, daily_challenge_points
-- The new schema has:  focus_points, task_points, challenge_points, streak_bonus,
--                      total_score (GENERATED), last_calculated_at, period_type, period_start

-- 3a. Add focus_points, task_points, challenge_points, streak_bonus if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name = 'focus_points'
  ) THEN
    ALTER TABLE public.arena_scores ADD COLUMN focus_points NUMERIC NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added focus_points to arena_scores';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name = 'task_points'
  ) THEN
    ALTER TABLE public.arena_scores ADD COLUMN task_points NUMERIC NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added task_points to arena_scores';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name = 'challenge_points'
  ) THEN
    ALTER TABLE public.arena_scores ADD COLUMN challenge_points NUMERIC NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added challenge_points to arena_scores';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name = 'streak_bonus'
  ) THEN
    ALTER TABLE public.arena_scores ADD COLUMN streak_bonus NUMERIC NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added streak_bonus to arena_scores';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name = 'last_calculated_at'
  ) THEN
    ALTER TABLE public.arena_scores ADD COLUMN last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    RAISE NOTICE 'Added last_calculated_at to arena_scores';
  END IF;
END $$;

-- 3b. Add total_score as a regular column if it doesn't exist
-- (GENERATED ALWAYS AS cannot be added to an existing table easily,
--  so we use a trigger instead for backwards compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name = 'total_score'
  ) THEN
    ALTER TABLE public.arena_scores ADD COLUMN total_score NUMERIC NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added total_score to arena_scores';
  END IF;
END $$;

-- 3c. Create trigger to auto-compute total_score (only if it's NOT a generated column)
-- If the consolidated migration created the table, total_score is GENERATED ALWAYS
-- and doesn't need a trigger. If we just added it above, it does.
CREATE OR REPLACE FUNCTION public.compute_arena_total_score()
RETURNS trigger AS $$
BEGIN
  NEW.total_score := COALESCE(NEW.focus_points, 0) + COALESCE(NEW.task_points, 0)
                   + COALESCE(NEW.challenge_points, 0) + COALESCE(NEW.streak_bonus, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_arena_total_score ON public.arena_scores;

DO $$
DECLARE
  is_generated TEXT;
BEGIN
  SELECT is_identity INTO is_generated
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name = 'total_score';

  -- Only create trigger if total_score is NOT a generated column
  -- Generated columns have generation_expression set; regular columns don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_scores'
      AND column_name = 'total_score' AND is_generated = 'ALWAYS'
  ) THEN
    CREATE TRIGGER trg_compute_arena_total_score
      BEFORE INSERT OR UPDATE ON public.arena_scores
      FOR EACH ROW EXECUTE FUNCTION public.compute_arena_total_score();
    RAISE NOTICE 'Created total_score trigger (column is not generated)';
  ELSE
    RAISE NOTICE 'Skipped total_score trigger (column is GENERATED ALWAYS)';
  END IF;
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 4: FIX arena_activity SCHEMA
-- ████████████████████████████████████████████████████████████████████████████

-- Old schema: missing arena_id, title, description columns
-- New schema: has arena_id, title, description, activity_type (broader CHECK)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_activity' AND column_name = 'arena_id'
  ) THEN
    -- The old table references user_id but has no arena_id.
    -- We need arena_id for the activity feed filtering.
    ALTER TABLE public.arena_activity ADD COLUMN arena_id UUID REFERENCES public.arenas(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added arena_id to arena_activity';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_activity' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.arena_activity ADD COLUMN title TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added title to arena_activity';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_activity' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.arena_activity ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description to arena_activity';
  END IF;
END $$;

-- Drop the old restrictive CHECK constraint on activity_type if it exists
-- The old constraint only allowed: 'level_up', 'personal_best', 'daily_challenge', 'streak', 'badge'
-- The new service uses: 'arena_created', 'member_joined', 'member_removed', 'member_left',
--                        'owner_transferred', 'score_updated', etc.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.arena_activity'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%activity_type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.arena_activity DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped restrictive activity_type CHECK constraint: %', constraint_name;
  END IF;
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 5: ENSURE RLS POLICIES ARE CORRECT
-- ████████████████████████████████████████████████████████████████████████████

-- Re-create the correct policies (idempotent)
DO $$
BEGIN
  -- ARENAS: ensure INSERT policy uses owner_id
  DROP POLICY IF EXISTS "Authenticated users can view arenas" ON public.arenas;
  DROP POLICY IF EXISTS "Authenticated users can create arenas" ON public.arenas;
  DROP POLICY IF EXISTS "Users can read arenas they belong to" ON public.arenas;
  DROP POLICY IF EXISTS "Owners can update their arenas" ON public.arenas;
  DROP POLICY IF EXISTS "Owners can delete their arenas" ON public.arenas;

  -- SELECT: members and owners can see their arenas
  CREATE POLICY "Users can read arenas they belong to" ON public.arenas
    FOR SELECT USING (
      auth.uid() = owner_id
      OR id IN (SELECT arena_id FROM public.arena_members WHERE user_id = auth.uid() AND left_at IS NULL)
    );

  -- INSERT: owner_id must match auth.uid()
  CREATE POLICY "Authenticated users can create arenas" ON public.arenas
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

  -- UPDATE: only owner
  CREATE POLICY "Owners can update their arenas" ON public.arenas
    FOR UPDATE USING (auth.uid() = owner_id);

  -- DELETE: only owner
  CREATE POLICY "Owners can delete their arenas" ON public.arenas
    FOR DELETE USING (auth.uid() = owner_id);

  -- ARENA MEMBERS: ensure INSERT allows owner + self-join
  DROP POLICY IF EXISTS "Arena owners can insert members" ON public.arena_members;
  DROP POLICY IF EXISTS "Arena owners or self can join" ON public.arena_members;
  DROP POLICY IF EXISTS "Users can join arenas" ON public.arena_members;

  CREATE POLICY "Arena owners or self can join" ON public.arena_members
    FOR INSERT WITH CHECK (
      user_id = auth.uid()
      OR arena_id IN (SELECT id FROM public.arenas WHERE owner_id = auth.uid())
    );

  -- ARENA SCORES: ensure INSERT allows owner + self
  DROP POLICY IF EXISTS "Arena owners can insert initial scores" ON public.arena_scores;
  DROP POLICY IF EXISTS "Arena owners or self can upsert scores" ON public.arena_scores;
  DROP POLICY IF EXISTS "Users can insert their own arena scores" ON public.arena_scores;

  CREATE POLICY "Arena owners or self can upsert scores" ON public.arena_scores
    FOR INSERT WITH CHECK (
      user_id = auth.uid()
      OR arena_id IN (SELECT id FROM public.arenas WHERE owner_id = auth.uid())
    );

END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION 6: ARENA ACTIVITY INDEX ON arena_id
-- ████████████████████████████████████████████████████████████████████████████

CREATE INDEX IF NOT EXISTS idx_arena_activity_arena_id ON public.arena_activity(arena_id);


NOTIFY pgrst, 'reload schema';

COMMIT;
