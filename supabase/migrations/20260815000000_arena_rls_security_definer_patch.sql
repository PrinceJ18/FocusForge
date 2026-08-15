-- =============================================================================
-- FINAL RLS PATCH: NON-RECURSIVE SECURITY DEFINER HELPER & SELECT POLICIES
-- =============================================================================

BEGIN;

-- 1. Helper function (SECURITY DEFINER bypasses RLS internally to eliminate recursion)
CREATE OR REPLACE FUNCTION public.is_arena_member(_arena_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.arena_members
    WHERE arena_id = _arena_id
      AND user_id = _user_id
      AND left_at IS NULL
  );
$$;

-- 2. Restrict and grant execute privileges on the helper function
REVOKE ALL ON FUNCTION public.is_arena_member(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_arena_member(uuid, uuid)
TO authenticated;


-- 3. ARENA MEMBERS SELECT POLICY (Replaces recursive self-referencing subquery)
DROP POLICY IF EXISTS "Users can read members of their arenas" ON public.arena_members;
DROP POLICY IF EXISTS "Users can view arena memberships" ON public.arena_members;
DROP POLICY IF EXISTS "arena_members_select_policy" ON public.arena_members;

CREATE POLICY "arena_members_select_policy" ON public.arena_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR arena_id IN (SELECT a.id FROM public.arenas a WHERE a.owner_id = auth.uid())
    OR public.is_arena_member(arena_id, auth.uid())
  );


-- 4. ARENAS SELECT POLICY (Owner immediate read upon creation + active member read)
DROP POLICY IF EXISTS "Users can read arenas they belong to" ON public.arenas;
DROP POLICY IF EXISTS "Authenticated users can view arenas" ON public.arenas;
DROP POLICY IF EXISTS "arenas_select_policy" ON public.arenas;

CREATE POLICY "arenas_select_policy" ON public.arenas
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_arena_member(id, auth.uid())
  );


-- 5. ARENA SCORES SELECT POLICY (Visible to members and arena owner)
DROP POLICY IF EXISTS "Users can read scores of their arenas" ON public.arena_scores;
DROP POLICY IF EXISTS "Authenticated users can view arena leaderboard scores" ON public.arena_scores;
DROP POLICY IF EXISTS "arena_scores_select_policy" ON public.arena_scores;

CREATE POLICY "arena_scores_select_policy" ON public.arena_scores
  FOR SELECT TO authenticated
  USING (
    arena_id IN (SELECT a.id FROM public.arenas a WHERE a.owner_id = auth.uid())
    OR public.is_arena_member(arena_id, auth.uid())
  );


-- 6. ARENA ACTIVITY SELECT POLICY (Visible to members and arena owner)
DROP POLICY IF EXISTS "Members can read activity" ON public.arena_activity;
DROP POLICY IF EXISTS "Authenticated users can view public arena activities" ON public.arena_activity;
DROP POLICY IF EXISTS "arena_activity_select_policy" ON public.arena_activity;

CREATE POLICY "arena_activity_select_policy" ON public.arena_activity
  FOR SELECT TO authenticated
  USING (
    arena_id IN (SELECT a.id FROM public.arenas a WHERE a.owner_id = auth.uid())
    OR public.is_arena_member(arena_id, auth.uid())
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
