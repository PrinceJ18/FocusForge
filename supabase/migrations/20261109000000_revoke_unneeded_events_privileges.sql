-- =============================================================================
-- SECURITY MIGRATION: Revoke Unneeded Privileges on XP Event Ledger
-- =============================================================================
-- Phase 3 / Step 1A
-- Generated: 2026-11-09
--
-- Purpose: Remove TRUNCATE, REFERENCES, and TRIGGER privileges on public.events
--          from client-facing roles (authenticated, anon, PUBLIC).
--
-- Context:
--   Supabase's default ALTER DEFAULT PRIVILEGES grants ALL on public schema
--   tables to anon and authenticated when tables are created by the postgres
--   role. This includes TRUNCATE, REFERENCES, and TRIGGER — privileges that
--   are never needed by application users.
--
--   Phase 3 / Step 1 (20261107000000) correctly revoked UPDATE and DELETE
--   to protect the XP ledger from replay attacks. This follow-up migration
--   completes the privilege lockdown by revoking the remaining unnecessary
--   table-level privileges.
--
-- Risk analysis:
--   TRUNCATE:   Bypasses RLS entirely. Could wipe the events table, destroying
--               all XP history and idempotency records. Not exposed by PostgREST
--               but violates least privilege.
--   REFERENCES: Allows creating foreign keys referencing events. Requires CREATE
--               TABLE privilege (which authenticated lacks), but the grant is
--               unnecessary.
--   TRIGGER:    Allows creating triggers on events. Requires CREATE privilege on
--               the schema and ability to create functions (which authenticated
--               lacks), but the grant is unnecessary.
--
-- Application impact: NONE
--   - Zero SQL TRUNCATE usage in any application file.
--   - Zero user-created triggers on public.events.
--   - Zero foreign keys referencing public.events from other tables.
--   - Confirmed by codebase search across all .ts, .tsx, and .sql files.
--
-- NON-DESTRUCTIVE: Does not modify any existing event records or XP balances.
-- IDEMPOTENT: REVOKE is a no-op if the privilege does not exist.
-- =============================================================================

BEGIN;

-- ████████████████████████████████████████████████████████████████████████████
-- STEP 1: Revoke TRUNCATE on public.events
-- ████████████████████████████████████████████████████████████████████████████
-- TRUNCATE bypasses RLS and removes all rows without per-row policy checks.
-- While PostgREST does not expose TRUNCATE operations, the privilege should
-- not exist on the immutable XP ledger under any circumstances.

REVOKE TRUNCATE ON public.events FROM authenticated;
REVOKE TRUNCATE ON public.events FROM anon;
REVOKE TRUNCATE ON public.events FROM PUBLIC;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 2: Revoke REFERENCES on public.events
-- ████████████████████████████████████████████████████████████████████████████
-- REFERENCES allows a role to create foreign keys that reference this table.
-- No application table references events, and authenticated users cannot
-- create tables on Supabase. Removing this privilege is defense in depth.

REVOKE REFERENCES ON public.events FROM authenticated;
REVOKE REFERENCES ON public.events FROM anon;
REVOKE REFERENCES ON public.events FROM PUBLIC;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 3: Revoke TRIGGER on public.events
-- ████████████████████████████████████████████████████████████████████████████
-- TRIGGER allows a role to create triggers on this table. No user-created
-- triggers exist on events, and authenticated users cannot create functions
-- on Supabase. Removing this privilege is defense in depth.

REVOKE TRIGGER ON public.events FROM authenticated;
REVOKE TRIGGER ON public.events FROM anon;
REVOKE TRIGGER ON public.events FROM PUBLIC;


-- ████████████████████████████████████████████████████████████████████████████
-- STEP 4: Reload PostgREST schema cache
-- ████████████████████████████████████████████████████████████████████████████
-- PostgREST caches table privilege metadata. While these specific privileges
-- do not affect PostgREST's exposed operations (it does not expose TRUNCATE,
-- REFERENCES, or TRIGGER), reloading ensures a consistent cache state.

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- PRE-APPLICATION VERIFICATION QUERIES
-- =============================================================================
-- Run these queries in the Supabase SQL Editor BEFORE applying the migration.
-- They are SELECT-only and do not modify any data or schema.
-- =============================================================================
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Q1. Current Table-Level Privileges on public.events                    │
-- │ Expected BEFORE migration: TRUNCATE, REFERENCES, TRIGGER present      │
-- │ for authenticated and/or anon.                                        │
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
-- │ Q2. Effective Privilege Check (has_table_privilege) — BEFORE           │
-- │ Expected: TRUNCATE=true, REFERENCES=true, TRIGGER=true                │
-- │ (confirming the privileges exist and need revocation)                  │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT
--     'authenticated' AS role,
--     has_table_privilege('authenticated', 'public.events', 'SELECT')     AS can_select,
--     has_table_privilege('authenticated', 'public.events', 'INSERT')     AS can_insert,
--     has_table_privilege('authenticated', 'public.events', 'UPDATE')     AS can_update,
--     has_table_privilege('authenticated', 'public.events', 'DELETE')     AS can_delete,
--     has_table_privilege('authenticated', 'public.events', 'TRUNCATE')   AS can_truncate,
--     has_table_privilege('authenticated', 'public.events', 'REFERENCES') AS can_references,
--     has_table_privilege('authenticated', 'public.events', 'TRIGGER')    AS can_trigger
--   UNION ALL
--   SELECT
--     'anon',
--     has_table_privilege('anon', 'public.events', 'SELECT'),
--     has_table_privilege('anon', 'public.events', 'INSERT'),
--     has_table_privilege('anon', 'public.events', 'UPDATE'),
--     has_table_privilege('anon', 'public.events', 'DELETE'),
--     has_table_privilege('anon', 'public.events', 'TRUNCATE'),
--     has_table_privilege('anon', 'public.events', 'REFERENCES'),
--     has_table_privilege('anon', 'public.events', 'TRIGGER');
--
--   -- Record the results for post-migration comparison.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Q3. Event Record Count Snapshot                                        │
-- │ Record this value for post-migration comparison (V3).                 │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT COUNT(*) AS total_events FROM public.events;
--
--
-- =============================================================================
-- POST-APPLICATION VERIFICATION QUERIES
-- =============================================================================
-- Run these queries AFTER applying the migration to confirm correctness.
-- =============================================================================
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V1. Table-Level Privileges — AFTER                                     │
-- │ Expected: Only SELECT and INSERT for authenticated.                    │
-- │ No UPDATE, DELETE, TRUNCATE, REFERENCES, or TRIGGER for               │
-- │ authenticated, anon, or PUBLIC.                                        │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT grantee, privilege_type, is_grantable
--   FROM information_schema.table_privileges
--   WHERE table_schema = 'public'
--     AND table_name = 'events'
--     AND grantee IN ('authenticated', 'anon', 'PUBLIC')
--   ORDER BY grantee, privilege_type;
--
--   -- Expected rows for authenticated:
--   --   SELECT  (NO)
--   --   INSERT  (NO)
--   -- Expected rows for anon:
--   --   (none, or SELECT only if Supabase default grants SELECT to anon)
--   -- No UPDATE, DELETE, TRUNCATE, REFERENCES, or TRIGGER rows.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V2. Effective Privilege Check (has_table_privilege) — AFTER            │
-- │ Expected: SELECT=true, INSERT=true (authenticated only),              │
-- │ everything else false.                                                 │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT
--     'authenticated' AS role,
--     has_table_privilege('authenticated', 'public.events', 'SELECT')     AS can_select,
--     has_table_privilege('authenticated', 'public.events', 'INSERT')     AS can_insert,
--     has_table_privilege('authenticated', 'public.events', 'UPDATE')     AS can_update,
--     has_table_privilege('authenticated', 'public.events', 'DELETE')     AS can_delete,
--     has_table_privilege('authenticated', 'public.events', 'TRUNCATE')   AS can_truncate,
--     has_table_privilege('authenticated', 'public.events', 'REFERENCES') AS can_references,
--     has_table_privilege('authenticated', 'public.events', 'TRIGGER')    AS can_trigger
--   UNION ALL
--   SELECT
--     'anon',
--     has_table_privilege('anon', 'public.events', 'SELECT'),
--     has_table_privilege('anon', 'public.events', 'INSERT'),
--     has_table_privilege('anon', 'public.events', 'UPDATE'),
--     has_table_privilege('anon', 'public.events', 'DELETE'),
--     has_table_privilege('anon', 'public.events', 'TRUNCATE'),
--     has_table_privilege('anon', 'public.events', 'REFERENCES'),
--     has_table_privilege('anon', 'public.events', 'TRIGGER');
--
--   -- Expected for authenticated:
--   --   can_select=true, can_insert=true
--   --   can_update=false, can_delete=false  (revoked by Step 1)
--   --   can_truncate=false, can_references=false, can_trigger=false  (revoked by this migration)
--   --
--   -- Expected for anon:
--   --   All false (or can_select=true if Supabase grants SELECT to anon by default)
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V3. Event Record Integrity Check                                       │
-- │ Expected: Count IDENTICAL to Q3 pre-migration snapshot.               │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT COUNT(*) AS total_events FROM public.events;
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V4. RLS Policies Unchanged                                             │
-- │ Expected: Exactly 2 policies (SELECT and INSERT) — same as after      │
-- │ Step 1. No UPDATE or DELETE policy.                                    │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT policyname, cmd, permissive, roles
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'events'
--   ORDER BY cmd, policyname;
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ V5. Complete Privilege Summary                                         │
-- │ Final state: authenticated should have ONLY SELECT and INSERT.        │
-- └─────────────────────────────────────────────────────────────────────────┘
--
--   SELECT
--     privilege_type,
--     string_agg(grantee, ', ' ORDER BY grantee) AS granted_to
--   FROM information_schema.table_privileges
--   WHERE table_schema = 'public'
--     AND table_name = 'events'
--     AND grantee IN ('authenticated', 'anon', 'PUBLIC')
--   GROUP BY privilege_type
--   ORDER BY privilege_type;
--
--   -- Expected:
--   --   INSERT  | authenticated
--   --   SELECT  | authenticated (and possibly anon)
--   --   No other privilege types listed.
--
-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

