-- 20260730000000_arena_foundation.sql
-- Establishes the data layer for the Productivity Arena

-- 1. Create arenas table
CREATE TABLE IF NOT EXISTS public.arenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL CHECK (visibility IN ('private', 'friends_only')) DEFAULT 'friends_only',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create arena_members table
CREATE TABLE IF NOT EXISTS public.arena_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    CONSTRAINT arena_members_unique_active UNIQUE (arena_id, user_id)
);

-- 3. Create arena_scores table
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
    CONSTRAINT arena_scores_unique UNIQUE (arena_id, user_id)
);

-- 4. Set up auto-updated_at trigger for arenas
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

-- 5. Enable Row Level Security
ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_scores ENABLE ROW LEVEL SECURITY;

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
    
END $$;

NOTIFY pgrst, 'reload schema';
