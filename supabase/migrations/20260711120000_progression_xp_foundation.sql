BEGIN;

-- Phase 6.1: Progression Database Foundation & XP Ledger Stabilization

-- 1. Create Private Schema
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Revoke Schema Access from Clients
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

-- 3. Pre-check for Duplicate XP Reference IDs
-- We use the exact predicate: WHERE reference_id IS NOT NULL AND metadata ? 'xp_earned'
DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_duplicate_count
  FROM (
    SELECT user_id, type, reference_id
    FROM public.events
    WHERE reference_id IS NOT NULL AND metadata ? 'xp_earned'
    GROUP BY user_id, type, reference_id
    HAVING COUNT(*) > 1
  ) t;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: found % duplicate XP reference_id event groups in the database. Please resolve manually.', v_duplicate_count;
  END IF;
END $$;

-- 4. Create Partial Unique Index for Idempotency
CREATE UNIQUE INDEX IF NOT EXISTS events_xp_idempotency_idx 
  ON public.events(user_id, type, reference_id) 
  WHERE reference_id IS NOT NULL AND metadata ? 'xp_earned';

-- 5. Create the Shared XP Foundation Function (PRIVATE / INTERNAL)
--
-- Security Documentation:
-- - This function is explicitly owned by `postgres` to ensure trusted execution.
-- - Authenticated and anon clients cannot access the `private` schema or execute this function.
-- - Future SECURITY DEFINER domain RPCs must resolve `auth.uid()` themselves to determine the user.
-- - Trusted domain RPCs should be owned by `postgres` and call this internal helper using the schema-qualified name (`private.award_xp_internal`).
CREATE OR REPLACE FUNCTION private.award_xp_internal(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_event_type TEXT,
  p_event_category TEXT,
  p_reference_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_total_xp INTEGER;
  v_metadata JSONB;
  v_rows_updated INTEGER;
  
  v_event_type TEXT;
  v_event_category TEXT;
  v_reference_id TEXT;
BEGIN
  -- Normalize Inputs
  v_event_type := trim(p_event_type);
  v_event_category := trim(p_event_category);
  v_reference_id := trim(p_reference_id);

  -- Input Validations
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  IF p_xp_amount IS NULL OR p_xp_amount <= 0 THEN
    RAISE EXCEPTION 'XP amount must be positive. Received: %', p_xp_amount;
  END IF;

  -- Conservative upper bound. Future domain RPCs determine the actual XP 
  -- amount server-side and should use much smaller domain-specific limits.
  IF p_xp_amount > 10000 THEN
    RAISE EXCEPTION 'XP amount exceeds safety limit (10000). Received: %', p_xp_amount;
  END IF;

  IF v_event_type IS NULL OR length(v_event_type) = 0 OR length(v_event_type) > 100 THEN
    RAISE EXCEPTION 'Event type must be non-empty and maximum 100 characters';
  END IF;
  
  IF v_event_category IS NULL OR length(v_event_category) = 0 OR length(v_event_category) > 100 THEN
    RAISE EXCEPTION 'Event category must be non-empty and maximum 100 characters';
  END IF;

  IF v_reference_id IS NULL OR length(v_reference_id) = 0 OR length(v_reference_id) > 200 THEN
    RAISE EXCEPTION 'Reference ID must be non-empty and maximum 200 characters';
  END IF;

  -- Ensure profile exists
  PERFORM 1 FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  -- Canonicalize metadata
  -- The caller must not be able to override canonical values, so we apply them last.
  v_metadata := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'xp_earned', p_xp_amount,
    'xp_source', v_event_category
  );

  -- 1. Insert ledger event (Will fail atomically and rollback if idempotency index is violated)
  INSERT INTO public.events (user_id, type, category, reference_id, metadata, timestamp)
  VALUES (
    p_user_id, 
    v_event_type, 
    v_event_category, 
    v_reference_id, 
    v_metadata, 
    now()
  );

  -- 2. Atomically increment XP
  UPDATE public.profiles
  SET 
    xp = COALESCE(xp, 0) + p_xp_amount,
    updated_at = now()
  WHERE id = p_user_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated <> 1 THEN
    RAISE EXCEPTION 'Failed to update profile XP for user %', p_user_id;
  END IF;

  -- 3. Return authoritative total XP
  SELECT xp INTO v_total_xp FROM public.profiles WHERE id = p_user_id;
  
  RETURN v_total_xp;
END;
$$;

-- Explicitly enforce trusted ownership
ALTER FUNCTION private.award_xp_internal(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) OWNER TO postgres;

-- 6. Revoke Function Access from Clients
REVOKE ALL ON FUNCTION private.award_xp_internal(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.award_xp_internal(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION private.award_xp_internal(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM authenticated;

COMMIT;
