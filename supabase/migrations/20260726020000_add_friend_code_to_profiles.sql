-- ============================================================
-- Productivity Arena — Milestone 2 Friends System
-- Migration: 20260726020000_add_friend_code_to_profiles.sql
-- ============================================================

-- 1. ADD friend_code TO PROFILES
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;

-- 2. FUNCTION TO GENERATE RANDOM 6-CHAR ALPHANUMERIC FRIEND CODE
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
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = result) INTO code_exists;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGER FUNCTION TO AUTO-SET FRIEND CODE ON INSERT
CREATE OR REPLACE FUNCTION auto_set_friend_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.friend_code IS NULL OR NEW.friend_code = '' THEN
        NEW.friend_code := generate_unique_friend_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_set_friend_code ON public.profiles;

CREATE TRIGGER trg_auto_set_friend_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION auto_set_friend_code();

-- 4. AUTO-POPULATE FRIEND CODES FOR EXISTING PROFILES
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id FROM public.profiles WHERE friend_code IS NULL OR friend_code = '' LOOP
        UPDATE public.profiles
        SET friend_code = generate_unique_friend_code()
        WHERE id = rec.id;
    END LOOP;
END $$;

-- 5. INDEX FOR FAST CASE-INSENSITIVE SEARCH
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON public.profiles(upper(friend_code));
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING btree (display_name);
