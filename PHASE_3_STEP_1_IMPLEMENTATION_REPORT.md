# PHASE 3 / STEP 1 — Implementation Report (Hardened)

> **Secure XP Event Ledger**
>
> Generated: 2026-11-07
>
> Amended: 2026-11-07 — Column-level privilege revocations and comprehensive verification queries added.
>
> Status: Migration prepared — **NOT applied**
>
> No production records, policies, or privileges were modified.

---

## 1. Migration File

**Filename:** [`20261107000000_secure_xp_event_ledger.sql`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20261107000000_secure_xp_event_ledger.sql)

**Location:** `supabase/migrations/20261107000000_secure_xp_event_ledger.sql`

---

## 2. Change Log (Hardening Amendment)

| # | Change | Reason |
|---|---|---|
| 1 | Added `REVOKE UPDATE (id, user_id, "timestamp", type, category, reference_id, metadata)` for `authenticated`, `anon`, and `PUBLIC` | PostgreSQL column-level privileges are independent of table-level privileges. A table-level `REVOKE UPDATE` does NOT remove column-level grants. Defensive revocation ensures no residual column-level UPDATE grants survive, regardless of live database state. |
| 2 | Quoted `"timestamp"` in column-level REVOKE statements | `timestamp` is a PostgreSQL reserved word. Double-quoting prevents parser ambiguity. All other column names are unreserved and do not require quoting. |
| 3 | Consolidated the two `DROP POLICY IF EXISTS` statements into a single comment block | Reduced redundancy; both are part of the same logical step. |
| 4 | Added 7 comprehensive verification queries (V1–V7) as post-migration comments | Covering: RLS policies, table-level privileges, column-level privileges, `has_table_privilege`, `has_column_privilege`, SECURITY DEFINER integrity, and event record count. |
| 5 | Added explicit idempotency documentation in the migration header | Clarifies that the migration is safe to run against any live database state, including one that has diverged from migration history. |
| 6 | Added note that column-level DELETE revocation is not needed | PostgreSQL does not support column-level DELETE privileges (DELETE operates on whole rows). |

**Items preserved from original migration:**
- `DROP POLICY IF EXISTS` for both UPDATE and DELETE policies
- Table-level `REVOKE UPDATE/DELETE` from `authenticated`, `anon`, `PUBLIC`
- `GRANT SELECT/INSERT` to `authenticated`
- `NOTIFY pgrst, 'reload schema'`
- `BEGIN`/`COMMIT` transaction wrapper
- All comments explaining rationale and provenance

---

## 3. Complete SQL Migration Structure

```
BEGIN;
  Step 1: DROP POLICY IF EXISTS × 2  (RLS layer)
  Step 2: REVOKE UPDATE/DELETE × 6   (table-level privilege layer)
  Step 3: REVOKE UPDATE (cols) × 3   (column-level privilege layer)  ← NEW
  Step 4: GRANT SELECT/INSERT × 2    (preserve required privileges)
  Step 5: NOTIFY pgrst                (schema cache reload)
COMMIT;
```

**Total SQL statements:** 16 (up from 13 in the original)

---

## 4. Previous and Proposed Permissions

### RLS Policies — Before → After

| Policy Name | Operation | Before | After |
|---|---|---|---|
| Users can view own events | SELECT | ✅ Exists | ✅ Preserved |
| Users can insert own events | INSERT | ✅ Exists | ✅ Preserved |
| Users can update own events | UPDATE | ✅ Exists | ❌ **Dropped** |
| Users can delete own events | DELETE | ✅ Exists | ❌ **Dropped** |

### Table-Level Privileges — Before → After

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| authenticated | ✅ → ✅ | ✅ → ✅ | ✅ → ❌ | ✅ → ❌ |
| anon | * → * | * → * | * → ❌ | * → ❌ |
| PUBLIC | * → * | * → * | * → ❌ | * → ❌ |
| service_role | ✅ → ✅ | ✅ → ✅ | ✅ → ✅ | ✅ → ✅ |
| postgres | ✅ → ✅ | ✅ → ✅ | ✅ → ✅ | ✅ → ✅ |

\* = Supabase default grant; exact state unknown without live verification.

### Column-Level UPDATE Privileges — Before → After

| Column | authenticated | anon | PUBLIC |
|---|---|---|---|
| `id` | UNKNOWN → ❌ | UNKNOWN → ❌ | UNKNOWN → ❌ |
| `user_id` | UNKNOWN → ❌ | UNKNOWN → ❌ | UNKNOWN → ❌ |
| `timestamp` | UNKNOWN → ❌ | UNKNOWN → ❌ | UNKNOWN → ❌ |
| `type` | UNKNOWN → ❌ | UNKNOWN → ❌ | UNKNOWN → ❌ |
| `category` | UNKNOWN → ❌ | UNKNOWN → ❌ | UNKNOWN → ❌ |
| `reference_id` | UNKNOWN → ❌ | UNKNOWN → ❌ | UNKNOWN → ❌ |
| `metadata` | UNKNOWN → ❌ | UNKNOWN → ❌ | UNKNOWN → ❌ |

> [!NOTE]
> "UNKNOWN" reflects that column-level privilege state cannot be verified from migration history alone. No migration grants column-level UPDATE on events, but the live database may have received manual grants via the Supabase Dashboard or other tools. The defensive REVOKE handles all cases.

---

## 5. PostgreSQL Column-Level Privilege Analysis

### Why column-level revocation is required

In PostgreSQL, privileges exist at two independent levels:

```
Table-level:  GRANT UPDATE ON table TO role;
Column-level: GRANT UPDATE (col1, col2) ON table TO role;
```

**Critical behavior:** `REVOKE UPDATE ON table FROM role` removes only the *table-level* privilege. Any *column-level* grants survive independently. This means:

```sql
-- Scenario: Both levels granted
GRANT UPDATE ON events TO authenticated;           -- table-level
GRANT UPDATE (metadata) ON events TO authenticated; -- column-level

-- Revoke table-level only
REVOKE UPDATE ON events FROM authenticated;

-- Result: authenticated can STILL update the metadata column!
-- has_column_privilege('authenticated', 'events', 'metadata', 'UPDATE') = TRUE
```

This is documented PostgreSQL behavior ([PostgreSQL docs: GRANT](https://www.postgresql.org/docs/current/sql-grant.html)). The migration must revoke at both levels to be complete.

### Why column-level DELETE revocation is NOT needed

PostgreSQL does not support column-level DELETE privileges. The `DELETE` privilege operates on whole rows only. Attempting `REVOKE DELETE (col) ON table FROM role` would produce a syntax error. Table-level `REVOKE DELETE` is sufficient.

---

## 6. Idempotency and Live State Resilience

| Statement | If privilege/policy exists | If privilege/policy does NOT exist |
|---|---|---|
| `DROP POLICY IF EXISTS` | Drops the policy | No-op (no error) |
| `REVOKE UPDATE ON table FROM role` | Removes the privilege | No-op (no error) |
| `REVOKE UPDATE (cols) ON table FROM role` | Removes column-level privilege | No-op (no error) |
| `GRANT SELECT ON table TO role` | No-op (already granted) | Grants the privilege |

The migration is safe to run against:
- A fresh database where the original policies exist
- A database where policies were already manually removed
- A database with unexpected column-level grants from Supabase defaults
- A database that has diverged from migration history

---

## 7. SECURITY DEFINER Functions (Unaffected)

All of the following functions execute as `postgres` and bypass RLS. They are unaffected because:
1. `postgres` retains full `UPDATE`/`DELETE` privileges (not revoked)
2. SECURITY DEFINER functions bypass RLS entirely
3. These functions only `INSERT` into events (not UPDATE or DELETE)

| Function | Schema | Owner | Operation on events |
|---|---|---|---|
| `award_xp_internal` | private | postgres | INSERT |
| `complete_task` | public | postgres | INSERT (via `award_xp_internal`) |
| `uncomplete_task` | public | postgres | None |
| `log_focus_session` | public | postgres | INSERT |
| `claim_daily_goal` | public | postgres | SELECT + INSERT (via `award_xp_internal`) |
| `claim_daily_challenge` | public | postgres | SELECT + INSERT (via `award_xp_internal`) |
| `unlock_achievement` | public | postgres | SELECT + INSERT (via `award_xp_internal`) |
| `unlock_milestone` | public | postgres | INSERT |
| `complete_milestone` | public | postgres | SELECT + INSERT (via `award_xp_internal`) |
| `complete_goal` | public | postgres | SELECT + INSERT (via `award_xp_internal`) |

---

## 8. Features Unaffected

| Feature | Evidence | Risk |
|---|---|---|
| Dashboard | Reads events via SELECT — preserved | None |
| Task completion | `complete_task` RPC (SECURITY DEFINER) | None |
| Focus timer | `log_focus_session` RPC (SECURITY DEFINER) | None |
| Daily goals | `claim_daily_goal` RPC (SECURITY DEFINER) | None |
| Daily challenges | `claim_daily_challenge` RPC (SECURITY DEFINER) | None |
| Achievements | `unlock_achievement` RPC (SECURITY DEFINER) | None |
| Goals & milestones | `complete_milestone` / `complete_goal` RPCs (SECURITY DEFINER) | None |
| Event logging | `logEvent()` in `events.ts:254` uses INSERT — preserved | None |
| Event hydration | `useStore.ts:87` uses SELECT — preserved | None |
| Finance | Does not interact with events table | None |
| Arena / leaderboard | Uses `arena_scores`, not events | None |
| Settings / profile | Does not use events UPDATE/DELETE | None |
| Analytics / reports | Reads events via SELECT — preserved | None |

---

## 9. Potential Regression Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Undiscovered admin tool uses authenticated DELETE on events | Very Low | V1 + V4 verification queries will detect the issue post-deployment |
| Future feature assumes UPDATE/DELETE on events | Low | Migration comments document the restriction; add to project README |
| Column-level REVOKE on non-existent column-level grant | None | REVOKE is idempotent; this is a no-op |
| `"timestamp"` quoting causes issues | None | Double-quoting reserved words is standard PostgreSQL syntax |

---

## 10. Verification Queries

Seven verification queries (V1–V7) are embedded as comments at the end of the migration file. Summary:

| Query | What It Checks | Expected Result |
|---|---|---|
| V1 | `pg_policies` for events | Exactly 2 rows: SELECT and INSERT |
| V2 | `information_schema.table_privileges` | authenticated: SELECT + INSERT only |
| V3 | `information_schema.column_privileges` WHERE UPDATE | Zero rows for authenticated/anon/PUBLIC |
| V4 | `has_table_privilege('authenticated', ..., 'UPDATE')` | `false` |
| V5 | `has_column_privilege` for each column × UPDATE | All `false` |
| V6 | `pg_proc` for `award_xp_internal` | Owner = postgres, prosecdef = true |
| V7 | `COUNT(*)` on events | Non-zero (records intact) |

---

## 11. Rollback SQL

> [!CAUTION]
> For emergency use only. Restores the vulnerable state.

```sql
BEGIN;

CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT UPDATE ON public.events TO authenticated;
GRANT DELETE ON public.events TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
```

---

## 12. Confirmation Statement

> [!IMPORTANT]
> **I confirm the following:**
>
> 1. ✅ The migration file has been **prepared but NOT applied**.
> 2. ✅ No SQL was executed against Supabase.
> 3. ✅ `supabase db push` was NOT run.
> 4. ✅ No existing migration files were modified.
> 5. ✅ No migration history was changed.
> 6. ✅ No event records, XP balances, or user data were changed.
> 7. ✅ No profiles or XP-awarding functions were altered.
> 8. ✅ No frontend code was modified.
> 9. ✅ No test records were created in production.

---

## 13. Files Inspected for This Amendment

| File | What Was Verified |
|---|---|
| `20260703185015_create_events_table.sql` | Table column definitions (7 columns), original 4 policies |
| `20260706161500_repair_missing_tables.sql` | Duplicate policy creation confirmed |
| `20260711120000_progression_xp_foundation.sql` | `award_xp_internal` SECURITY DEFINER, owner = postgres |
| `20261013010000_goals_milestones_security_hardening.sql` (L125-162) | Column-level GRANT pattern reference; confirmed targets `goals` and `goal_milestones`, NOT `events` |
| All 42 migration files | Searched for `GRANT.*UPDATE.*(` — only 2 hits, both on goals/milestones tables |
| All 42 migration files | Searched for `(GRANT\|REVOKE).*events` — zero results |

---

**STOP — Awaiting review and authorization before applying.**
