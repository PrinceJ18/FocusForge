-- =============================================================================
-- SECURITY MIGRATION: Lock Down XP Event Ledger
-- =============================================================================
-- Phase 3 / Step 1 (Hardened)
-- Generated: 2026-11-07
-- Amended:   2026-11-07 — Added column-level privilege revocations and
--            comprehensive verification queries.
--
-- Purpose: Remove direct authenticated UPDATE and DELETE access to public.events
--          at every privilege layer: RLS policies, table-level grants, and
--          column-level grants.
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
-- Idempotency:
--   - DROP POLICY IF EXISTS is inherently idempotent.
--   - REVOKE is idempotent (revoking a non-existent privilege is a no-op).
--   - GRANT is idempotent (granting an existing privilege is a no-op).
--   - This migration is safe to run against any live database state, including
--     one where the policies have already been manually removed or where
--     column-level grants differ from migration history.
--
-- NON-DESTRUCTIVE: Does not modify any existing event records.
-- =============================================================================

BEGIN;

-- ████████████████████████████████████████████████████████████████████████████
-- STEP 1: Remove UPDATE and DELETE RLS policies on public.events
-- ████████████████████████████████████████████████████████████████████████████
-- These policies were created in 20260703185015_create_events_table.sql and
-- duplicated in 20260706161500_repair_missing_tables.sql.
-- No application feature requires direct UPDATE or DELETE on events.
-- Removing the DELETE policy closes the XP replay attack vector.
--
-- IF EXISTS ensures this step succeeds even if the policies were already
-- removed manually or never existed in the live database.

DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 2: Revoke table-level UPDATE and DELETE privileges
-- ████████████████████████████████████████████████████████████████████████████
-- Defense in depth: if RLS were ever accidentally disabled, these revocations
-- prevent UPDATE/DELETE from succeeding at the privilege layer.
--
-- We revoke from authenticated, anon, and PUBLIC. We do NOT revoke from
-- service_role or postgres, which retain full privileges by default and are
-- required for SECURITY DEFINER function execution and administrative tasks.
--
-- REVOKE is idempotent: revoking a privilege the role does not hold is a no-op.

REVOKE UPDATE ON public.events FROM authenticated;
REVOKE DELETE ON public.events FROM authenticated;

REVOKE UPDATE ON public.events FROM anon;
REVOKE DELETE ON public.events FROM anon;

REVOKE UPDATE ON public.events FROM PUBLIC;
REVOKE DELETE ON public.events FROM PUBLIC;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 3: Revoke column-level UPDATE privileges
-- ████████████████████████████████████████████████████████████████████████████
-- In PostgreSQL, column-level privileges are INDEPENDENT of table-level
-- privileges. A table-level REVOKE UPDATE does NOT remove column-level grants.
-- If any column-level UPDATE grant exists (from Supabase defaults, manual
-- Dashboard changes, or any source not visible in migration history), it
-- would allow UPDATE on those specific columns even after Step 2.
--
-- We defensively revoke UPDATE on every column of public.events for the
-- three client-facing roles. This is a no-op if no column-level grants exist.
--
-- Columns: id, user_id, timestamp, type, category, reference_id, metadata
-- (as defined in 20260703185015_create_events_table.sql)
--
-- Note: PostgreSQL does not support column-level DELETE privileges (DELETE
-- operates on whole rows), so column-level DELETE revocation is not needed.

REVOKE UPDATE (id, user_id, "timestamp", type, category, reference_id, metadata)
  ON public.events FROM authenticated;

REVOKE UPDATE (id, user_id, "timestamp", type, category, reference_id, metadata)
  ON public.events FROM anon;

REVOKE UPDATE (id, user_id, "timestamp", type, category, reference_id, metadata)
  ON public.events FROM PUBLIC;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 4: Preserve required SELECT and INSERT privileges
-- ████████████████████████████████████████████████████████████████████████████
-- Supabase automatically grants SELECT and INSERT on public schema tables to
-- authenticated via the default role grants. We explicitly ensure these are
-- present in case any prior migration or manual change removed them.
--
-- These GRANTs are a no-op if the privileges already exist.

GRANT SELECT ON public.events TO authenticated;
GRANT INSERT ON public.events TO authenticated;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 5: Reload PostgREST schema cache
-- ████████████████████████████████████████████████████████████████████████████
-- Required so PostgREST picks up the policy and privilege changes immediately
-- without waiting for the next automatic cache refresh.

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =============================================================================
-- Run these queries in the Supabase SQL Editor AFTER applying the migration.
-- They are SELECT-only and do not modify any data or schema.
-- =============================================================================
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V1. RLS Policy Audit                                                   │
-- │ Expected: Exactly 2 rows — SELECT and INSERT policies only.            │
-- │ No UPDATE or DELETE policy should be present.                          │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT policyname, cmd, permissive, roles, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'events'
--   ORDER BY cmd, policyname;
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V2. Table-Level Privilege Audit                                        │
-- │ Expected: authenticated has SELECT and INSERT only.                    │
-- │ No UPDATE or DELETE for authenticated, anon, or PUBLIC.                │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT grantee, privilege_type, is_grantable
--   FROM information_schema.table_privileges
--   WHERE table_schema = 'public'
--     AND table_name = 'events'
--     AND grantee IN ('authenticated', 'anon', 'PUBLIC')
--   ORDER BY grantee, privilege_type;
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V3. Column-Level Privilege Audit                                       │
-- │ Expected: No UPDATE rows for authenticated, anon, or PUBLIC.           │
-- │ SELECT and INSERT column privileges may appear (this is normal).       │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT grantee, column_name, privilege_type
--   FROM information_schema.column_privileges
--   WHERE table_schema = 'public'
--     AND table_name = 'events'
--     AND privilege_type = 'UPDATE'
--     AND grantee IN ('authenticated', 'anon', 'PUBLIC')
--   ORDER BY grantee, column_name;
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V4. Effective Privilege Check (has_table_privilege)                     │
-- │ Expected: authenticated has SELECT=true, INSERT=true,                  │
-- │           UPDATE=false, DELETE=false.                                   │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT
--     has_table_privilege('authenticated', 'public.events', 'SELECT')  AS can_select,
--     has_table_privilege('authenticated', 'public.events', 'INSERT')  AS can_insert,
--     has_table_privilege('authenticated', 'public.events', 'UPDATE')  AS can_update,
--     has_table_privilege('authenticated', 'public.events', 'DELETE')  AS can_delete;
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V5. Effective Column-Level Privilege Check (has_column_privilege)       │
-- │ Expected: All columns return UPDATE=false for authenticated.           │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT
--     has_column_privilege('authenticated', 'public.events', 'id',           'UPDATE') AS id_update,
--     has_column_privilege('authenticated', 'public.events', 'user_id',      'UPDATE') AS user_id_update,
--     has_column_privilege('authenticated', 'public.events', 'timestamp',    'UPDATE') AS timestamp_update,
--     has_column_privilege('authenticated', 'public.events', 'type',         'UPDATE') AS type_update,
--     has_column_privilege('authenticated', 'public.events', 'category',     'UPDATE') AS category_update,
--     has_column_privilege('authenticated', 'public.events', 'reference_id', 'UPDATE') AS reference_id_update,
--     has_column_privilege('authenticated', 'public.events', 'metadata',     'UPDATE') AS metadata_update;
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V6. SECURITY DEFINER Function Integrity Check                          │
-- │ Expected: award_xp_internal owned by postgres with prosecdef=true.     │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT n.nspname AS schema, p.proname AS function, p.proowner::regrole AS owner, p.prosecdef AS security_definer
--   FROM pg_proc p
--   JOIN pg_namespace n ON p.pronamespace = n.oid
--   WHERE p.proname = 'award_xp_internal';
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V7. Event Record Integrity Check                                       │
-- │ Expected: Non-zero count confirming no records were deleted.           │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT COUNT(*) AS total_events FROM public.events;
--
-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
