-- =============================================================================
-- SECURITY MIGRATION: Lock Down XP Event Ledger
-- =============================================================================
-- Phase 3 / Step 1
-- Generated: 2026-11-07
--
-- Purpose: Remove direct authenticated UPDATE and DELETE access to public.events.
--
-- Rationale:
--   The events table serves as the immutable XP ledger for the application.
--   XP-awarding SECURITY DEFINER functions (owned by postgres) INSERT ledger
--   events and use the events_xp_idempotency_idx unique index to prevent
--   duplicate awards. If authenticated users can DELETE their own events,
--   they can remove idempotency records and trigger unlimited XP re-awards.
--   UPDATE access allows tampering with event metadata and reference_ids.
--
-- Phase 2A verification confirmed:
--   - Zero frontend .update() or .delete() calls target the events table
--   - All legitimate writes are INSERT (logEvent in events.ts:254)
--   - All server-side writes are INSERT inside SECURITY DEFINER functions
--   - SELECT and INSERT policies remain unchanged
--
-- SAFE TO RUN MULTIPLE TIMES: Uses DROP POLICY IF EXISTS throughout.
-- NON-DESTRUCTIVE: Does not modify any existing event records.
-- =============================================================================

BEGIN;

-- ████████████████████████████████████████████████████████████████████████████
-- STEP 1: Remove the UPDATE policy on public.events
-- ████████████████████████████████████████████████████████████████████████████
-- This policy was created in 20260703185015_create_events_table.sql and
-- duplicated in 20260706161500_repair_missing_tables.sql.
-- No application feature requires direct UPDATE on events.

DROP POLICY IF EXISTS "Users can update own events" ON public.events;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 2: Remove the DELETE policy on public.events
-- ████████████████████████████████████████████████████████████████████████████
-- This policy was created in the same two migrations.
-- No application feature requires direct DELETE on events.
-- Removing this policy closes the XP replay attack vector.

DROP POLICY IF EXISTS "Users can delete own events" ON public.events;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 3: Revoke table-level UPDATE and DELETE privileges from roles
-- ████████████████████████████████████████████████████████████████████████████
-- Even without RLS policies, table-level privileges should be revoked for
-- defense in depth. If RLS were ever accidentally disabled, these revocations
-- prevent UPDATE/DELETE from succeeding.
--
-- We revoke from authenticated, anon, and PUBLIC. We do NOT revoke from
-- service_role or postgres, which retain full privileges by default and are
-- required for SECURITY DEFINER function execution and administrative tasks.

REVOKE UPDATE ON public.events FROM authenticated;
REVOKE DELETE ON public.events FROM authenticated;

REVOKE UPDATE ON public.events FROM anon;
REVOKE DELETE ON public.events FROM anon;

-- PUBLIC is the implicit default grant target in PostgreSQL. Revoking from
-- PUBLIC ensures no future role inherits UPDATE/DELETE on events.
REVOKE UPDATE ON public.events FROM PUBLIC;
REVOKE DELETE ON public.events FROM PUBLIC;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 4: Verify that SELECT and INSERT privileges are preserved
-- ████████████████████████████████████████████████████████████████████████████
-- Supabase automatically grants SELECT and INSERT on public schema tables to
-- authenticated via the default role grants. We explicitly ensure these are
-- present in case any prior migration or manual change removed them.

GRANT SELECT ON public.events TO authenticated;
GRANT INSERT ON public.events TO authenticated;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 5: Reload PostgREST schema cache
-- ████████████████████████████████████████████████████████████████████████████
-- Required so PostgREST picks up the policy and privilege changes immediately.

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
-- After applying this migration, verify:
--   ✅ SELECT * FROM pg_policies WHERE tablename = 'events';
--      → Should show only "Users can view own events" and "Users can insert own events"
--   ✅ SELECT grantee, privilege_type FROM information_schema.table_privileges
--      WHERE table_name = 'events' AND table_schema = 'public';
--      → authenticated should have SELECT, INSERT only (no UPDATE, DELETE)
--   ✅ All XP-awarding RPCs continue to function (SECURITY DEFINER bypasses RLS)
--   ✅ Frontend event hydration and logEvent() continue to function
-- =============================================================================

