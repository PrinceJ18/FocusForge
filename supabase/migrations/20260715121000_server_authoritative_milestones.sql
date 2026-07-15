/*
  # Phase 6.5: Server-Authoritative Milestones

  1. New RPCs
    - `unlock_milestone(p_milestone_id text, p_title text, p_description text, p_category text)`
      - Authenticates user
      - Inserts event and prevents duplicate unlocks
      - Does not award XP
*/

CREATE OR REPLACE FUNCTION public.unlock_milestone(
    p_milestone_id text,
    p_title text,
    p_description text,
    p_category text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
    v_user_id uuid;
    v_already_unlocked boolean;
    v_event_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if already unlocked
    SELECT EXISTS (
        SELECT 1 FROM events 
        WHERE user_id = v_user_id 
        AND type = 'milestone_unlocked' 
        AND (
            reference_id = p_milestone_id 
            OR metadata->>'milestoneId' = p_milestone_id
        )
    ) INTO v_already_unlocked;

    IF v_already_unlocked THEN
        RETURN json_build_object(
            'milestone_id', p_milestone_id,
            'unlocked', true,
            'already_unlocked', true
        );
    END IF;

    v_event_id := gen_random_uuid();

    -- Insert authoritative event
    INSERT INTO events (
        id,
        user_id,
        type,
        category,
        reference_id,
        metadata
    ) VALUES (
        v_event_id,
        v_user_id,
        'milestone_unlocked',
        p_category,
        p_milestone_id,
        jsonb_build_object(
            'milestoneId', p_milestone_id,
            'milestoneTitle', p_title,
            'description', p_description
        )
    );

    RETURN json_build_object(
        'milestone_id', p_milestone_id,
        'unlocked', true,
        'already_unlocked', false,
        'event_id', v_event_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.unlock_milestone(text, text, text, text) FROM anon;
