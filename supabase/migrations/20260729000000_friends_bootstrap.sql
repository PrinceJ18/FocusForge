-- 20260729000000_friends_bootstrap.sql
-- Safely upgrades the current production database for the Friends system

-- 1. Enable pg_trgm for search if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add missing columns to public.profiles safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Backfill missing levels and set NOT NULL
UPDATE public.profiles SET level = 1 WHERE level IS NULL;
ALTER TABLE public.profiles ALTER COLUMN level SET NOT NULL;

-- 3. Create function to generate a 7-character uppercase alphanumeric friend code
CREATE OR REPLACE FUNCTION public.generate_unique_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  new_code TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..7 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = new_code) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- 4. Create missing profiles for existing auth.users records BEFORE trigger creation
INSERT INTO public.profiles (
  id,
  display_name,
  avatar_url,
  xp,
  streak,
  monthly_budget,
  total_savings,
  badges,
  daily_challenge_claims,
  friend_code,
  level,
  last_active_date,
  updated_at
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1), 'User'),
  au.raw_user_meta_data->>'avatar_url',
  0,
  0,
  0,
  0,
  '[]'::jsonb,
  '{}'::jsonb,
  public.generate_unique_friend_code(),
  1,
  to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD'),
  CURRENT_TIMESTAMP
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Backfill existing users that don't have a valid friend_code
DO $$
DECLARE
  profile_rec RECORD;
BEGIN
  FOR profile_rec IN SELECT id FROM public.profiles WHERE friend_code IS NULL OR friend_code = '' OR friend_code <> UPPER(friend_code) OR LENGTH(friend_code) <> 7 LOOP
    UPDATE public.profiles
    SET friend_code = public.generate_unique_friend_code()
    WHERE id = profile_rec.id;
  END LOOP;
END;
$$;

-- 6. Enforce NOT NULL, UNIQUE, length, and uppercase on friend_code
ALTER TABLE public.profiles ALTER COLUMN friend_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_friend_code_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_friend_code_key UNIQUE (friend_code);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_friend_code_check_upper') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_friend_code_check_upper CHECK (friend_code = UPPER(friend_code));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_friend_code_check_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_friend_code_check_length CHECK (LENGTH(friend_code) = 7);
  END IF;
END $$;

-- 7. Enforce immutability of friend_code
CREATE OR REPLACE FUNCTION public.prevent_friend_code_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.friend_code IS DISTINCT FROM OLD.friend_code THEN
    RAISE EXCEPTION 'friend_code is immutable and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_friend_code_immutability ON public.profiles;
CREATE TRIGGER enforce_friend_code_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.friend_code IS NOT NULL)
  EXECUTE FUNCTION public.prevent_friend_code_update();

-- 8. Repair handle_new_user trigger matching EXACT current schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    avatar_url,
    xp,
    streak,
    monthly_budget,
    total_savings,
    badges,
    daily_challenge_claims,
    friend_code,
    level,
    last_active_date,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    new.raw_user_meta_data->>'avatar_url',
    0,
    0,
    0,
    0,
    '[]'::jsonb,
    '{}'::jsonb,
    public.generate_unique_friend_code(),
    1,
    to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD'),
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Attach trigger to auth.users (always dropping first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Create friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Constraints for friend_requests
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friend_requests_sender_receiver_check') THEN
    ALTER TABLE public.friend_requests ADD CONSTRAINT friend_requests_sender_receiver_check CHECK (sender_id <> receiver_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friend_requests_sender_receiver_unique') THEN
    ALTER TABLE public.friend_requests ADD CONSTRAINT friend_requests_sender_receiver_unique UNIQUE (sender_id, receiver_id);
  END IF;
END $$;

-- Automatic updated_at trigger for friend_requests
CREATE OR REPLACE FUNCTION public.update_friend_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_friend_requests_updated_at ON public.friend_requests;
CREATE TRIGGER set_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_friend_requests_updated_at();

-- 10. Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Constraints for friends
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'friends_user_friend_check') THEN
    ALTER TABLE public.friends ADD CONSTRAINT friends_user_friend_check CHECK (user_id <> friend_id);
  END IF;
END $$;

-- Expression-based UNIQUE index for friends (Postgres unsupported in constraints)
CREATE UNIQUE INDEX IF NOT EXISTS friends_user_friend_unique_idx ON public.friends (LEAST(user_id, friend_id), GREATEST(user_id, friend_id));

-- 11. Additional Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON public.profiles(friend_code);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON public.friend_requests(receiver_id);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- 12. Enable RLS and idempotently create policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- PROFILES
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
  CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
  
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

  -- FRIEND REQUESTS
  DROP POLICY IF EXISTS "Users can view their own friend requests" ON public.friend_requests;
  CREATE POLICY "Users can view their own friend requests" ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

  DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_requests;
  CREATE POLICY "Users can send friend requests" ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);

  DROP POLICY IF EXISTS "Users can update friend requests they sent or received" ON public.friend_requests;
  CREATE POLICY "Users can update friend requests they sent or received" ON public.friend_requests FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

  -- FRIENDS
  DROP POLICY IF EXISTS "Users can view their friends" ON public.friends;
  CREATE POLICY "Users can view their friends" ON public.friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

  DROP POLICY IF EXISTS "Users can add friends" ON public.friends;
  CREATE POLICY "Users can add friends" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

  DROP POLICY IF EXISTS "Users can remove friends" ON public.friends;
  CREATE POLICY "Users can remove friends" ON public.friends FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

  DROP POLICY IF EXISTS "Users can delete friends" ON public.friends;
  CREATE POLICY "Users can delete friends" ON public.friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
END $$;

-- 13. Reload schema
NOTIFY pgrst, 'reload schema';
