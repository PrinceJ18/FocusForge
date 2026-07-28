-- ============================================================
-- FocusForge Friends System Bootstrap
-- Completely idempotent database migration and recovery
-- ============================================================

BEGIN;

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Repair / Create public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    friend_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist (in case table existed but was missing columns)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'friend_code') THEN
        ALTER TABLE public.profiles ADD COLUMN friend_code TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'level') THEN
        ALTER TABLE public.profiles ADD COLUMN level INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'xp') THEN
        ALTER TABLE public.profiles ADD COLUMN xp INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'streak') THEN
        ALTER TABLE public.profiles ADD COLUMN streak INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
        ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
    END IF;
END $$;

-- 3. Automatic Friend Code Generation Function
CREATE OR REPLACE FUNCTION public.generate_unique_friend_code()
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
        
        -- Check collision
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = result) INTO code_exists;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Auth User Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    display_name, 
    avatar_url, 
    friend_code, 
    level,
    xp, 
    streak,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    public.generate_unique_friend_code(),
    1,
    0,
    0,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing friend codes (Never overwrite existing codes)
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id FROM public.profiles WHERE friend_code IS NULL OR trim(friend_code) = '' LOOP
        UPDATE public.profiles
        SET friend_code = public.generate_unique_friend_code()
        WHERE id = rec.id;
    END LOOP;
END $$;

-- Add NOT NULL and UNIQUE constraints to friend_code safely
DO $$
BEGIN
    -- Add UNIQUE if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_friend_code_key' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_friend_code_key UNIQUE (friend_code);
    END IF;
END $$;

-- Enforce NOT NULL on friend_code now that it's backfilled
ALTER TABLE public.profiles ALTER COLUMN friend_code SET NOT NULL;

-- 5. Create friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friend_requests_unique_pair') THEN
        ALTER TABLE public.friend_requests ADD CONSTRAINT friend_requests_unique_pair UNIQUE (sender_id, receiver_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prevent_self_request') THEN
        ALTER TABLE public.friend_requests ADD CONSTRAINT prevent_self_request CHECK (sender_id != receiver_id);
    END IF;
END $$;


-- 6. Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friends_unique_link') THEN
        ALTER TABLE public.friends ADD CONSTRAINT friends_unique_link UNIQUE (user_id, friend_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prevent_self_friend') THEN
        ALTER TABLE public.friends ADD CONSTRAINT prevent_self_friend CHECK (user_id != friend_id);
    END IF;
END $$;


-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON public.profiles(upper(friend_code));
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- 8. Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Friend Requests Policies
DROP POLICY IF EXISTS "Users can view relevant friend requests" ON public.friend_requests;
CREATE POLICY "Users can view relevant friend requests"
    ON public.friend_requests FOR SELECT TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_requests;
CREATE POLICY "Users can create friend requests"
    ON public.friend_requests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update own/received friend requests" ON public.friend_requests;
CREATE POLICY "Users can update own/received friend requests"
    ON public.friend_requests FOR UPDATE TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Friends Policies
DROP POLICY IF EXISTS "Users can view own friends list" ON public.friends;
CREATE POLICY "Users can view own friends list"
    ON public.friends FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can insert/update friendship records" ON public.friends;
CREATE POLICY "Users can insert/update friendship records"
    ON public.friends FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can update friendship records" ON public.friends;
CREATE POLICY "Users can update friendship records"
    ON public.friends FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

COMMIT;

-- 9. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
