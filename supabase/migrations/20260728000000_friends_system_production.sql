-- ============================================================
-- FocusForge Migration: 20260728000000_friends_system_production.sql
-- Phase 2 | Chunk 1: Friends System Production Completion
-- ============================================================

-- 1. EXTENSION FOR TRGM IF NOT EXISTS (Needed for ILIKE index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. UPDATE FRIEND CODE GENERATOR TO 7 CHARACTERS
CREATE OR REPLACE FUNCTION generate_unique_friend_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
    code_exists BOOLEAN := true;
BEGIN
    WHILE code_exists LOOP
        result := '';
        FOR i IN 1..7 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = result) INTO code_exists;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. CREATE AUTH.USERS TRIGGER FOR AUTOMATIC PROFILE CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    display_name, 
    avatar_url, 
    friend_code, 
    xp, 
    streak,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    generate_unique_friend_code(),
    0,
    0,
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then attach it to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ENSURE ALL EXISTING PROFILES HAVE 7-CHARACTER FRIEND CODES
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id, friend_code FROM public.profiles LOOP
        IF rec.friend_code IS NULL OR length(rec.friend_code) != 7 THEN
            UPDATE public.profiles
            SET friend_code = generate_unique_friend_code()
            WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

-- 5. ENSURE INDEXES FOR FRIEND CODE SEARCH
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON public.profiles(upper(friend_code));
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);

-- 6. ENSURE FRIEND REQUESTS TABLE EXISTS WITH RLS
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT friend_requests_unique_pair UNIQUE (sender_id, receiver_id)
);

-- 7. ENSURE FRIENDS TABLE EXISTS WITH RLS
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT friends_unique_link UNIQUE (user_id, friend_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
