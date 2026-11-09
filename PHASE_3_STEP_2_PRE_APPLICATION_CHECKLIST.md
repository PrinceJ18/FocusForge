# PHASE 3 / STEP 2 — Pre-Application Verification Checklist

> **Migration**: `20261108000000_fix_daily_xp_rpcs.sql`
>
> Generated: 2026-11-08
>
> Status: READ-ONLY VERIFICATION — Migration NOT Applied

---

## Table of Contents

1. [Migration Integrity Verification](#1-migration-integrity-verification)
2. [Current Production State (Migration-Based Inference)](#2-current-production-state-migration-based-inference)
3. [Pre-Application SQL Queries](#3-pre-application-sql-queries)
4. [Post-Application SQL Queries](#4-post-application-sql-queries)
5. [Discrepancy Analysis](#5-discrepancy-analysis)

---

## 1. Migration Integrity Verification

### 1.1 Commented Code Does Not Execute

**Verified**: The migration file has been inspected line-by-line.

| Section | Lines | Content | Executable? |
|---|---|---|---|
| Header comments | 1–38 | SQL `--` line comments | ❌ Not executable |
| `BEGIN;` | 40 | Transaction start | ✅ Executable |
| `CREATE OR REPLACE FUNCTION claim_daily_goal(...)` | 46–79 | Disabled stub function | ✅ Executable |
| `ALTER FUNCTION ... OWNER TO postgres` | 81 | Ownership change | ✅ Executable |
| Block comment (rationale) | 87–113 | SQL `--` line comments | ❌ Not executable |
| `CREATE OR REPLACE FUNCTION claim_daily_challenge(...)` | 115–173 | Disabled stub function | ✅ Executable |
| `ALTER FUNCTION ... OWNER TO postgres` | 175 | Ownership change | ✅ Executable |
| `REVOKE`/`GRANT` statements | 182–188 | Privilege management | ✅ Executable |
| `NOTIFY pgrst` | 195 | Schema cache reload | ✅ Executable |
| `COMMIT;` | 197 | Transaction end | ✅ Executable |
| Reference implementation | 199–416 | SQL `--` line comments | ❌ Not executable |
| Post-migration queries | 418–467 | SQL `--` line comments | ❌ Not executable |

**Inside `claim_daily_challenge` function body** (lines 153–171): The "REFERENCE IMPLEMENTATION" comment block between the `RETURN` statement (line 145–151) and `END;` (line 172) is **PL/pgSQL dead code** — the `RETURN` on line 145 exits the function before any subsequent code in the same block executes. These are also just comments, not actual PL/pgSQL statements.

> [!IMPORTANT]
> **Confirmed**: No commented reference implementation code will execute. The function body contains only: authentication → challenge ID validation → SELECT profile XP → RETURN disabled response.

### 1.2 Function Signature Compatibility

| Function | Current Signature (from `20260715120000`) | New Signature (from `20261108000000`) | Compatible? |
|---|---|---|---|
| `claim_daily_goal` | `(p_goal_date date, p_goal_id text DEFAULT 'all', p_amount int DEFAULT 10)` | Identical | ✅ |
| `claim_daily_challenge` | `(p_challenge_id text, p_challenge_date date, p_amount int DEFAULT 20)` | Identical | ✅ |

### 1.3 Return Contract Compatibility

| Function | Current Return Keys | New Return Keys | Compatible? |
|---|---|---|---|
| `claim_daily_goal` | `total_xp, xp_earned, already_claimed, claimed` | Same + `reason` (additive) | ✅ |
| `claim_daily_challenge` | `total_xp, xp_earned, already_claimed, claimed` | Same + `reason` (additive) | ✅ |

---

## 2. Current Production State (Migration-Based Inference)

> [!WARNING]
> All values below are **inferred from migration files**. The live production database may differ from migration history, as documented in migration `20260802000000_consolidated_schema_sync.sql`. The pre-application queries in Section 3 must be executed against the live database to confirm.

### 2.1 Function Definitions

**Source migration**: [`20260715120000_server_authoritative_daily_claims.sql`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql)

No subsequent migration (between `20260715120000` and `20261108000000`) modified these functions. The `20260802000000` sync migration mentions them in a comment but does not redefine them.

#### claim_daily_goal — Expected Current State

| Property | Expected Value | Source |
|---|---|---|
| Schema | `public` | [`20260715120000:19`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L19) |
| Language | `plpgsql` | [`20260715120000:25`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L25) |
| SECURITY DEFINER | `true` | [`20260715120000:26`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L26) |
| search_path | `public, private` | [`20260715120000:27`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L27) |
| Owner | Supabase default (likely `postgres` or `supabase_admin`) | No explicit `ALTER OWNER` in `20260715120000` |
| Returns | `json` | [`20260715120000:24`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L24) |

#### claim_daily_challenge — Expected Current State

| Property | Expected Value | Source |
|---|---|---|
| Schema | `public` | [`20260715120000:97`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L97) |
| Language | `plpgsql` | [`20260715120000:103`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L103) |
| SECURITY DEFINER | `true` | [`20260715120000:104`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L104) |
| search_path | `public, private` | [`20260715120000:105`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L105) |
| Owner | Supabase default (likely `postgres` or `supabase_admin`) | No explicit `ALTER OWNER` in `20260715120000` |
| Returns | `json` | [`20260715120000:101`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L101) |

### 2.2 Expected EXECUTE Privileges

**Source migration**: [`20260715122000_server_authoritative_security_patch.sql`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715122000_server_authoritative_security_patch.sql)

| Function | PUBLIC | anon | authenticated | service_role |
|---|---|---|---|---|
| `claim_daily_goal(date, text, int)` | REVOKED | REVOKED | GRANTED | Inherited (not explicitly set) |
| `claim_daily_challenge(text, date, int)` | REVOKED | REVOKED | GRANTED | Inherited (not explicitly set) |

> [!NOTE]
> `service_role` was not explicitly addressed in `20260715122000`. On Supabase, `service_role` typically inherits from `authenticated` or has broader access via `postgres` ownership. The migration's `REVOKE ALL ... FROM PUBLIC` would not affect `service_role` if it has direct grants.

### 2.3 Events Unique Indexes

| Index Name | Definition | Source |
|---|---|---|
| `events_xp_idempotency_idx` | `UNIQUE (user_id, type, reference_id) WHERE reference_id IS NOT NULL AND metadata ? 'xp_earned'` | [`20260711120000:35-37`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260711120000_progression_xp_foundation.sql#L35-L37) |
| `events_focus_completion_reference_idx` | `UNIQUE (user_id, reference_id) WHERE reference_id IS NOT NULL AND type = 'focus_session_completed'` | [`20260708180000:19-22`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260708180000_fix_events_index_and_constraint.sql#L19-L22) |

The old `events_user_reference_idx` was explicitly dropped in [`20260708180000:17`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260708180000_fix_events_index_and_constraint.sql#L17).

### 2.4 Required Source Tables and Columns

| Table | Column | Type | Source Migration | Required By |
|---|---|---|---|---|
| `profiles` | `xp` | integer | [`20260711120000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260711120000_progression_xp_foundation.sql) | Both functions (reading XP) |
| `profiles` | `daily_challenge_claims` | jsonb | [`20260715120000:16`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L16) | Reference impl only |
| `focus_sessions` | `sessions_count` | integer | [`20260525174459:128`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260525174459_create_spendwise_tables.sql#L128) | Reference impl (c1) |
| `focus_sessions` | `minutes` | integer | [`20260525174459:127`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260525174459_create_spendwise_tables.sql#L127) | Reference impl (c4) |
| `focus_sessions` | `session_date` | date | [`20260525174459:126`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260525174459_create_spendwise_tables.sql#L126) | Reference impl (c1, c4) |
| `expenses` | `expense_date` | date | [`20260525174459:59`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260525174459_create_spendwise_tables.sql#L59) | Reference impl (c2) |
| `tasks` | `status` | text | [`20260801020000:5`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260801020000_task_status_v2.sql#L5) | Reference impl (c3) |
| `tasks` | `completed_at` | timestamptz | [`20260525174459:96`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260525174459_create_spendwise_tables.sql#L96) | Reference impl (c3) |
| `tasks` | `recurrence_type` | text | [`20260706160000:51`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260706160000_extend_task_system.sql#L51) | Reference impl (c3) |
| `task_completions` | `status` | text | [`20260801020000:21`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260801020000_task_status_v2.sql#L21) | Reference impl (c3) |
| `task_completions` | `occurrence_date` | date | [`20260706160000:67`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260706160000_extend_task_system.sql#L67) | Reference impl (c3) |

> [!NOTE]
> The active (disabled) stubs only read `profiles.xp`. The source table columns are required only by the reference implementation and are listed here for completeness.

---

## 3. Pre-Application SQL Queries

Execute these queries in the **Supabase SQL Editor** before applying the migration. Record results for comparison.

### Q1. Current Function Signatures and Definitions

```sql
-- Q1a. Function metadata (owner, security_definer, search_path)
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    p.proowner::regrole AS owner,
    p.prosecdef AS security_definer,
    p.prolang::regproc AS language,
    array_to_string(p.proconfig, ', ') AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('claim_daily_goal', 'claim_daily_challenge')
ORDER BY p.proname;

-- Expected per migration inference:
--   claim_daily_challenge: owner=<default>, security_definer=true, config=search_path=public, private
--   claim_daily_goal:      owner=<default>, security_definer=true, config=search_path=public, private
```

### Q2. Current Function Source Code

```sql
-- Q2. Full function source for comparison
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('claim_daily_goal', 'claim_daily_challenge')
ORDER BY p.proname;
```

### Q3. Current EXECUTE Privileges

```sql
-- Q3a. Information schema view
SELECT
    routine_schema,
    routine_name,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_daily_goal', 'claim_daily_challenge')
ORDER BY routine_name, grantee;

-- Expected: authenticated → EXECUTE on each function
-- NOT expected: PUBLIC, anon

-- Q3b. ACL check via pg_proc (more detailed, includes service_role)
SELECT
    p.proname,
    p.proacl
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('claim_daily_goal', 'claim_daily_challenge')
ORDER BY p.proname;

-- proacl format: {grantor=privs/grantee, ...}
-- Look for: authenticated=X/postgres (X means EXECUTE)
-- Verify absence of: =X/postgres (PUBLIC grant), anon=X/postgres
```

### Q4. Events Unique Indexes

```sql
-- Q4. Verify both partial unique indexes on events
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'events'
  AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- Expected:
--   events_focus_completion_reference_idx:
--     UNIQUE (user_id, reference_id) WHERE reference_id IS NOT NULL AND type = 'focus_session_completed'
--   events_xp_idempotency_idx:
--     UNIQUE (user_id, type, reference_id) WHERE reference_id IS NOT NULL AND metadata ? 'xp_earned'
-- NOT expected:
--   events_user_reference_idx (should have been dropped by 20260708180000)
```

### Q5. Source Tables and Columns

```sql
-- Q5a. Verify profiles.xp exists (required by active stubs)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('xp', 'daily_challenge_claims')
ORDER BY column_name;

-- Q5b. Verify focus_sessions columns (required by reference impl)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'focus_sessions'
  AND column_name IN ('session_date', 'minutes', 'sessions_count')
ORDER BY column_name;
-- Expected: 3 rows

-- Q5c. Verify expenses.expense_date (required by reference impl)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'expenses'
  AND column_name = 'expense_date';
-- Expected: 1 row, date

-- Q5d. Verify tasks columns (required by reference impl)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks'
  AND column_name IN ('status', 'completed_at', 'recurrence_type')
ORDER BY column_name;
-- Expected: 3 rows

-- Q5e. Verify task_completions columns (required by reference impl)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'task_completions'
  AND column_name IN ('status', 'occurrence_date')
ORDER BY column_name;
-- Expected: 2 rows
```

### Q6. XP Snapshot (for post-migration comparison)

```sql
-- Q6. Snapshot a test user's XP and event count
-- Run as the authenticated user you will test with
SELECT
    p.id AS user_id,
    p.xp AS current_xp,
    (SELECT COUNT(*) FROM events WHERE user_id = p.id) AS total_events,
    (SELECT COUNT(*) FROM events WHERE user_id = p.id
     AND category IN ('daily_goal', 'daily_challenge')) AS daily_xp_events
FROM profiles p
WHERE p.id = auth.uid();

-- Record: current_xp, total_events, daily_xp_events
```

### Q7. Existing Swapped Events (Migration-Window Risk)

```sql
-- Q7. Count old swapped events that the dual idempotency check would match
SELECT
    type,
    reference_id,
    COUNT(*) AS event_count
FROM events
WHERE (
    -- Old swapped goal pattern
    (reference_id = 'goal_completed' AND type LIKE 'daily_goal_%')
    OR
    -- Old swapped challenge pattern
    (reference_id = 'challenge_completed' AND type LIKE 'daily_challenge_%')
)
GROUP BY type, reference_id
ORDER BY type;

-- This shows how many events exist with the OLD (swapped) field layout.
-- These events will be recognized by the reference implementation's dual
-- idempotency check when it is eventually reactivated.
```

---

## 4. Post-Application SQL Queries

Execute these queries **after** applying the migration to confirm correctness.

### V1. Function Ownership and Security

```sql
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    p.proowner::regrole AS owner,
    p.prosecdef AS security_definer,
    array_to_string(p.proconfig, ', ') AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('claim_daily_goal', 'claim_daily_challenge')
ORDER BY p.proname;

-- Expected for BOTH functions:
--   owner:            postgres
--   security_definer: true
--   config:           search_path=pg_catalog, public, private
```

### V2. EXECUTE Privileges

```sql
SELECT
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_daily_goal', 'claim_daily_challenge')
ORDER BY routine_name, grantee;

-- Expected (per function):
--   grantee=authenticated, privilege_type=EXECUTE
-- NOT expected:
--   grantee=PUBLIC or grantee=anon
```

### V3. Daily Goal Returns Zero XP

```sql
SELECT public.claim_daily_goal(CURRENT_DATE, 'goal_focus', 9999);

-- Expected JSON:
-- {
--   "total_xp": <current_xp>,
--   "xp_earned": 0,
--   "already_claimed": false,
--   "claimed": false,
--   "reason": "Daily goal rewards are temporarily disabled pending server-side verification"
-- }
```

### V4. Daily Challenge Returns Zero XP

```sql
SELECT public.claim_daily_challenge('c1', CURRENT_DATE, 9999);

-- Expected JSON:
-- {
--   "total_xp": <current_xp>,
--   "xp_earned": 0,
--   "already_claimed": false,
--   "claimed": false,
--   "reason": "Daily challenge rewards are temporarily disabled pending source table security"
-- }
```

### V5. Unknown Challenge ID Rejected

```sql
SELECT public.claim_daily_challenge('c99', CURRENT_DATE, 50);

-- Expected: ERROR
-- Message: Unknown challenge ID: c99
```

### V6. Valid Challenge IDs Accepted (But Disabled)

```sql
SELECT public.claim_daily_challenge('c2', CURRENT_DATE);
SELECT public.claim_daily_challenge('c3', CURRENT_DATE);
SELECT public.claim_daily_challenge('c4', CURRENT_DATE);

-- Expected: Same disabled response as V4 for each (no exception)
```

### V7. XP and Events Unchanged

```sql
SELECT
    p.id AS user_id,
    p.xp AS current_xp,
    (SELECT COUNT(*) FROM events WHERE user_id = p.id) AS total_events,
    (SELECT COUNT(*) FROM events WHERE user_id = p.id
     AND category IN ('daily_goal', 'daily_challenge')) AS daily_xp_events
FROM profiles p
WHERE p.id = auth.uid();

-- Expected: ALL values IDENTICAL to Q6 pre-migration snapshot
-- current_xp:       UNCHANGED
-- total_events:     UNCHANGED
-- daily_xp_events:  UNCHANGED
```

### V8. search_path Verification

```sql
SELECT
    p.proname,
    unnest(p.proconfig) AS setting
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('claim_daily_goal', 'claim_daily_challenge')
ORDER BY p.proname;

-- Expected for BOTH:
--   setting = 'search_path=pg_catalog, public, private'
```

---

## 5. Discrepancy Analysis

### Known Uncertainty: Function Owner

The original migration [`20260715120000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql) did **not** include an explicit `ALTER FUNCTION ... OWNER TO` statement. On Supabase:

- If the migration was run by the `postgres` role (default for `supabase db push`), the owner is `postgres`.
- If the migration was run by a different role (e.g., `supabase_admin`), the owner may differ.

**Q1 will reveal the actual owner.** The new migration explicitly sets `OWNER TO postgres`, which will succeed regardless of the current owner (since `postgres` is a superuser on Supabase).

### Known Uncertainty: service_role Privileges

Neither the original migration nor the security patch explicitly addressed `service_role` EXECUTE privileges. The new migration's `REVOKE ALL FROM PUBLIC` does not affect role-specific grants.

**Q3b (`proacl`) will reveal whether `service_role` has explicit grants.** If it does, the migration preserves them (no `REVOKE` targets `service_role`).

### Known Uncertainty: Live vs Migration State

Migration `20260802000000_consolidated_schema_sync.sql` documents that the live database diverged from migration history and was manually repaired. The pre-application queries (Section 3) are designed to detect any remaining divergence for these specific functions.

### Verified: No Unintended Side Effects

The migration:
- ❌ Does **not** modify `award_xp_internal`
- ❌ Does **not** modify `events` table structure or indexes
- ❌ Does **not** modify `profiles` table structure
- ❌ Does **not** modify any existing event records
- ❌ Does **not** modify any XP balances
- ❌ Does **not** modify any RLS policies on any table
- ❌ Does **not** create or drop any tables, indexes, or constraints
- ❌ Does **not** execute the commented reference implementation
- ✅ Only replaces function bodies (via `CREATE OR REPLACE`)
- ✅ Only changes function ownership (via `ALTER FUNCTION ... OWNER TO postgres`)
- ✅ Only re-applies explicit EXECUTE grants (matching `20260715122000`)

---

> [!IMPORTANT]
> This checklist is a **preparation document**. The migration has NOT been applied. Execute the Section 3 queries, record the results, and compare against the expected values before proceeding.

---

*End of Phase 3 / Step 2 Pre-Application Verification Checklist*

