# PHASE 3 / STEP 2 — Daily XP RPC Security Audit Report

> **FocusForge — Server-Authoritative Daily XP Remediation**
>
> Generated: 2026-11-07
>
> Status: AUDIT AND PROPOSED IMPLEMENTATION — NOT APPLIED
>
> No production SQL was executed. No migrations were applied. No data was modified.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Function Definitions and Defects](#2-current-function-definitions-and-defects)
3. [All Frontend RPC Callers](#3-all-frontend-rpc-callers)
4. [Client-Controlled XP Inputs](#4-client-controlled-xp-inputs)
5. [Existing Idempotency Mechanisms](#5-existing-idempotency-mechanisms)
6. [Completion Verification Gaps](#6-completion-verification-gaps)
7. [Proposed Corrected SQL Design](#7-proposed-corrected-sql-design)
8. [Proposed Frontend Changes](#8-proposed-frontend-changes)
9. [Migration and Rollback Strategy](#9-migration-and-rollback-strategy)
10. [Regression Test Plan](#10-regression-test-plan)
11. [Remaining Uncertainties](#11-remaining-uncertainties)

---

## 1. Executive Summary

The daily XP reward system has **three confirmed defects** and **two architectural weaknesses**:

### Confirmed Defects (Source Code — Definitive)

| ID | Defect | Impact |
|---|---|---|
| D1 | **Argument swap** in `claim_daily_goal` and `claim_daily_challenge` — positions 3 (`p_event_type`) and 5 (`p_reference_id`) are swapped when calling `award_xp_internal` | Event `type` and `reference_id` columns contain swapped values. The in-function idempotency check queries `reference_id`, which now holds a static string (`'goal_completed'`), causing all claims after the first on any day to be falsely rejected as "already claimed". |
| D2 | **Client-controlled `p_amount`** — the XP amount is passed from frontend JavaScript, including a value sourced from **localStorage** (`completionBonusXP`) | An attacker can modify localStorage to claim arbitrary XP (up to the 10,000 hard cap in `award_xp_internal`). |
| D3 | **No server-side completion verification** — neither `claim_daily_goal` nor `claim_daily_challenge` queries any data table to verify the goal/challenge was actually completed | A user can call the RPCs via browser DevTools without performing any activity. |

### Architectural Weaknesses

| ID | Weakness | Impact |
|---|---|---|
| W1 | Daily goals are **entirely client-defined** — goal configurations (types, targets, enabled state) exist only in localStorage via Zustand persist, with no database table | The server cannot verify whether a "goal" was completed because it has no knowledge of what goals the user has configured. |
| W2 | Daily challenges have **hardcoded completion checks in frontend JavaScript only** — `checkChallengeCompletion()` in `Achievements.tsx` runs in the browser | The server has no mechanism to evaluate challenge conditions, but the underlying data (focus sessions, tasks, expenses) does exist in database tables. |

### Recommendation

**W2 (challenges) is fixable server-side** — the database contains `focus_sessions`, `tasks`, and `expenses` with dates, allowing the server to independently verify challenge completion.

**W1 (goals) cannot be fully verified server-side** without creating a server-side goal configuration table. However, we can still make the system significantly more secure by:
1. Fixing the argument swap (D1)
2. Ignoring client-supplied `p_amount` and using server-determined fixed XP values (D2)
3. Adding server-side challenge verification where possible (D3/W2)
4. Adding a defensive XP cap as a secondary control

---

## 2. Current Function Definitions and Defects

### 2.1 `private.award_xp_internal` — Reference Implementation

**Source:** [`20260711120000_progression_xp_foundation.sql`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260711120000_progression_xp_foundation.sql#L46-L141)

```sql
CREATE OR REPLACE FUNCTION private.award_xp_internal(
  p_user_id UUID,        -- Position 1
  p_xp_amount INTEGER,   -- Position 2
  p_event_type TEXT,      -- Position 3 ← THE TYPE STRING (e.g., 'goal_completed')
  p_event_category TEXT,  -- Position 4
  p_reference_id TEXT,    -- Position 5 ← THE UNIQUE REFERENCE (e.g., 'daily_goal_focus_2026-11-07')
  p_metadata JSONB       -- Position 6
)
```

| Property | Value |
|---|---|
| Schema | `private` |
| Language | plpgsql |
| Security | SECURITY DEFINER |
| Owner | `postgres` (explicitly set at line 144) |
| search_path | `pg_catalog, public, private` |
| EXECUTE grants | Revoked from `PUBLIC`, `anon`, `authenticated` |

**Behavior:**
1. Validates inputs (null checks, XP > 0, XP ≤ 10000, string length limits)
2. Ensures profile exists
3. Canonicalizes metadata (force-sets `xp_earned` and `xp_source`)
4. INSERTs into `events` (will fail on unique index if duplicate)
5. UPDATEs `profiles.xp` via atomic increment
6. Returns authoritative total XP

**All other callers pass arguments correctly:**

| Caller | Source | Arg 3 (p_event_type) | Arg 5 (p_reference_id) | Correct? |
|---|---|---|---|---|
| `complete_task` | [`20260711123000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260711123000_task_completion_xp_pipeline.sql#L226-L238) L226 | `'task_completed'` | `v_reference_id` | ✅ |
| `unlock_achievement` | [`20260712210000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260712210000_server_authoritative_achievements.sql#L214-L221) L214 | `'achievement_unlocked'` | `v_achievement_id` | ✅ |
| `complete_milestone` | [`20261013010000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20261013010000_goals_milestones_security_hardening.sql#L289-L300) L289 | `'milestone_completed'` | `v_reference_id` | ✅ |
| `complete_goal` (base) | [`20261013010000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20261013010000_goals_milestones_security_hardening.sql#L512-L525) L512 | `'goal_completed'` | `v_base_ref` | ✅ |
| `complete_goal` (bonus) | [`20261013010000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20261013010000_goals_milestones_security_hardening.sql#L538-L550) L538 | `'goal_completed'` | `v_bonus_ref` | ✅ |
| **`claim_daily_goal`** | [`20260715120000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L68-L80) L68 | **`v_reference_id`** ❌ | **`'goal_completed'`** ❌ | **❌ SWAPPED** |
| **`claim_daily_challenge`** | [`20260715120000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L142-L154) L142 | **`v_reference_id`** ❌ | **`'challenge_completed'`** ❌ | **❌ SWAPPED** |

### 2.2 `claim_daily_goal` — Detailed Defect Analysis

**Source:** [`20260715120000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L19-L91) lines 19–91

**Signature:** `claim_daily_goal(p_goal_date date, p_goal_id text DEFAULT 'all', p_amount int DEFAULT 10)`

**The swap at lines 68–80:**

```sql
v_xp_awarded := private.award_xp_internal(
    v_user_id,         -- → p_user_id       ✅
    p_amount,          -- → p_xp_amount      ✅ (but client-controlled — D2)
    v_reference_id,    -- → p_event_type     ❌ SHOULD BE: 'goal_completed'
    'daily_goal',      -- → p_event_category ✅
    'goal_completed',  -- → p_reference_id   ❌ SHOULD BE: v_reference_id
    jsonb_build_object(...)
);
```

**Consequence chain:**

1. `events.type` receives values like `'daily_goal_2026-11-07'` or `'daily_goal_focus_2026-11-07'` instead of `'goal_completed'`
2. `events.reference_id` receives the static string `'goal_completed'` instead of the date-specific reference
3. **The in-function idempotency check** (lines 51–55) queries:
   ```sql
   SELECT EXISTS (
       SELECT 1 FROM events
       WHERE user_id = v_user_id
       AND reference_id = v_reference_id  -- v_reference_id = 'daily_goal_focus_2026-11-07'
   ) INTO v_already_claimed;
   ```
   But the stored `reference_id` is `'goal_completed'` (the static string), **not** `v_reference_id`. So this check **never finds the previously inserted event**.

4. **However**, `award_xp_internal` has its own idempotency via the unique index `events_xp_idempotency_idx` on `(user_id, type, reference_id)`:
   - First claim: inserts `(user_id, 'daily_goal_focus_2026-11-07', 'goal_completed')` → succeeds
   - Second claim for a **different** goal same day: inserts `(user_id, 'daily_goal_tasks_2026-11-07', 'goal_completed')` → type differs → **unique index does NOT block this** → **but wait**: the `reference_id` is the same static `'goal_completed'`. So the tuple is `(user_id, <different_type>, 'goal_completed')` — these are different tuples, so the unique index allows them.
   - The "all" claim: inserts `(user_id, 'daily_goal_2026-11-07', 'goal_completed')` → also succeeds (different type value)

5. **Net effect:** Despite the swap, XP awards still mostly work for the first claim of each goal type because the function-level idempotency check fails to match, but `award_xp_internal`'s unique index generates unique `(type, reference_id)` tuples per goal. However, the stored data is semantically wrong and event querying by `type = 'goal_completed'` will not find daily goal events.

### 2.3 `claim_daily_challenge` — Same Pattern

**Source:** [`20260715120000`](file:///d:/SWE%20Project/FocusForge%20Ad/supabase/migrations/20260715120000_server_authoritative_daily_claims.sql#L97-L183) lines 97–183

**Signature:** `claim_daily_challenge(p_challenge_id text, p_challenge_date date, p_amount int DEFAULT 20)`

Same swap at lines 142–154. Same consequences.

---

## 3. All Frontend RPC Callers

### 3.1 `claim_daily_goal` Callers

| # | File | Line(s) | Context | Parameters |
|---|---|---|---|---|
| 1 | [`useDailyGoalWatcher.ts`](file:///d:/SWE%20Project/FocusForge%20Ad/src/hooks/useDailyGoalWatcher.ts#L153-L157) | 153–157 | Individual goal completed | `p_goal_date: today, p_goal_id: p.id, p_amount: 10` |
| 2 | [`useDailyGoalWatcher.ts`](file:///d:/SWE%20Project/FocusForge%20Ad/src/hooks/useDailyGoalWatcher.ts#L190-L193) | 190–193 | All goals completed bonus | `p_goal_date: today, p_goal_id: 'all', p_amount: bonusXP` |

### 3.2 `claim_daily_challenge` Callers

| # | File | Line(s) | Context | Parameters |
|---|---|---|---|---|
| 1 | [`Achievements.tsx`](file:///d:/SWE%20Project/FocusForge%20Ad/src/pages/Achievements.tsx#L85-L89) | 85–89 | User clicks "Claim" button | `p_challenge_id: challengeId, p_challenge_date: today, p_amount: reward` |

---

## 4. Client-Controlled XP Inputs

### 4.1 `p_amount` Sources

| Caller | Value | Source | Manipulable? |
|---|---|---|---|
| Individual goal (watcher L156) | `10` | Hardcoded in source | No (without modifying JS bundle) |
| All-goals bonus (watcher L193) | `bonusXP` | `useDailyGoalsStore.completionBonusXP` → **localStorage** key `focusforge-daily-goals` | **YES — direct localStorage edit** |
| Challenge claim (Achievements L88) | `reward` | `DAILY_CHALLENGES[].reward` constant (10, 20, 25, 30) | Only via DevTools (modify runtime constant) |

### 4.2 `completionBonusXP` Attack Vector

From [`useDailyGoalsStore.ts`](file:///d:/SWE%20Project/FocusForge%20Ad/src/store/useDailyGoalsStore.ts#L186):

```typescript
completionBonusXP: 25,  // Default value, persisted to localStorage
```

**Persist config** (line 285): `name: 'focusforge-daily-goals'`

**Attack:**
```javascript
// In browser console:
const store = JSON.parse(localStorage.getItem('focusforge-daily-goals'));
store.state.completionBonusXP = 9999;
localStorage.setItem('focusforge-daily-goals', JSON.stringify(store));
// Next time all goals are completed, claim_daily_goal is called with p_amount: 9999
```

### 4.3 Other Client-Controlled Inputs

| Parameter | Source | Risk |
|---|---|---|
| `p_goal_date` | `format(new Date(), 'yyyy-MM-dd')` | Low — client can pass a past or future date. Server does not validate date bounds. |
| `p_goal_id` | Goal config `id` from localStorage | Low — arbitrary strings accepted. Only affects idempotency key construction. |
| `p_challenge_id` | `DAILY_CHALLENGES[].id` (e.g., `'c1'`) | Low — arbitrary strings accepted. |
| `p_challenge_date` | `new Date().toISOString().split('T')[0]` | Low — client can pass arbitrary dates. |

---

## 5. Existing Idempotency Mechanisms

### 5.1 Two-Layer Idempotency Design

**Layer 1 — In-function check** (claim RPCs):
```sql
SELECT EXISTS (
    SELECT 1 FROM events
    WHERE user_id = v_user_id
    AND reference_id = v_reference_id
) INTO v_already_claimed;
```
**Status:** ⚠️ Partially broken due to argument swap. Queries for a `reference_id` value that was stored in the `type` column instead.

**Layer 2 — `award_xp_internal` unique index:**
```sql
CREATE UNIQUE INDEX events_xp_idempotency_idx
  ON public.events(user_id, type, reference_id)
  WHERE reference_id IS NOT NULL AND metadata ? 'xp_earned';
```
**Status:** ✅ Functional but with swapped column values. The combination is still unique per goal/date, so duplicate awards for the *exact same* call are prevented.

### 5.2 Other Idempotency Indexes

| Index | On | Purpose |
|---|---|---|
| `events_focus_completion_reference_idx` | `(user_id, reference_id) WHERE type = 'focus_session_completed'` | Focus session dedup |
| `events_xp_idempotency_idx` | `(user_id, type, reference_id) WHERE reference_id IS NOT NULL AND metadata ? 'xp_earned'` | General XP dedup |

---

## 6. Completion Verification Gaps

### 6.1 Daily Goals — No Server Verification Possible (W1)

**Why:** Daily goal configurations exist only in localStorage. The server has no `daily_goals` table or `user_daily_goals` configuration table. Goal types include:

| Goal Type | Data Source | Server-Verifiable? |
|---|---|---|
| `focus` | `focus_sessions` (DB) | ✅ Yes — query today's focus minutes |
| `tasks` | `tasks` (DB) | ✅ Yes — query today's completed tasks |
| `xp` | `profiles.xp` (DB) | ⚠️ Partially — would need start-of-day snapshot |
| `budget` | `expenses` (DB) | ✅ Yes — query today's expense total |
| `expense_log` | `expenses` (DB) | ✅ Yes — check if any expenses logged today |
| `streak` | `profiles.streak` (DB) | ✅ Yes — check streak ≥ 1 |
| `custom` | localStorage only | ❌ No — no server-side data |

**Problem:** Even for verifiable goal types, the server doesn't know:
- Which goals are enabled
- What the user's target value is
- Whether the goal should be considered "completed"

**Conclusion:** Full server-side daily goal verification requires a `daily_goal_configs` table (user-scoped, server-persisted). This is beyond the scope of a hotfix.

### 6.2 Daily Challenges — Server Verification IS Possible (W2)

The `DAILY_CHALLENGES` array defines 4 challenges with **specific, verifiable** conditions:

| ID | Condition | Server Query |
|---|---|---|
| `c1` | 2+ focus sessions today | `SELECT COUNT(*) FROM focus_sessions WHERE user_id = $1 AND session_date = $2` |
| `c2` | 3+ expenses today | `SELECT COUNT(*) FROM expenses WHERE user_id = $1 AND expense_date = $2` |
| `c3` | 5+ tasks completed today | `SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'completed' AND completed_at::date = $2` |
| `c4` | 60+ focus minutes today | `SELECT COALESCE(SUM(minutes), 0) FROM focus_sessions WHERE user_id = $1 AND session_date = $2` |

**Conclusion:** Challenge completion CAN be verified server-side. The proposed implementation should add these verification queries.

---

## 7. Proposed Corrected SQL Design

### 7.1 Design Principles

1. **Fix the argument swap** — correct positions 3 and 5 in both functions
2. **Server-determined XP** — ignore `p_amount` for known goal/challenge types; use fixed server-side values
3. **Server-side challenge verification** — query database tables to confirm completion
4. **Date validation** — reject future dates and dates more than 1 day in the past
5. **Preserve function signatures** — keep `p_amount` in the parameter list for backward compatibility but ignore it
6. **Defensive XP cap** — as secondary control, not primary

### 7.2 XP Value Strategy

Rather than trusting `p_amount`, the server should determine XP from a known reward table:

| Claim Type | XP Award | Rationale |
|---|---|---|
| Individual daily goal | 10 | Matches current hardcoded value in frontend |
| All daily goals bonus | 25 | Matches default `completionBonusXP` |
| Challenge `c1` (2 sessions) | 20 | Matches `DAILY_CHALLENGES[0].reward` |
| Challenge `c2` (3 expenses) | 10 | Matches `DAILY_CHALLENGES[1].reward` |
| Challenge `c3` (5 tasks) | 25 | Matches `DAILY_CHALLENGES[2].reward` |
| Challenge `c4` (60 min focus) | 30 | Matches `DAILY_CHALLENGES[3].reward` |
| Unknown challenge ID | 10 | Safe default — prevents unknown IDs from awarding zero or arbitrary XP |

### 7.3 Proposed `claim_daily_goal` (Corrected)

```sql
CREATE OR REPLACE FUNCTION public.claim_daily_goal(
    p_goal_date date,
    p_goal_id text DEFAULT 'all',
    p_amount int DEFAULT 10        -- KEPT for backward compatibility; IGNORED by server
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
    v_server_xp int;
BEGIN
    -- 1. Authenticate
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Date validation: reject future dates and dates > 1 day ago
    IF p_goal_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot claim goals for future dates';
    END IF;
    IF p_goal_date < CURRENT_DATE - INTERVAL '1 day' THEN
        RAISE EXCEPTION 'Cannot claim goals older than yesterday';
    END IF;

    -- 3. Server-determined XP (client p_amount is IGNORED)
    IF p_goal_id = 'all' THEN
        v_server_xp := 25;  -- All-goals-completed bonus
    ELSE
        v_server_xp := 10;  -- Individual goal completion
    END IF;

    -- 4. Idempotency key
    IF p_goal_id = 'all' THEN
        v_reference_id := 'daily_goal_' || to_char(p_goal_date, 'YYYY-MM-DD');
    ELSE
        v_reference_id := 'daily_goal_' || p_goal_id || '_' || to_char(p_goal_date, 'YYYY-MM-DD');
    END IF;

    -- 5. Idempotency check (FIXED: query both type AND reference_id correctly)
    SELECT EXISTS (
        SELECT 1 FROM events
        WHERE user_id = v_user_id
        AND type = 'goal_completed'
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

    -- 6. Award XP (FIXED: argument order corrected)
    v_xp_awarded := private.award_xp_internal(
        v_user_id,
        v_server_xp,           -- Server-determined, not client p_amount
        'goal_completed',      -- p_event_type  (FIXED — was v_reference_id)
        'daily_goal',          -- p_event_category
        v_reference_id,        -- p_reference_id (FIXED — was 'goal_completed')
        jsonb_build_object(
            'goal_date', p_goal_date,
            'goal_id', p_goal_id,
            'xp_earned', v_server_xp,
            'xp_source', 'daily_goal',
            'client_requested_amount', p_amount  -- Audit trail of what client sent
        )
    );

    SELECT xp INTO v_total_xp FROM profiles WHERE id = v_user_id;

    RETURN json_build_object(
        'total_xp', v_total_xp,
        'xp_earned', v_server_xp,
        'already_claimed', false,
        'claimed', true
    );
END;
$$;
```

### 7.4 Proposed `claim_daily_challenge` (Corrected + Verification)

```sql
CREATE OR REPLACE FUNCTION public.claim_daily_challenge(
    p_challenge_id text,
    p_challenge_date date,
    p_amount int DEFAULT 20       -- KEPT for backward compatibility; IGNORED by server
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
    v_server_xp int;
    v_current_claims jsonb;
    v_claimed_array jsonb;
    v_new_claims jsonb;
    v_date_str text;
    v_completion_count int;
    v_is_completed boolean := false;
BEGIN
    -- 1. Authenticate
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Date validation
    IF p_challenge_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot claim challenges for future dates';
    END IF;
    IF p_challenge_date < CURRENT_DATE - INTERVAL '1 day' THEN
        RAISE EXCEPTION 'Cannot claim challenges older than yesterday';
    END IF;

    -- 3. Server-side challenge verification and XP determination
    CASE p_challenge_id
        WHEN 'c1' THEN
            -- "Complete 2 focus sessions" → 20 XP
            SELECT COUNT(*) INTO v_completion_count
            FROM focus_sessions
            WHERE user_id = v_user_id AND session_date = p_challenge_date;
            v_is_completed := (v_completion_count >= 2);
            v_server_xp := 20;

        WHEN 'c2' THEN
            -- "Add 3 expenses" → 10 XP
            SELECT COUNT(*) INTO v_completion_count
            FROM expenses
            WHERE user_id = v_user_id AND expense_date = p_challenge_date;
            v_is_completed := (v_completion_count >= 3);
            v_server_xp := 10;

        WHEN 'c3' THEN
            -- "Complete 5 tasks" → 25 XP
            SELECT COUNT(*) INTO v_completion_count
            FROM tasks
            WHERE user_id = v_user_id
              AND status = 'completed'
              AND completed_at IS NOT NULL
              AND completed_at::date = p_challenge_date;
            v_is_completed := (v_completion_count >= 5);
            v_server_xp := 25;

        WHEN 'c4' THEN
            -- "Focus for 60+ minutes" → 30 XP
            SELECT COALESCE(SUM(minutes), 0) INTO v_completion_count
            FROM focus_sessions
            WHERE user_id = v_user_id AND session_date = p_challenge_date;
            v_is_completed := (v_completion_count >= 60);
            v_server_xp := 30;

        ELSE
            -- Unknown challenge ID: reject to prevent exploitation
            RAISE EXCEPTION 'Unknown challenge ID: %', p_challenge_id;
    END CASE;

    -- 4. Reject if challenge not actually completed
    IF NOT v_is_completed THEN
        SELECT xp INTO v_total_xp FROM profiles WHERE id = v_user_id;
        RETURN json_build_object(
            'total_xp', v_total_xp,
            'xp_earned', 0,
            'already_claimed', false,
            'claimed', false,
            'reason', 'Challenge not completed'
        );
    END IF;

    -- 5. Idempotency key
    v_reference_id := 'daily_challenge_' || p_challenge_id || '_' || to_char(p_challenge_date, 'YYYY-MM-DD');

    -- 6. Idempotency check (FIXED: query type AND reference_id correctly)
    SELECT EXISTS (
        SELECT 1 FROM events
        WHERE user_id = v_user_id
        AND type = 'challenge_completed'
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

    -- 7. Award XP (FIXED: argument order corrected)
    v_xp_awarded := private.award_xp_internal(
        v_user_id,
        v_server_xp,               -- Server-determined
        'challenge_completed',     -- p_event_type  (FIXED)
        'daily_challenge',         -- p_event_category
        v_reference_id,            -- p_reference_id (FIXED)
        jsonb_build_object(
            'challenge_id', p_challenge_id,
            'challenge_date', p_challenge_date,
            'xp_earned', v_server_xp,
            'xp_source', 'daily_challenge',
            'client_requested_amount', p_amount  -- Audit trail
        )
    );

    -- 8. Update daily_challenge_claims on profile
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
        'xp_earned', v_server_xp,
        'already_claimed', false,
        'claimed', true
    );
END;
$$;
```

---

## 8. Proposed Frontend Changes

### 8.1 No Breaking Changes Required

The function signatures are preserved:
- `claim_daily_goal(p_goal_date, p_goal_id, p_amount)` — same parameter names and types
- `claim_daily_challenge(p_challenge_id, p_challenge_date, p_amount)` — same parameter names and types

The frontend will continue sending `p_amount`, but the server will ignore it. The return JSON structure is unchanged (`total_xp`, `xp_earned`, `already_claimed`, `claimed`).

### 8.2 Recommended (Non-Breaking) Frontend Changes

These are **quality improvements** that should be applied in a follow-up step, not as part of the migration:

| Change | File | Reason |
|---|---|---|
| Remove `p_amount` from RPC call parameters | `useDailyGoalWatcher.ts:156,193` | Server ignores it; reduces confusion |
| Remove `p_amount` from RPC call parameters | `Achievements.tsx:88` | Same |
| Handle new `reason` field in challenge response | `Achievements.tsx:90` | Show "Challenge not completed" if returned |
| Remove `completionBonusXP` from localStorage persist | `useDailyGoalsStore.ts:290` | No longer needed — server determines XP |

### 8.3 Challenge Completion Check — Frontend vs Server

The existing `checkChallengeCompletion()` in [`Achievements.tsx`](file:///d:/SWE%20Project/FocusForge%20Ad/src/pages/Achievements.tsx#L28-L39) controls the **UI visibility** of the "Claim" button. This should remain in place — it provides a good UX by hiding the button until the challenge appears complete. The server-side check is the **authoritative enforcement**.

---

## 9. Migration and Rollback Strategy

### 9.1 Proposed Migration File

**Filename:** `20261107010000_fix_daily_xp_rpcs.sql`

The migration uses `CREATE OR REPLACE FUNCTION` which is inherently idempotent and atomic. It:
1. Replaces both function bodies in-place
2. Does not change function signatures or parameter types
3. Does not affect EXECUTE grants (already set by `20260715122000`)
4. Does not modify existing event records

### 9.2 Backward Compatibility with Existing Events

Old events created with the swapped arguments have:
- `type` = reference_id value (e.g., `'daily_goal_focus_2026-11-07'`)
- `reference_id` = type string (e.g., `'goal_completed'`)

New events will have correct values. The corrected idempotency check queries `type = 'goal_completed' AND reference_id = v_reference_id`, which will NOT match old swapped events. This means:

> [!WARNING]
> **An edge case exists:** If a user has old swapped events from before the fix, and then the fix is applied, and the user tries to claim the same goal again (for the same date), the corrected idempotency check will not find the old event (because the old event's `type` and `reference_id` are swapped). The `award_xp_internal` unique index will catch the duplicate because `(user_id, old_type, old_reference_id)` ≠ `(user_id, new_type, new_reference_id)`, meaning it will INSERT a new event — **potentially awarding duplicate XP for that specific day's claims**.
>
> **Mitigation:** This edge case only affects the transition day (the day the migration is applied). For dates before the migration, the old events already awarded XP. For the transition day, if the user already claimed today before the migration, and then claims again after, a duplicate could occur.
>
> **Safe approach:** Apply the migration at the start of a new day (UTC midnight), when no claims for the current date exist yet.

### 9.3 Rollback SQL

```sql
-- EMERGENCY ROLLBACK — Restores the BROKEN behavior with argument swap
-- Only use if a critical regression is identified

-- Restore original claim_daily_goal (with swap defect)
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
-- [Original body from 20260715120000 lines 28-91]
-- Omitted for brevity — copy from the original migration file
$$;

-- Restore original claim_daily_challenge (with swap defect)
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
-- [Original body from 20260715120000 lines 106-183]
-- Omitted for brevity — copy from the original migration file
$$;
```

---

## 10. Regression Test Plan

### 10.1 Pre-Deployment Checks

| Check | Method | Expected |
|---|---|---|
| TypeScript compilation | `npx tsc --noEmit` | Zero errors |
| Frontend references unchanged | Search `claim_daily_goal` in src | 2 call sites, same parameters |
| Frontend references unchanged | Search `claim_daily_challenge` in src | 1 call site, same parameters |
| Migration SQL syntax | PostgreSQL syntax review | Valid plpgsql |

### 10.2 Post-Deployment Functional Tests

| Test | Steps | Expected Result |
|---|---|---|
| Individual goal claim | Complete a focus goal → verify XP awarded | `xp_earned: 10`, event with `type='goal_completed'` |
| All goals claim | Complete all daily goals → verify bonus | `xp_earned: 25` |
| Challenge c1 claim | Complete 2 focus sessions → claim | `xp_earned: 20` |
| Challenge c2 claim | Log 3 expenses → claim | `xp_earned: 10` |
| Challenge c3 claim | Complete 5 tasks → claim | `xp_earned: 25` |
| Challenge c4 claim | Focus 60+ minutes → claim | `xp_earned: 30` |
| Duplicate claim | Claim same goal twice | Second returns `already_claimed: true, xp_earned: 0` |
| Unmet challenge | Try claiming c1 with 0 sessions | Returns `claimed: false, reason: 'Challenge not completed'` |
| Future date | Call with tomorrow's date | Exception: 'Cannot claim for future dates' |
| Manipulated p_amount | Send `p_amount: 9999` | `xp_earned` = server value (10, 25, etc.), not 9999 |
| Unknown challenge ID | Send `p_challenge_id: 'fake'` | Exception: 'Unknown challenge ID' |

### 10.3 Verification Queries

```sql
-- V1: Verify corrected event format after claiming a goal
SELECT type, reference_id, metadata
FROM events
WHERE user_id = auth.uid()
AND category = 'daily_goal'
ORDER BY timestamp DESC
LIMIT 5;
-- Expected: type = 'goal_completed', reference_id = 'daily_goal_<id>_<date>'

-- V2: Verify corrected event format after claiming a challenge
SELECT type, reference_id, metadata
FROM events
WHERE user_id = auth.uid()
AND category = 'daily_challenge'
ORDER BY timestamp DESC
LIMIT 5;
-- Expected: type = 'challenge_completed', reference_id = 'daily_challenge_<id>_<date>'

-- V3: Check for audit trail of client-requested amount
SELECT metadata->>'client_requested_amount' AS client_amount,
       metadata->>'xp_earned' AS server_amount
FROM events
WHERE user_id = auth.uid()
AND category IN ('daily_goal', 'daily_challenge')
ORDER BY timestamp DESC
LIMIT 10;
```

---

## 11. Remaining Uncertainties

### 11.1 Live Database State (UNKNOWN)

| Item | Status | Impact |
|---|---|---|
| Whether `claim_daily_goal` function exists on live DB | UNKNOWN — inferred from migration | If missing, `CREATE OR REPLACE` will create it |
| Whether function body matches migration | UNKNOWN — could have been manually edited | `CREATE OR REPLACE` overwrites regardless |
| Whether `events_xp_idempotency_idx` exists | UNKNOWN — inferred from migration | Corrected idempotency check does not depend solely on this index |
| Whether `focus_sessions.session_date` column exists | UNKNOWN — needed for challenge verification queries | If missing, c1 and c4 verification will fail |
| Whether `tasks.completed_at` column exists | UNKNOWN — needed for c3 verification | If missing, c3 verification will fail |
| Number of existing swapped events | UNKNOWN — requires `SELECT COUNT(*)` | Affects transition-day duplicate risk |

### 11.2 Required Manual Supabase Checks Before Applying

| # | Check | Query |
|---|---|---|
| 1 | Verify `focus_sessions` has `session_date` column | `SELECT column_name FROM information_schema.columns WHERE table_name = 'focus_sessions' AND column_name = 'session_date';` |
| 2 | Verify `tasks` has `completed_at` column | `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at';` |
| 3 | Verify `expenses` has `expense_date` column | `SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'expense_date';` |
| 4 | Count existing swapped daily events | `SELECT COUNT(*) FROM events WHERE reference_id IN ('goal_completed', 'challenge_completed');` |
| 5 | Confirm current function exists | `SELECT proname FROM pg_proc WHERE proname = 'claim_daily_goal';` |

### 11.3 Daily Goals — Limitations Accepted

Full server-side daily goal completion verification is **not possible** without a server-side goal configuration table. The proposed fix:
- Fixes the argument swap (correctness)
- Uses server-determined fixed XP values (security)
- Adds date validation (safety)
- Preserves idempotency (reliability)
- Does NOT verify that the user actually completed the goal (accepted limitation)

This limitation is acceptable because:
1. Individual goal XP is small (10 XP)
2. The all-goals bonus is modest (25 XP)
3. The primary exploit vector (localStorage-controlled `p_amount`) is eliminated
4. The idempotency prevents repeated claims for the same goal on the same date
5. A future phase can add a `daily_goal_configs` table for full verification

---

## Confirmation Statement

> [!IMPORTANT]
> **I confirm the following:**
>
> 1. ✅ This report is an AUDIT AND DESIGN DOCUMENT only.
> 2. ✅ No SQL was executed against Supabase.
> 3. ✅ No migrations were applied or pushed.
> 4. ✅ No production data was modified.
> 5. ✅ No existing migration files were changed.
> 6. ✅ No XP balances were altered.
> 7. ✅ No secrets or service-role credentials were exposed.
> 8. ✅ The proposed migration file has NOT been created yet — awaiting authorization.

**STOP — Awaiting independent review and authorization before creating the migration file or applying anything.**

