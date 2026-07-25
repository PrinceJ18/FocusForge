-- ============================================================
-- Productivity Arena — Milestone 1 Database Foundation
-- Migration: 20260726000000_create_productivity_arena.sql
-- ============================================================

-- 1. ARENAS TABLE (Multi-Arena Architecture Support)
CREATE TABLE IF NOT EXISTS public.arenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Global Arena for MVP
INSERT INTO public.arenas (name, slug, description, is_default)
VALUES ('Global Productivity Arena', 'global-arena', 'The primary competitive arena for all FocusForge users.', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. FRIEND REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_friend_request_not_self CHECK (sender_id <> receiver_id),
    CONSTRAINT uq_friend_request_pairing UNIQUE (sender_id, receiver_id)
);

-- 3. FRIENDS TABLE (Mutual Bi-Directional Friendship)
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_friend_not_self CHECK (user_id <> friend_id),
    CONSTRAINT uq_friendship_pair UNIQUE (user_id, friend_id)
);

-- 4. ARENA MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.arena_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    active BOOLEAN DEFAULT true,
    CONSTRAINT uq_arena_membership UNIQUE (arena_id, user_id)
);

-- 5. ARENA SCORES TABLE (Separate from Productivity Score)
CREATE TABLE IF NOT EXISTS public.arena_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    arena_score NUMERIC NOT NULL DEFAULT 0,
    rank INTEGER,
    focus_minutes INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    productivity_score_snapshot NUMERIC NOT NULL DEFAULT 0,
    daily_challenge_points NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_arena_user_period UNIQUE (user_id, arena_id, period_type, period_start)
);

-- 6. HALL OF FAME TABLE
CREATE TABLE IF NOT EXISTS public.hall_of_fame (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arena_id UUID NOT NULL REFERENCES public.arenas(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    winner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    arena_score NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_hall_of_fame_winner UNIQUE (arena_id, period_type, period_start)
);

-- 7. ARENA ACTIVITY TABLE (Lightweight Public Social Feed)
CREATE TABLE IF NOT EXISTS public.arena_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('level_up', 'personal_best', 'daily_challenge', 'streak', 'badge')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES FOR HIGH-PERFORMANCE LEADERBOARD & QUERIES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);

CREATE INDEX IF NOT EXISTS idx_friends_user ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON public.friends(friend_id);

CREATE INDEX IF NOT EXISTS idx_arena_members_arena_user ON public.arena_members(arena_id, user_id);

CREATE INDEX IF NOT EXISTS idx_arena_scores_leaderboard ON public.arena_scores(arena_id, period_type, period_start, arena_score DESC);
CREATE INDEX IF NOT EXISTS idx_arena_scores_user ON public.arena_scores(user_id);

CREATE INDEX IF NOT EXISTS idx_hall_of_fame_arena ON public.hall_of_fame(arena_id, period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_arena_activity_created ON public.arena_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_activity_user ON public.arena_activity(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_activity ENABLE ROW LEVEL SECURITY;

-- 1. Arenas RLS
CREATE POLICY "Authenticated users can view arenas"
    ON public.arenas FOR SELECT
    TO authenticated
    USING (true);

-- 2. Friend Requests RLS
CREATE POLICY "Users can view friend requests involving them"
    ON public.friend_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
    ON public.friend_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests involving them"
    ON public.friend_requests FOR UPDATE
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can cancel sent friend requests"
    ON public.friend_requests FOR DELETE
    TO authenticated
    USING (auth.uid() = sender_id);

-- 3. Friends RLS
CREATE POLICY "Users can view their friendships"
    ON public.friends FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can manage their friendships"
    ON public.friends FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their friendships"
    ON public.friends FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 4. Arena Members RLS
CREATE POLICY "Users can view arena memberships"
    ON public.arena_members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can join arenas"
    ON public.arena_members FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their arena membership"
    ON public.arena_members FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Arena Scores RLS
CREATE POLICY "Authenticated users can view arena leaderboard scores"
    ON public.arena_scores FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own arena scores"
    ON public.arena_scores FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own arena scores"
    ON public.arena_scores FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. Hall of Fame RLS
CREATE POLICY "Authenticated users can view Hall of Fame winners"
    ON public.hall_of_fame FOR SELECT
    TO authenticated
    USING (true);

-- 7. Arena Activity RLS
CREATE POLICY "Authenticated users can view public arena activities"
    ON public.arena_activity FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can post public arena activities"
    ON public.arena_activity FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
