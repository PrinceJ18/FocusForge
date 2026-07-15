/*
  # Phase 6.5: Server-Authoritative Daily Goals & Challenges

  1. New RPCs
    - `claim_daily_goal(p_goal_date date, p_amount int, p_goal_id text)`
      - Authenticates user
      - Awards XP using `private.award_xp_internal`
      - Uses idempotency key `daily_goal_<goal_id>_<date>`
    - `claim_daily_challenge(p_challenge_id text, p_challenge_date date, p_amount int)`
      - Authenticates user
      - Awards XP using `private.award_xp_internal`
      - Uses idempotency key `daily_challenge_<challenge>_<date>`
      - Updates `profiles.daily_challenge_claims`
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_challenge_claims jsonb DEFAULT '{"date": "", "claimed": []}'::jsonb;

-- 1. claim_daily_goal
CREATE OR REPLACE FUNCTION public.claim_daily_goal(
    p_goal_date date,
    p_goal_id text DEFAULT 'all',
    p_amount int DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
    v_user_id uuid;
    v_reference_id text;
    v_already_claimed boolean;
    v_xp_awarded int;
    v_total_xp int;
BEGIN
    -- Authenticate
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Idempotency key
    -- If p_goal_id is provided we use it, otherwise fallback to the date for the "all completed" one
    IF p_goal_id = 'all' THEN
        v_reference_id := 'daily_goal_' || to_char(p_goal_date, 'YYYY-MM-DD');
    ELSE
        v_reference_id := 'daily_goal_' || p_goal_id || '_' || to_char(p_goal_date, 'YYYY-MM-DD');
    END IF;

    -- Check if already claimed
    SELECT EXISTS (
        SELECT 1 FROM events 
        WHERE user_id = v_user_id 
        AND reference_id = v_reference_id
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        SELECT xp INTO v_total_xp FROM profiles WHERE id = v_user_id;
        RETURN json_build_object(
            'total_xp', v_total_xp,
            'xp_earned', 0,
            'already_claimed', true,
            'claimed', false
        );
    END IF;

    -- Award XP
    v_xp_awarded := private.award_xp_internal(
        v_user_id,
        p_amount,
        v_reference_id,
        'daily_goal',
        'goal_completed',
        jsonb_build_object(
            'goal_date', p_goal_date,
            'goal_id', p_goal_id,
            'xp_earned', p_amount,
            'xp_source', 'daily_goal'
        )
    );

    SELECT xp INTO v_total_xp FROM profiles WHERE id = v_user_id;

    RETURN json_build_object(
        'total_xp', v_total_xp,
        'xp_earned', v_xp_awarded,
        'already_claimed', false,
        'claimed', true
    );
END;
$$;

-- Revoke anon access
REVOKE EXECUTE ON FUNCTION public.claim_daily_goal(date, text, int) FROM anon;

-- 2. claim_daily_challenge
CREATE OR REPLACE FUNCTION public.claim_daily_challenge(
    p_challenge_id text,
    p_challenge_date date,
    p_amount int DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
    v_user_id uuid;
    v_reference_id text;
    v_already_claimed boolean;
    v_xp_awarded int;
    v_total_xp int;
    v_current_claims jsonb;
    v_claimed_array jsonb;
    v_new_claims jsonb;
    v_date_str text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_reference_id := 'daily_challenge_' || p_challenge_id || '_' || to_char(p_challenge_date, 'YYYY-MM-DD');

    SELECT EXISTS (
        SELECT 1 FROM events 
        WHERE user_id = v_user_id 
        AND reference_id = v_reference_id
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        SELECT xp INTO v_total_xp FROM profiles WHERE id = v_user_id;
        RETURN json_build_object(
            'total_xp', v_total_xp,
            'xp_earned', 0,
            'already_claimed', true,
            'claimed', false
        );
    END IF;

    -- Award XP
    v_xp_awarded := private.award_xp_internal(
        v_user_id,
        p_amount,
        v_reference_id,
        'daily_challenge',
        'challenge_completed',
        jsonb_build_object(
            'challenge_id', p_challenge_id,
            'challenge_date', p_challenge_date,
            'xp_earned', p_amount,
            'xp_source', 'daily_challenge'
        )
    );

    -- Update daily_challenge_claims
    v_date_str := to_char(p_challenge_date, 'YYYY-MM-DD');
    SELECT daily_challenge_claims INTO v_current_claims FROM profiles WHERE id = v_user_id;
    
    IF v_current_claims IS NULL OR (v_current_claims->>'date') IS DISTINCT FROM v_date_str THEN
        v_claimed_array := jsonb_build_array(p_challenge_id);
    ELSE
        v_claimed_array := COALESCE(v_current_claims->'claimed', '[]'::jsonb);
        IF NOT v_claimed_array ? p_challenge_id THEN
            v_claimed_array := v_claimed_array || to_jsonb(p_challenge_id);
        END IF;
    END IF;

    v_new_claims := jsonb_build_object('date', v_date_str, 'claimed', v_claimed_array);
    
    UPDATE profiles 
    SET daily_challenge_claims = v_new_claims
    WHERE id = v_user_id
    RETURNING xp INTO v_total_xp;

    RETURN json_build_object(
        'total_xp', v_total_xp,
        'xp_earned', v_xp_awarded,
        'already_claimed', false,
        'claimed', true
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_daily_challenge(text, date, int) FROM anon;

