# PHASE 3 / STEP 1 — Implementation Report

> **Secure XP Event Ledger**
>
> Generated: 2026-11-07
>
> Status: Migration prepared — NOT applied
>
> No production records, policies, or privileges were modified.

---

## 1. Migration File

**Filename:** [`20261107000000_secure_xp_event_ledger.sql`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20261107000000_secure_xp_event_ledger.sql)

**Location:** `supabase/migrations/20261107000000_secure_xp_event_ledger.sql`

**Naming convention:** Follows the project standard `YYYYMMDDHHMMSS_descriptive_name.sql`. Timestamp `20261107000000` places it after the latest existing migration (`20261013010000`).

---

## 2. Complete SQL Migration Contents

```sql
BEGIN;

-- Step 1: Remove UPDATE policy
DROP POLICY IF EXISTS "Users can update own events" ON public.events;

-- Step 2: Remove DELETE policy
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

-- Step 3: Revoke table-level UPDATE and DELETE privileges
REVOKE UPDATE ON public.events FROM authenticated;
REVOKE DELETE ON public.events FROM authenticated;
REVOKE UPDATE ON public.events FROM anon;
REVOKE DELETE ON public.events FROM anon;
REVOKE UPDATE ON public.events FROM PUBLIC;
REVOKE DELETE ON public.events FROM PUBLIC;

-- Step 4: Preserve SELECT and INSERT privileges
GRANT SELECT ON public.events TO authenticated;
GRANT INSERT ON public.events TO authenticated;

-- Step 5: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
```

---

## 3. Previous and Proposed Permissions

### RLS Policies — Before

| Policy Name | Operation | Role | Condition |
|---|---|---|---|
| Users can view own events | SELECT | authenticated | `auth.uid() = user_id` |
| Users can insert own events | INSERT | authenticated | `auth.uid() = user_id` |
| Users can update own events | UPDATE | authenticated | `auth.uid() = user_id` (USING + WITH CHECK) |
| Users can delete own events | DELETE | authenticated | `auth.uid() = user_id` |

### RLS Policies — After

| Policy Name | Operation | Role | Condition |
|---|---|---|---|
| Users can view own events | SELECT | authenticated | `auth.uid() = user_id` |
| Users can insert own events | INSERT | authenticated | `auth.uid() = user_id` |
| ~~Users can update own events~~ | ~~UPDATE~~ | — | **REMOVED** |
| ~~Users can delete own events~~ | ~~DELETE~~ | — | **REMOVED** |

### Table-Level Privileges — Before (Supabase defaults)

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| authenticated | ✅ | ✅ | ✅ | ✅ |
| anon | ✅ | ✅ | ✅ | ✅ |
| service_role | ✅ | ✅ | ✅ | ✅ |
| postgres | ✅ | ✅ | ✅ | ✅ |

### Table-Level Privileges — After

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| authenticated | ✅ | ✅ | ❌ | ❌ |
| anon | (unchanged) | (unchanged) | ❌ | ❌ |
| service_role | ✅ | ✅ | ✅ | ✅ |
| postgres | ✅ | ✅ | ✅ | ✅ |

> [!NOTE]
> `service_role` and `postgres` retain full privileges. SECURITY DEFINER functions owned by `postgres` (such as `award_xp_internal`, `complete_task`, `log_focus_session`, `unlock_achievement`, `unlock_milestone`, `claim_daily_goal`, `claim_daily_challenge`) execute with `postgres` privileges and bypass RLS entirely. They are unaffected by this migration.

---

## 4. Explanation of Each SQL Statement

| # | Statement | Purpose |
|---|---|---|
| 1 | `BEGIN;` | Wraps all changes in a single atomic transaction. If any statement fails, all changes are rolled back. |
| 2 | `DROP POLICY IF EXISTS "Users can update own events"` | Removes the RLS policy that allowed authenticated users to UPDATE their own event rows. `IF EXISTS` makes the statement idempotent. |
| 3 | `DROP POLICY IF EXISTS "Users can delete own events"` | Removes the RLS policy that allowed authenticated users to DELETE their own event rows. This directly closes the XP replay attack vector identified in Phase 2A (Finding B3). |
| 4 | `REVOKE UPDATE ON public.events FROM authenticated` | Removes table-level UPDATE privilege from the `authenticated` role. Defense in depth — even if RLS were accidentally disabled, UPDATE would still be denied. |
| 5 | `REVOKE DELETE ON public.events FROM authenticated` | Same for DELETE. |
| 6 | `REVOKE UPDATE/DELETE FROM anon` | Removes any inherited table-level UPDATE/DELETE from the `anon` role. The `anon` role had no RLS policies but may have had implicit Supabase default table grants. |
| 7 | `REVOKE UPDATE/DELETE FROM PUBLIC` | The `PUBLIC` pseudo-role in PostgreSQL is the implicit grant target. Revoking from `PUBLIC` prevents any future role from inheriting these privileges unless explicitly granted. |
| 8 | `GRANT SELECT ON public.events TO authenticated` | Explicitly ensures the SELECT privilege remains. This is a safety re-grant — it is a no-op if the privilege already exists. |
| 9 | `GRANT INSERT ON public.events TO authenticated` | Explicitly ensures the INSERT privilege remains. Required by `logEvent()` in `src/lib/events.ts:254`. |
| 10 | `NOTIFY pgrst, 'reload schema'` | Tells PostgREST to reload its schema cache so the policy and privilege changes take effect immediately for API clients. |
| 11 | `COMMIT;` | Commits the transaction. |

---

## 5. Policy and Grant Dependency Analysis

### Policies Being Dropped

| Policy | Depended On By | Safe to Drop? |
|---|---|---|
| "Users can update own events" | No frontend code. No backend RPC. No trigger. | ✅ Yes |
| "Users can delete own events" | No frontend code. No backend RPC. No trigger. | ✅ Yes |

### Policies Being Preserved

| Policy | Required By |
|---|---|
| "Users can view own events" | `useStore.ts:87` (event hydration), `events.ts:379,453` (achievement event lookup) |
| "Users can insert own events" | `events.ts:254` (`logEvent()` function) |

### SECURITY DEFINER Functions (Unaffected)

All of the following functions run as `postgres` and bypass RLS:

| Function | Schema | INSERT into events? | Affected by this migration? |
|---|---|---|---|
| `private.award_xp_internal` | private | Yes (line 114 of `20260711120000`) | ❌ No |
| `public.complete_task` | public | Via `award_xp_internal` | ❌ No |
| `public.uncomplete_task` | public | No (reverts status only) | ❌ No |
| `public.log_focus_session` | public | Yes (line 107 of `20260708180000`) | ❌ No |
| `public.claim_daily_goal` | public | Via `award_xp_internal` | ❌ No |
| `public.claim_daily_challenge` | public | Via `award_xp_internal` | ❌ No |
| `public.unlock_achievement` | public | Via `award_xp_internal` | ❌ No |
| `public.unlock_milestone` | public | Via INSERT (line 54 of `20260715121000`) | ❌ No |
| `public.complete_milestone` | public | Via `award_xp_internal` | ❌ No |
| `public.complete_goal` | public | Via `award_xp_internal` | ❌ No |

### Idempotency Indexes (Unaffected)

| Index | Purpose | Affected? |
|---|---|---|
| `events_xp_idempotency_idx` | Prevents duplicate XP awards | ❌ No — index is on `(user_id, type, reference_id)`, unchanged |
| `events_focus_completion_reference_idx` | Prevents duplicate focus session events | ❌ No |
| `events_user_timestamp_idx` | Performance index for event hydration | ❌ No |

---

## 6. Features Expected to Remain Unaffected

| Feature | Evidence |
|---|---|
| **Dashboard** | Reads events via `useStore.ts:87` (SELECT) — unaffected |
| **Task completion / uncomplete** | Uses `complete_task` / `uncomplete_task` RPCs (SECURITY DEFINER) — unaffected |
| **Focus timer / sessions** | Uses `log_focus_session` RPC (SECURITY DEFINER) — unaffected |
| **Daily goals** | Uses `claim_daily_goal` RPC (SECURITY DEFINER) — unaffected |
| **Daily challenges** | Uses `claim_daily_challenge` RPC (SECURITY DEFINER) — unaffected |
| **Achievements** | Uses `unlock_achievement` RPC (SECURITY DEFINER) — unaffected |
| **Goals & milestones** | Uses `complete_milestone` / `complete_goal` RPCs (SECURITY DEFINER) — unaffected |
| **Finance** | Does not interact with events table directly — unaffected |
| **Arena / leaderboard** | Uses `arena_scores`, `arena_activity`, not events — unaffected |
| **Event logging** | `logEvent()` in `events.ts:254` uses INSERT — unaffected |
| **Event hydration** | `useStore.ts:87` uses SELECT — unaffected |
| **Settings / profile** | Does not interact with events table for UPDATE/DELETE — unaffected |
| **Analytics / reports** | Reads events via SELECT — unaffected |

---

## 7. Potential Regression Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| An undiscovered admin tool or support script uses authenticated DELETE on events | Very Low | Would silently return 0 rows | Manual check: search Supabase Dashboard SQL Editor history for DELETE FROM events |
| A future feature assumes UPDATE/DELETE on events is available | Low | Feature would fail at development time | Document in migration comments; add to project README |
| PostgREST cache does not reload | Very Low | Old policies would remain in cache temporarily | `NOTIFY pgrst, 'reload schema'` is included; can also restart PostgREST manually |
| Supabase default grants re-apply on project reset | Low | UPDATE/DELETE privileges could be re-granted | Monitor with periodic `information_schema.table_privileges` checks |

**Overall regression risk: MINIMAL.** No application code path exercises events UPDATE or DELETE.

---

## 8. Rollback SQL

> [!CAUTION]
> **For emergency use only.** This rollback restores the vulnerable state. Do not apply unless a critical regression is confirmed.

```sql
BEGIN;

-- Restore UPDATE policy
CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Restore DELETE policy
CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Restore table-level privileges
GRANT UPDATE ON public.events TO authenticated;
GRANT DELETE ON public.events TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
```

---

## 9. Manual Verification Queries

Run these queries in the Supabase SQL Editor **after** applying the migration to confirm the changes took effect:

### 9a. Verify RLS policies

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'events' AND schemaname = 'public'
ORDER BY policyname;
```

**Expected result:**

| policyname | cmd | roles |
|---|---|---|
| Users can insert own events | INSERT | {authenticated} |
| Users can view own events | SELECT | {authenticated} |

Should return **exactly 2 rows**. No UPDATE or DELETE policy should be present.

### 9b. Verify table-level privileges

```sql
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'events'
  AND table_schema = 'public'
ORDER BY grantee, privilege_type;
```

**Expected:** `authenticated` should have `SELECT` and `INSERT` only. No `UPDATE` or `DELETE` for `authenticated`, `anon`, or `PUBLIC`.

### 9c. Verify SECURITY DEFINER functions still work

```sql
-- Check that award_xp_internal is still SECURITY DEFINER owned by postgres
SELECT proname, proowner::regrole, prosecdef
FROM pg_proc
WHERE proname = 'award_xp_internal';
```

**Expected:** `proowner = postgres`, `prosecdef = true`.

### 9d. Functional smoke test (read-only)

```sql
-- Verify events table is readable (returns count, does not modify data)
SELECT COUNT(*) FROM public.events;
```

---

## 10. Confirmation Statement

> [!IMPORTANT]
> **I confirm the following:**
>
> 1. ✅ Migration file [`20261107000000_secure_xp_event_ledger.sql`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20261107000000_secure_xp_event_ledger.sql) has been **prepared but NOT applied**.
> 2. ✅ No production SQL was executed.
> 3. ✅ No existing migration files were modified.
> 4. ✅ No event records, XP balances, or user data were changed.
> 5. ✅ No Supabase migration history was reset or repaired.
> 6. ✅ No frontend code was modified.
> 7. ✅ No profiles or XP-awarding functions were altered.
> 8. ✅ The migration is forward-only and idempotent (`DROP POLICY IF EXISTS`, `REVOKE` is idempotent by design).

---

## 11. Inspection Summary

### Files Inspected

| File | What Was Verified |
|---|---|
| `supabase/migrations/20260703185015_create_events_table.sql` | Original 4 policies (SELECT, INSERT, UPDATE, DELETE) |
| `supabase/migrations/20260706161500_repair_missing_tables.sql` | Duplicate policy creation (same 4 policies) |
| `supabase/migrations/20260711120000_progression_xp_foundation.sql` | `award_xp_internal` SECURITY DEFINER, INSERT into events |
| `supabase/migrations/20260708180000_fix_events_index_and_constraint.sql` | `log_focus_session` INSERT into events |
| `supabase/migrations/20260715121000_server_authoritative_milestones.sql` | `unlock_milestone` INSERT into events |
| `src/lib/events.ts` (lines 254, 379, 453) | INSERT (logEvent), SELECT (achievement lookups) |
| `src/store/useStore.ts` (line 87) | SELECT (event hydration) |
| All `src/**/*.ts` and `src/**/*.tsx` files | Exhaustive search for `.from('events').update` and `.from('events').delete` — zero results |
| All 42 migration files | Searched for `GRANT`/`REVOKE` on events — zero results |

### Search Queries Executed

| Search | Result |
|---|---|
| `from('events').(update\|delete\|insert)` across all src | Only INSERT at `events.ts:254` |
| `(GRANT\|REVOKE).*events` across all migrations | Zero results |
| `INSERT INTO.*events` across all migrations | 5 sites, all inside SECURITY DEFINER functions |
| `from('events')` across all src | 4 sites: 1 INSERT, 3 SELECT |

---

## 12. Next Step Recommendation

This migration is ready for application. Once authorized, apply with:

```bash
supabase db push
```

Or via the Supabase Dashboard SQL Editor by pasting the migration contents.

After verification, proceed to **Phase 3 / Step 2: Fix Daily XP RPC Argument Swap** — the next item in the prioritized remediation roadmap.

**STOP — Awaiting explicit authorization before applying.**

