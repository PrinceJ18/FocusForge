-- =============================================================================
-- Fix Arena RLS: Allow owner-initiated invites and self-join
-- =============================================================================
-- The original arena_members INSERT policy only allowed arena owners.
-- This blocked the invitation flow where the owner inserts rows for friends.
-- Fix: Allow insert if user_id = auth.uid() (self-join) OR the arena is owned
-- by the authenticated user.
-- =============================================================================

BEGIN;

-- 1. Fix arena_members INSERT policy
DROP POLICY IF EXISTS "Arena owners can insert members" ON public.arena_members;
DROP POLICY IF EXISTS "Arena owners or self can join" ON public.arena_members;

CREATE POLICY "Arena owners or self can join" ON public.arena_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR arena_id IN (SELECT id FROM public.arenas WHERE owner_id = auth.uid())
  );

-- 2. Fix arena_scores INSERT policy (owner can init scores for members)
DROP POLICY IF EXISTS "Arena owners can insert initial scores" ON public.arena_scores;
DROP POLICY IF EXISTS "Arena owners or self can upsert scores" ON public.arena_scores;

CREATE POLICY "Arena owners or self can upsert scores" ON public.arena_scores
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR arena_id IN (SELECT id FROM public.arenas WHERE owner_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
