-- ============================================================
-- Productivity Arena — Milestone 1.1 Backend Refinement
-- Migration: 20260726010000_refine_productivity_arena.sql
-- ============================================================

-- 1. ARENA VISIBILITY & CREATOR FIELDS
ALTER TABLE public.arenas 
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'invite_only' CHECK (visibility IN ('private', 'invite_only', 'public')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update default arena visibility
UPDATE public.arenas 
SET visibility = 'invite_only' 
WHERE slug = 'global-arena';

-- 2. HALL OF FAME HISTORICAL SNAPSHOT FIELDS
ALTER TABLE public.hall_of_fame 
ADD COLUMN IF NOT EXISTS winner_username TEXT,
ADD COLUMN IF NOT EXISTS winner_avatar_url TEXT;

-- 3. SOFT DELETE FIELDS (deleted_at)
ALTER TABLE public.friends 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.friend_requests 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.arena_members 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. PERFORMANCE & AUDIT INDEXES
CREATE INDEX IF NOT EXISTS idx_friends_deleted ON public.friends(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_friend_requests_deleted ON public.friend_requests(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_arena_members_deleted ON public.arena_members(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_arenas_visibility ON public.arenas(visibility);
CREATE INDEX IF NOT EXISTS idx_arenas_created_by ON public.arenas(created_by);
