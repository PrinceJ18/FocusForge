-- 20260730020000_arena_champions.sql
-- Creates the Hall of Fame table and snapshot mechanism

CREATE TABLE IF NOT EXISTS public.hall_of_fame (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    champion_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Snapshots (must not join directly for these values at read time)
    display_name_snapshot TEXT,
    avatar_url_snapshot TEXT,
    level_snapshot INTEGER NOT NULL DEFAULT 1,
    
    -- Score Snapshots
    total_score NUMERIC NOT NULL DEFAULT 0,
    focus_points NUMERIC NOT NULL DEFAULT 0,
    task_points NUMERIC NOT NULL DEFAULT 0,
    challenge_points NUMERIC NOT NULL DEFAULT 0,
    streak_bonus NUMERIC NOT NULL DEFAULT 0,
    
    member_count INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Duplicate protection
    CONSTRAINT hall_of_fame_arena_period_unique UNIQUE (arena_id, period_type, period_start)
);

-- RLS
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read hall of fame" ON public.hall_of_fame;
  CREATE POLICY "Authenticated users can read hall of fame" ON public.hall_of_fame
    FOR SELECT TO authenticated USING (true);
    
  DROP POLICY IF EXISTS "Authenticated users can archive champions" ON public.hall_of_fame;
  CREATE POLICY "Authenticated users can archive champions" ON public.hall_of_fame
    FOR INSERT TO authenticated WITH CHECK (true);
END $$;

NOTIFY pgrst, 'reload schema';
