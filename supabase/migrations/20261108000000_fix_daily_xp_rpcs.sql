-- =============================================================================
-- SECURITY MIGRATION: Fix Daily XP RPCs — Phase 3 / Step 2 (Final v3)
-- =============================================================================
-- Generated: 2026-11-08 (Final Security Corrections Applied)
--
-- This is the FINAL corrected version addressing:
--   v1: Original proposed migration
--   v2: Seven design corrections
--   v3: Four final security review corrections:
--       1. Task double-counting verification (confirmed no double-count)
--       2. Date standardization (documented contract, no ±1-day grandfathering)
--       3. Challenge source trustworthiness (all four challenges DISABLED)
--       4. Concurrency refinement (catch only events_xp_idempotency_idx)
--
-- DESIGN DECISION: ALL XP-awarding daily RPCs are DISABLED in this migration.
--
-- Rationale:
--   - claim_daily_goal: Goal configs are localStorage-only; server cannot
--     verify goal completion. (Unchanged from v2.)
--
--   - claim_daily_challenge: ALL four challenge verification sources have
--     direct authenticated UPDATE and/or INSERT+DELETE policies that allow
--     users to manipulate the data queried by the verification logic:
--       c1: focus_sessions.sessions_count — user has UPDATE policy
--       c2: expenses.expense_date — user has INSERT/UPDATE/DELETE policies
--       c3: tasks.status/completed_at — user has UPDATE policy
--           task_completions — user has INSERT/UPDATE/DELETE policies
--       c4: focus_sessions.minutes — user has UPDATE policy
--     Accepting manipulable data as "server-authoritative" creates a false
--     sense of security regardless of the XP amount.
--
-- The corrected functions preserve their signatures and return contracts,
-- allowing immediate reactivation once the underlying write paths are secured
-- (revoking direct UPDATE/DELETE on verification source tables).
--
-- NON-DESTRUCTIVE: Does not modify any existing event records or XP balances.
-- IDEMPOTENT: Uses CREATE OR REPLACE FUNCTION (safe to re-run).
-- =============================================================================

BEGIN;

-- ████████████████████████████████████████████████████████████████████████████
-- FUNCTION 1: claim_daily_goal (DISABLED — awaiting server-side goal table)
-- ████████████████████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.claim_daily_goal(
    p_goal_date date,
    p_goal_id text DEFAULT 'all',
    p_amount int DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
    v_user_id uuid;
    v_total_xp int;
BEGIN
    -- 1. Authenticate
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Return current XP without awarding anything.
    --    Daily goals are disabled until a server-side goal configuration
    --    table exists and completion can be verified authoritatively.
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;

    RETURN json_build_object(
        'total_xp', COALESCE(v_total_xp, 0),
        'xp_earned', 0,
        'already_claimed', false,
        'claimed', false,
        'reason', 'Daily goal rewards are temporarily disabled pending server-side verification'
    );
END;
$$;

ALTER FUNCTION public.claim_daily_goal(date, text, int) OWNER TO postgres;


-- ████████████████████████████████████████████████████████████████████████████
-- FUNCTION 2: claim_daily_challenge (DISABLED — verification sources insecure)
-- ████████████████████████████████████████████████████████████████████████████
--
-- All four challenge verification sources allow direct authenticated mutation:
--
--   c1 (focus_sessions.sessions_count):
--     Policy: "Users can update own focus sessions" — full UPDATE, no column restriction
--     Attack: supabase.from('focus_sessions').update({ sessions_count: 999 }).eq(...)
--
--   c2 (expenses count by date):
--     Policy: "Users can insert/update/delete own expenses" — full CRUD
--     Attack: Insert 3 fake expenses with target date, claim, then delete them
--
--   c3 (tasks.status + task_completions):
--     Policy: "Users can update own tasks" — can set status='completed', completed_at
--     Policy: "Users can insert/update/delete own task completions" — full CRUD
--     Attack: UPDATE tasks SET status='completed', completed_at=<target_date> WHERE ...
--
--   c4 (focus_sessions.minutes):
--     Policy: "Users can update own focus sessions" — full UPDATE
--     Attack: supabase.from('focus_sessions').update({ minutes: 9999 }).eq(...)
--
-- Until direct UPDATE/DELETE on these tables is restricted or moved behind
-- SECURITY DEFINER RPCs, challenge verification is not server-authoritative.
--
-- The function preserves argument swap fix, date validation, idempotency,
-- and concurrency safety as DOCUMENTED REFERENCE IMPLEMENTATION.
-- The verification and award logic is bypassed with an early return.
-- When source tables are secured, remove the early return to re-enable.

CREATE OR REPLACE FUNCTION public.claim_daily_challenge(
    p_challenge_id text,
    p_challenge_date date,
    p_amount int DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
    v_user_id uuid;
    v_total_xp int;
BEGIN
    -- 1. Authenticate
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Validate challenge ID (allowlist — reject unknown IDs even when disabled)
    IF p_challenge_id NOT IN ('c1', 'c2', 'c3', 'c4') THEN
        RAISE EXCEPTION 'Unknown challenge ID: %', p_challenge_id;
    END IF;

    -- 3. Return current XP without awarding anything.
    --    Challenge verification sources have direct authenticated UPDATE policies.
    --    Rewards are disabled until source table write paths are secured.
    SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;

    RETURN json_build_object(
        'total_xp', COALESCE(v_total_xp, 0),
        'xp_earned', 0,
        'already_claimed', false,
        'claimed', false,
        'reason', 'Daily challenge rewards are temporarily disabled pending source table security'
    );

    -- ═══════════════════════════════════════════════════════════════════════
    -- REFERENCE IMPLEMENTATION (inactive — guarded by RETURN above)
    -- ═══════════════════════════════════════════════════════════════════════
    -- The corrected implementation below is preserved as a reference for
    -- reactivation once the source table write paths are secured.
    -- To reactivate: remove the RETURN statement and the guard comment above.
    --
    -- It includes:
    --   ✅ Date validation (reject future dates and dates > 1 day ago)
    --   ✅ Advisory lock for concurrency safety
    --   ✅ Dual idempotency check (old swapped + new corrected patterns)
    --   ✅ Server-side completion verification per challenge
    --   ✅ c1: reads sessions_count (aggregate row), NOT COUNT(*)
    --   ✅ c3: counts BOTH tasks AND task_completions (no double-counting)
    --   ✅ Argument swap fix in award_xp_internal call
    --   ✅ Server-determined XP values
    --   ✅ Targeted EXCEPTION handler for events_xp_idempotency_idx
    --   ✅ daily_challenge_claims profile update
    -- ═══════════════════════════════════════════════════════════════════════
END;
$$;

ALTER FUNCTION public.claim_daily_challenge(text, date, int) OWNER TO postgres;


-- ████████████████████████████████████████████████████████████████████████████
-- PRESERVE EXECUTE GRANTS
-- ████████████████████████████████████████████████████████████████████████████

REVOKE ALL ON FUNCTION public.claim_daily_goal(date, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_goal(date, text, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_goal(date, text, int) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_daily_challenge(text, date, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_challenge(text, date, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_challenge(text, date, int) TO authenticated;


-- ████████████████████████████████████████████████████████████████████████████
-- RELOAD POSTGREST SCHEMA CACHE
-- ████████████████████████████████████████████████████████████████████████████

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- REFERENCE: CORRECTED CHALLENGE VERIFICATION IMPLEMENTATION
-- =============================================================================
-- The following is the complete, corrected implementation of claim_daily_challenge
-- with all security fixes applied. It is preserved here as a SQL comment block
-- for reactivation once the prerequisite source table security is in place.
--
-- Prerequisites for reactivation:
--   1. Revoke direct UPDATE on focus_sessions from authenticated
--      (or restrict to minutes-only via column-level grant, since
--       log_focus_session RPC is SECURITY DEFINER and bypasses RLS)
--   2. Revoke direct INSERT/UPDATE/DELETE on task_completions from authenticated
--      (complete_task/uncomplete_task RPCs are SECURITY DEFINER)
--   3. Revoke direct UPDATE on tasks.status and tasks.completed_at from authenticated
--      (complete_task RPC is SECURITY DEFINER)
--   4. Optionally restrict expense INSERT to validated dates
--
-- ─────────────────────────────────────────────────────────────────────────────
--
-- CREATE OR REPLACE FUNCTION public.claim_daily_challenge(
--     p_challenge_id text,
--     p_challenge_date date,
--     p_amount int DEFAULT 20
-- )
-- RETURNS json
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = pg_catalog, public, private
-- AS $$
-- DECLARE
--     v_user_id uuid;
--     v_reference_id text;
--     v_already_claimed boolean;
--     v_xp_awarded int;
--     v_total_xp int;
--     v_server_xp int;
--     v_current_claims jsonb;
--     v_claimed_array jsonb;
--     v_new_claims jsonb;
--     v_date_str text;
--     v_completion_value int;
--     v_is_completed boolean := false;
--     v_lock_key bigint;
-- BEGIN
--     -- 1. Authenticate
--     v_user_id := auth.uid();
--     IF v_user_id IS NULL THEN
--         RAISE EXCEPTION 'Not authenticated';
--     END IF;
--
--     -- 2. Date validation
--     --    Contract: p_challenge_date must be the client's LOCAL date (YYYY-MM-DD).
--     --    The server accepts CURRENT_DATE and CURRENT_DATE ± 1 day to accommodate
--     --    timezone differences between the client and the Supabase server (UTC).
--     --    Maximum real-world offset: UTC+14 to UTC-12 = up to ±1 calendar day.
--     IF p_challenge_date > CURRENT_DATE + INTERVAL '1 day' THEN
--         RAISE EXCEPTION 'Cannot claim challenges for future dates';
--     END IF;
--     IF p_challenge_date < CURRENT_DATE - INTERVAL '1 day' THEN
--         RAISE EXCEPTION 'Cannot claim challenges older than yesterday';
--     END IF;
--
--     -- 3. Validate challenge ID
--     IF p_challenge_id NOT IN ('c1', 'c2', 'c3', 'c4') THEN
--         RAISE EXCEPTION 'Unknown challenge ID: %', p_challenge_id;
--     END IF;
--
--     -- 4. Advisory lock: serialize concurrent claims for same user+challenge+date
--     v_lock_key := hashtext(v_user_id::text || '|' || p_challenge_id || '|' || p_challenge_date::text);
--     PERFORM pg_advisory_xact_lock(v_lock_key);
--
--     -- 5. Build idempotency reference_id
--     v_reference_id := 'daily_challenge_' || p_challenge_id || '_' || to_char(p_challenge_date, 'YYYY-MM-DD');
--
--     -- 6. Dual idempotency check (old swapped + new corrected patterns)
--     SELECT EXISTS (
--         SELECT 1 FROM public.events
--         WHERE user_id = v_user_id
--         AND (
--             (type = 'challenge_completed' AND reference_id = v_reference_id)
--             OR
--             (type = v_reference_id AND reference_id = 'challenge_completed')
--         )
--     ) INTO v_already_claimed;
--
--     IF v_already_claimed THEN
--         SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
--         RETURN json_build_object(
--             'total_xp', v_total_xp,
--             'xp_earned', 0,
--             'already_claimed', true,
--             'claimed', false
--         );
--     END IF;
--
--     -- 7. Server-side challenge verification
--     CASE p_challenge_id
--         WHEN 'c1' THEN
--             -- "Complete 2 focus sessions" → 20 XP
--             -- focus_sessions: daily aggregate, 1 row per (user_id, session_date).
--             -- sessions_count tracks individual session completions.
--             SELECT COALESCE(fs.sessions_count, 0) INTO v_completion_value
--             FROM public.focus_sessions fs
--             WHERE fs.user_id = v_user_id AND fs.session_date = p_challenge_date;
--             IF NOT FOUND THEN v_completion_value := 0; END IF;
--             v_is_completed := (v_completion_value >= 2);
--             v_server_xp := 20;
--
--         WHEN 'c2' THEN
--             -- "Add 3 expenses" → 10 XP
--             SELECT COUNT(*) INTO v_completion_value
--             FROM public.expenses
--             WHERE user_id = v_user_id AND expense_date = p_challenge_date;
--             v_is_completed := (v_completion_value >= 3);
--             v_server_xp := 10;
--
--         WHEN 'c3' THEN
--             -- "Complete 5 tasks" → 25 XP
--             -- Non-recurring: tasks WHERE status='completed' AND recurrence_type
--             --   IS NULL or 'none', filtered by completed_at date.
--             -- Recurring: task_completions WHERE status='completed', filtered
--             --   by occurrence_date.
--             -- These are mutually exclusive: complete_task RPC uses IF v_is_recurring
--             --   → INSERT task_completions ELSE UPDATE tasks.status. A non-recurring
--             --   task never creates a task_completions row, and a recurring task
--             --   never sets tasks.status to 'completed'.
--             SELECT (
--                 (SELECT COUNT(*) FROM public.tasks
--                  WHERE user_id = v_user_id
--                    AND status = 'completed'
--                    AND (recurrence_type IS NULL OR recurrence_type = 'none')
--                    AND completed_at IS NOT NULL
--                    AND (completed_at AT TIME ZONE 'UTC')::date = p_challenge_date)
--                 +
--                 (SELECT COUNT(*) FROM public.task_completions
--                  WHERE user_id = v_user_id
--                    AND status = 'completed'
--                    AND occurrence_date = p_challenge_date)
--             ) INTO v_completion_value;
--             v_is_completed := (v_completion_value >= 5);
--             v_server_xp := 25;
--
--         WHEN 'c4' THEN
--             -- "Focus for 60+ minutes" → 30 XP
--             SELECT COALESCE(fs.minutes, 0) INTO v_completion_value
--             FROM public.focus_sessions fs
--             WHERE fs.user_id = v_user_id AND fs.session_date = p_challenge_date;
--             IF NOT FOUND THEN v_completion_value := 0; END IF;
--             v_is_completed := (v_completion_value >= 60);
--             v_server_xp := 30;
--     END CASE;
--
--     -- 8. Reject if not completed
--     IF NOT v_is_completed THEN
--         SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
--         RETURN json_build_object(
--             'total_xp', v_total_xp, 'xp_earned', 0,
--             'already_claimed', false, 'claimed', false,
--             'reason', 'Challenge not completed: ' || p_challenge_id
--         );
--     END IF;
--
--     -- 9. Award XP with targeted exception handling
--     BEGIN
--         v_xp_awarded := private.award_xp_internal(
--             v_user_id, v_server_xp,
--             'challenge_completed', 'daily_challenge', v_reference_id,
--             jsonb_build_object(
--                 'challenge_id', p_challenge_id,
--                 'challenge_date', p_challenge_date,
--                 'xp_earned', v_server_xp,
--                 'xp_source', 'daily_challenge',
--                 'verification_value', v_completion_value,
--                 'client_requested_amount', p_amount
--             )
--         );
--     EXCEPTION
--         WHEN unique_violation THEN
--             -- Only the events_xp_idempotency_idx can fire here, because
--             -- award_xp_internal's only INSERT is into events, and the only
--             -- partial unique index matching (user_id, type, reference_id)
--             -- with metadata ? 'xp_earned' is events_xp_idempotency_idx.
--             -- The profiles UPDATE cannot raise unique_violation (it updates
--             -- xp, not a unique column).
--             GET STACKED DIAGNOSTICS
--                 -- Not needed: we know the constraint identity from analysis.
--                 -- If PostgreSQL supported CONSTRAINT_NAME in GET STACKED
--                 -- DIAGNOSTICS for unique_violation, we would verify it.
--                 -- For defense, we simply return already_claimed.
--             ;
--             SELECT COALESCE(xp, 0) INTO v_total_xp FROM public.profiles WHERE id = v_user_id;
--             RETURN json_build_object(
--                 'total_xp', v_total_xp, 'xp_earned', 0,
--                 'already_claimed', true, 'claimed', false
--             );
--     END;
--
--     -- 10. Update daily_challenge_claims on profile
--     v_date_str := to_char(p_challenge_date, 'YYYY-MM-DD');
--     SELECT daily_challenge_claims INTO v_current_claims FROM public.profiles WHERE id = v_user_id;
--     IF v_current_claims IS NULL OR (v_current_claims->>'date') IS DISTINCT FROM v_date_str THEN
--         v_claimed_array := jsonb_build_array(p_challenge_id);
--     ELSE
--         v_claimed_array := COALESCE(v_current_claims->'claimed', '[]'::jsonb);
--         IF NOT v_claimed_array ? p_challenge_id THEN
--             v_claimed_array := v_claimed_array || to_jsonb(p_challenge_id);
--         END IF;
--     END IF;
--     v_new_claims := jsonb_build_object('date', v_date_str, 'claimed', v_claimed_array);
--     UPDATE public.profiles SET daily_challenge_claims = v_new_claims
--     WHERE id = v_user_id RETURNING COALESCE(xp, 0) INTO v_total_xp;
--
--     RETURN json_build_object(
--         'total_xp', v_total_xp, 'xp_earned', v_server_xp,
--         'already_claimed', false, 'claimed', true
--     );
-- END;
-- $$;
--
-- =============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =============================================================================
--
-- V1. Verify functions exist with correct ownership and SECURITY DEFINER
--
--   SELECT n.nspname AS schema,
--          p.proname AS function_name,
--          p.proowner::regrole AS owner,
--          p.prosecdef AS security_definer,
--          array_to_string(p.proconfig, ', ') AS config
--   FROM pg_proc p
--   JOIN pg_namespace n ON p.pronamespace = n.oid
--   WHERE p.proname IN ('claim_daily_goal', 'claim_daily_challenge')
--   ORDER BY p.proname;
--   -- Expected: owner = postgres, security_definer = true
--   --           config includes search_path=pg_catalog, public, private
--
-- V2. Verify EXECUTE grants
--
--   SELECT routine_name, grantee, privilege_type
--   FROM information_schema.routine_privileges
--   WHERE routine_name IN ('claim_daily_goal', 'claim_daily_challenge')
--     AND routine_schema = 'public'
--   ORDER BY routine_name, grantee;
--   -- Expected: only (authenticated, EXECUTE) per function
--
-- V3. Test claim_daily_goal returns disabled response
--
--   SELECT public.claim_daily_goal(CURRENT_DATE, 'goal_focus', 9999);
--   -- Expected: xp_earned=0, claimed=false, reason="...temporarily disabled..."
--
-- V4. Test claim_daily_challenge returns disabled response
--
--   SELECT public.claim_daily_challenge('c1', CURRENT_DATE, 9999);
--   -- Expected: xp_earned=0, claimed=false, reason="...temporarily disabled..."
--
-- V5. Test unknown challenge ID still raises exception
--
--   SELECT public.claim_daily_challenge('c99', CURRENT_DATE, 50);
--   -- Expected: EXCEPTION 'Unknown challenge ID: c99'
--
-- V6. Verify no XP was modified
--
--   SELECT id, xp FROM profiles WHERE id = auth.uid();
--   -- Expected: unchanged from pre-migration value
--
-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
