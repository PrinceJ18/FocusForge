-- ============================================================
-- Live Arena Engine - Friends Enrollment Automation
-- Migration: 20260801000000_live_arena_automation.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_friendship_arena_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_arena_id UUID;
BEGIN
  -- Get the global arena ID
  SELECT id INTO v_arena_id FROM public.arenas WHERE slug = 'global-arena' LIMIT 1;
  
  IF v_arena_id IS NOT NULL THEN
    -- Insert for user_id
    INSERT INTO public.arena_members (arena_id, user_id)
    VALUES (v_arena_id, NEW.user_id)
    ON CONFLICT (arena_id, user_id) DO NOTHING;
    
    -- Insert for friend_id
    INSERT INTO public.arena_members (arena_id, user_id)
    VALUES (v_arena_id, NEW.friend_id)
    ON CONFLICT (arena_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friendship_created ON public.friends;

CREATE TRIGGER on_friendship_created
  AFTER INSERT OR UPDATE ON public.friends
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.handle_friendship_arena_enrollment();
