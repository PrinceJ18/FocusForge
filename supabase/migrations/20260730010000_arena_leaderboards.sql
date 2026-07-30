-- 20260730010000_arena_leaderboards.sql
-- Enables Weekly and Monthly Leaderboards by adding period tracking to arena_scores

-- 1. Drop existing unique constraint
ALTER TABLE public.arena_scores DROP CONSTRAINT IF EXISTS arena_scores_unique;

-- 2. Add period columns
ALTER TABLE public.arena_scores
  ADD COLUMN IF NOT EXISTS period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')) DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS period_start DATE NOT NULL DEFAULT CURRENT_DATE;

-- Remove defaults after applying to ensure strictly provided values going forward
ALTER TABLE public.arena_scores ALTER COLUMN period_type DROP DEFAULT;
ALTER TABLE public.arena_scores ALTER COLUMN period_start DROP DEFAULT;

-- 3. Create new composite unique constraint
ALTER TABLE public.arena_scores 
  ADD CONSTRAINT arena_scores_period_unique UNIQUE (arena_id, user_id, period_type, period_start);

-- 4. Set up Realtime replication for leaderboards
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
END $$;

NOTIFY pgrst, 'reload schema';
