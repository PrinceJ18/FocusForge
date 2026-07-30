-- 20260730030000_arena_activity.sql
-- Creates the arena_activity table for the engagement feed

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

-- Indices for fast pagination & retention pruning
CREATE INDEX IF NOT EXISTS idx_arena_activity_arena_id ON public.arena_activity(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_activity_created_at ON public.arena_activity(created_at DESC);

-- RLS
ALTER TABLE public.arena_activity ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
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

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'arena_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_activity;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
