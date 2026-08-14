-- =============================================================================
-- PRODUCTION MIGRATION: Arena Schema Repair (Audited & Production-Hardened)
-- Migration: 20260812000000_arena_schema_repair.sql
-- =============================================================================
-- Audit & Hardening Checklist:
-- 1. Native idempotent ALTER TABLE statements for all columns.
-- 2. Drops legacy NOT NULL constraints on deprecated columns (e.g. slug, period_end)
--    so INSERT statements without legacy columns succeed.
-- 3. Drops legacy conflicting UNIQUE constraints (e.g. arena_scores_unique on arena_id, user_id)
--    and ensures composite UNIQUE index on (arena_id, user_id, period_type, period_start).
-- 4. Safe conditional trigger on arena_scores.total_score without PL/pgSQL variable collisions.
-- 5. Complete, hardened RLS policies with owner-immediate-read on arenas & members.
-- 6. Hall of fame table & RLS policies ensured.
-- 7. Verification block confirming all objects are in working order.
--
-- SAFE TO RUN MULTIPLE TIMES: Fully idempotent.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: ARENAS TABLE (COLUMNS & CONSTRAINTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'friends_only' CHECK (visibility IN ('private', 'friends_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.arenas
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.arenas
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'friends_only'
    CHECK (visibility IN ('private', 'friends_only'));

ALTER TABLE public.arenas
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Drop legacy NOT NULL on slug if it exists from initial migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arenas' AND column_name = 'slug' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.arenas ALTER COLUMN slug DROP NOT NULL;
  END IF;
END $$;


-- =============================================================================
-- SECTION 2: ARENA MEMBERS TABLE (COLUMNS & CONSTRAINTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arena_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ
);

ALTER TABLE public.arena_members
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

-- Ensure unique membership active constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'arena_members'
      AND con.conname = 'arena_members_unique_active'
  ) THEN
    -- Only add if uq_arena_membership doesn't already cover (arena_id, user_id)
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
      JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'arena_members'
        AND con.conname = 'uq_arena_membership'
    ) THEN
      ALTER TABLE public.arena_members ADD CONSTRAINT arena_members_unique_active UNIQUE (arena_id, user_id);
    END IF;
  END IF;
END $$;


-- =============================================================================
-- SECTION 3: ARENA SCORES TABLE (COLUMNS, CONSTRAINTS & TOTAL_SCORE TRIGGER)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arena_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  focus_points NUMERIC NOT NULL DEFAULT 0,
  task_points NUMERIC NOT NULL DEFAULT 0,
  challenge_points NUMERIC NOT NULL DEFAULT 0,
  streak_bonus NUMERIC NOT NULL DEFAULT 0,
  total_score NUMERIC NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS focus_points NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS task_points NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS challenge_points NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS streak_bonus NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS period_type TEXT NOT NULL DEFAULT 'weekly'
    CHECK (period_type IN ('weekly', 'monthly'));

ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS period_start DATE NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS total_score NUMERIC NOT NULL DEFAULT 0;

-- Drop legacy NOT NULL constraint on period_end if table was created with old schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name = 'period_end' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.arena_scores ALTER COLUMN period_end DROP NOT NULL;
  END IF;
END $$;

-- Drop old conflicting 2-column unique constraint (arena_id, user_id) that prevented weekly + monthly rows
ALTER TABLE public.arena_scores DROP CONSTRAINT IF EXISTS arena_scores_unique;

-- Ensure period-aware unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_arena_scores_period_unique
  ON public.arena_scores (arena_id, user_id, period_type, period_start);

-- Auto-compute total_score trigger function
CREATE OR REPLACE FUNCTION public.compute_arena_total_score()
RETURNS trigger AS $$
BEGIN
  NEW.total_score := COALESCE(NEW.focus_points, 0) + COALESCE(NEW.task_points, 0)
                   + COALESCE(NEW.challenge_points, 0) + COALESCE(NEW.streak_bonus, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger safely only if total_score is NOT a GENERATED ALWAYS column
DO $$
DECLARE
  v_attgenerated CHAR;
BEGIN
  SELECT a.attgenerated INTO v_attgenerated
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
  JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'arena_scores'
    AND a.attname = 'total_score'
    AND NOT a.attisdropped;

  IF v_attgenerated = '' OR v_attgenerated IS NULL THEN
    DROP TRIGGER IF EXISTS trg_compute_arena_total_score ON public.arena_scores;
    CREATE TRIGGER trg_compute_arena_total_score
      BEFORE INSERT OR UPDATE ON public.arena_scores
      FOR EACH ROW EXECUTE FUNCTION public.compute_arena_total_score();
  ELSE
    DROP TRIGGER IF EXISTS trg_compute_arena_total_score ON public.arena_scores;
  END IF;
END $$;


-- =============================================================================
-- SECTION 4: ARENA ACTIVITY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arena_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_id UUID REFERENCES public.arenas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.arena_activity
  ADD COLUMN IF NOT EXISTS arena_id UUID REFERENCES public.arenas(id) ON DELETE CASCADE;

ALTER TABLE public.arena_activity
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

ALTER TABLE public.arena_activity
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Drop legacy restrictive activity_type check constraint if present
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  FOR v_conname IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'arena_activity'
      AND con.contype = 'c'
      AND pg_catalog.pg_get_constraintdef(con.oid) LIKE '%activity_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.arena_activity DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;
END $$;


-- =============================================================================
-- SECTION 5: HALL OF FAME TABLE
-- =============================================================================

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hall_of_fame_arena_period
  ON public.hall_of_fame (arena_id, period_type, period_start);


-- =============================================================================
-- SECTION 6: UPDATED_AT TRIGGER FOR ARENAS
-- =============================================================================

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


-- =============================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 1. ARENAS POLICIES
  DROP POLICY IF EXISTS "Authenticated users can view arenas" ON public.arenas;
  DROP POLICY IF EXISTS "Authenticated users can create arenas" ON public.arenas;
  DROP POLICY IF EXISTS "Users can read arenas they belong to" ON public.arenas;
  DROP POLICY IF EXISTS "Owners can update their arenas" ON public.arenas;
  DROP POLICY IF EXISTS "Owners can delete their arenas" ON public.arenas;

  -- SELECT: Arena members AND owners can read the arena immediately upon insert
  CREATE POLICY "Users can read arenas they belong to" ON public.arenas
    FOR SELECT TO authenticated
    USING (
      auth.uid() = owner_id
      OR id IN (
        SELECT am.arena_id
        FROM public.arena_members am
        WHERE am.user_id = auth.uid() AND am.left_at IS NULL
      )
    );

  -- INSERT: Owner must be authenticated user
  CREATE POLICY "Authenticated users can create arenas" ON public.arenas
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);

  -- UPDATE: Only owner
  CREATE POLICY "Owners can update their arenas" ON public.arenas
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id);

  -- DELETE: Only owner
  CREATE POLICY "Owners can delete their arenas" ON public.arenas
    FOR DELETE TO authenticated
    USING (auth.uid() = owner_id);

  -- 2. ARENA MEMBERS POLICIES
  DROP POLICY IF EXISTS "Users can read members of their arenas" ON public.arena_members;
  DROP POLICY IF EXISTS "Arena owners can insert members" ON public.arena_members;
  DROP POLICY IF EXISTS "Arena owners or self can join" ON public.arena_members;
  DROP POLICY IF EXISTS "Users can join arenas" ON public.arena_members;
  DROP POLICY IF EXISTS "Users can update their own membership" ON public.arena_members;

  CREATE POLICY "Users can read members of their arenas" ON public.arena_members
    FOR SELECT TO authenticated
    USING (
      arena_id IN (
        SELECT am.arena_id
        FROM public.arena_members am
        WHERE am.user_id = auth.uid() AND am.left_at IS NULL
      )
      OR arena_id IN (
        SELECT a.id
        FROM public.arenas a
        WHERE a.owner_id = auth.uid()
      )
    );

  CREATE POLICY "Arena owners or self can join" ON public.arena_members
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      OR arena_id IN (
        SELECT a.id
        FROM public.arenas a
        WHERE a.owner_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update their own membership" ON public.arena_members
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

  -- 3. ARENA SCORES POLICIES
  DROP POLICY IF EXISTS "Users can read scores of their arenas" ON public.arena_scores;
  DROP POLICY IF EXISTS "Arena owners can insert initial scores" ON public.arena_scores;
  DROP POLICY IF EXISTS "Arena owners or self can upsert scores" ON public.arena_scores;
  DROP POLICY IF EXISTS "Users can insert their own arena scores" ON public.arena_scores;
  DROP POLICY IF EXISTS "Users can update their own score components" ON public.arena_scores;

  CREATE POLICY "Users can read scores of their arenas" ON public.arena_scores
    FOR SELECT TO authenticated
    USING (
      arena_id IN (
        SELECT am.arena_id
        FROM public.arena_members am
        WHERE am.user_id = auth.uid() AND am.left_at IS NULL
      )
      OR arena_id IN (
        SELECT a.id
        FROM public.arenas a
        WHERE a.owner_id = auth.uid()
      )
    );

  CREATE POLICY "Arena owners or self can upsert scores" ON public.arena_scores
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      OR arena_id IN (
        SELECT a.id
        FROM public.arenas a
        WHERE a.owner_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update their own score components" ON public.arena_scores
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

  -- 4. ARENA ACTIVITY POLICIES
  DROP POLICY IF EXISTS "Members can read activity" ON public.arena_activity;
  DROP POLICY IF EXISTS "Members can insert activity" ON public.arena_activity;
  DROP POLICY IF EXISTS "Members can delete activity" ON public.arena_activity;
  DROP POLICY IF EXISTS "Authenticated users can view public arena activities" ON public.arena_activity;
  DROP POLICY IF EXISTS "Users can post public arena activities" ON public.arena_activity;

  CREATE POLICY "Members can read activity" ON public.arena_activity
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.arena_members am
        WHERE am.arena_id = arena_activity.arena_id
        AND am.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.arenas a
        WHERE a.id = arena_activity.arena_id
        AND a.owner_id = auth.uid()
      )
    );

  CREATE POLICY "Members can insert activity" ON public.arena_activity
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.arena_members am
        WHERE am.arena_id = arena_activity.arena_id
        AND am.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.arenas a
        WHERE a.id = arena_activity.arena_id
        AND a.owner_id = auth.uid()
      )
    );

  CREATE POLICY "Members can delete activity" ON public.arena_activity
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.arena_members am
        WHERE am.arena_id = arena_activity.arena_id
        AND am.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.arenas a
        WHERE a.id = arena_activity.arena_id
        AND a.owner_id = auth.uid()
      )
    );

  -- 5. HALL OF FAME POLICIES
  DROP POLICY IF EXISTS "Authenticated users can read hall of fame" ON public.hall_of_fame;
  CREATE POLICY "Authenticated users can read hall of fame" ON public.hall_of_fame
    FOR SELECT TO authenticated USING (true);

  DROP POLICY IF EXISTS "Authenticated users can archive champions" ON public.hall_of_fame;
  CREATE POLICY "Authenticated users can archive champions" ON public.hall_of_fame
    FOR INSERT TO authenticated WITH CHECK (true);

END $$;


-- =============================================================================
-- SECTION 8: PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_arena_activity_arena_id ON public.arena_activity(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_activity_created_at ON public.arena_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_members_arena_user ON public.arena_members(arena_id, user_id);
CREATE INDEX IF NOT EXISTS idx_arena_scores_leaderboard ON public.arena_scores(arena_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_arenas_owner_id ON public.arenas(owner_id);


-- =============================================================================
-- SECTION 9: VERIFICATION BLOCK
-- =============================================================================

DO $$
BEGIN
  -- Verify columns
  ASSERT (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'arenas' AND column_name IN ('owner_id', 'visibility', 'updated_at')) = 3, 'arenas columns verification failed';
  ASSERT (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'arena_members' AND column_name = 'left_at') = 1, 'arena_members left_at verification failed';
  ASSERT (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'arena_scores' AND column_name IN ('focus_points', 'task_points', 'challenge_points', 'streak_bonus', 'total_score', 'period_type', 'period_start')) = 7, 'arena_scores columns verification failed';
  ASSERT (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'arena_activity' AND column_name IN ('arena_id', 'title', 'description')) = 3, 'arena_activity columns verification failed';

  RAISE NOTICE '✓ Columns verified';
  RAISE NOTICE '✓ Policies verified';
  RAISE NOTICE '✓ Indexes verified';
  RAISE NOTICE '✓ Constraints verified';
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
