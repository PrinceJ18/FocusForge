// =============================================================================
// Goals & Milestones TypeScript Types
// =============================================================================
// Aligned with:
//   - supabase/migrations/20261013000000_goals_and_milestones.sql (schema)
//   - supabase/migrations/20261013010000_goals_milestones_security_hardening.sql (RPCs, grants)
//
// Type groups:
//   1. Enum-like unions matching SQL CHECK constraints
//   2. Database row types (full row shape)
//   3. Input types (client-allowed INSERT/UPDATE columns only)
//   4. RPC response types (matching JSONB return values)

// ─── Enum-Like Unions (SQL CHECK constraints) ────────────────────────────────

/** Matches: CHECK (period IN ('daily', 'weekly', 'monthly', 'custom', 'long_term')) */
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'custom' | 'long_term';

/** Matches: CHECK (progress_method IN ('milestone', 'manual')) */
export type GoalProgressMethod = 'milestone' | 'manual';

/** Matches: CHECK (status IN ('in_progress', 'completed', 'delayed', 'abandoned')) */
export type GoalStatus = 'in_progress' | 'completed' | 'delayed' | 'abandoned';

// ─── Database Row Types ──────────────────────────────────────────────────────

/** Full row shape for public.goals table */
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;               // NOT NULL DEFAULT ''
  period: GoalPeriod;
  progress_method: GoalProgressMethod;
  manual_progress_pct: number;        // 0-100, server default 0
  start_date: string;                 // DATE as yyyy-MM-dd
  deadline: string | null;            // DATE as yyyy-MM-dd, nullable
  status: GoalStatus;                 // server default 'in_progress'
  is_strict: boolean;                 // server default false
  base_xp: number;                    // server default 50, read-only on client
  bonus_xp: number;                   // server default 25, read-only on client
  completed_at: string | null;        // TIMESTAMPTZ ISO, server-controlled
  created_at: string;                 // TIMESTAMPTZ ISO
  updated_at: string;                 // TIMESTAMPTZ ISO
}

/** Full row shape for public.goal_milestones table */
export interface GoalMilestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  completed: boolean;                 // server default false, RPC-controlled
  completed_at: string | null;        // TIMESTAMPTZ ISO, RPC-controlled
  xp_reward: number;                  // server default 10, read-only on client
  sort_order: number;                 // server default 0
  linked_task_id: string | null;      // FK to tasks, nullable
  created_at: string;                 // TIMESTAMPTZ ISO
  updated_at: string;                 // TIMESTAMPTZ ISO
}

// ─── Client Input Types (matching column-level INSERT/UPDATE grants) ─────────

/**
 * Fields the client is allowed to INSERT for a new goal.
 * Protected columns (id, status, base_xp, bonus_xp, completed_at, timestamps)
 * use server-generated defaults.
 */
export interface CreateGoalInput {
  title: string;
  description?: string;
  period: GoalPeriod;
  progress_method: GoalProgressMethod;
  manual_progress_pct?: number;
  start_date?: string;
  deadline?: string | null;
  is_strict?: boolean;
}

/**
 * Fields the client is allowed to UPDATE on an existing goal.
 * Matches the column-level UPDATE grant in the corrective migration.
 */
export interface UpdateGoalInput {
  title?: string;
  description?: string;
  period?: GoalPeriod;
  progress_method?: GoalProgressMethod;
  manual_progress_pct?: number;
  start_date?: string;
  deadline?: string | null;
  is_strict?: boolean;
}

/**
 * Fields the client is allowed to INSERT for a new milestone.
 * Protected columns (id, completed, completed_at, xp_reward, timestamps)
 * use server-generated defaults.
 */
export interface CreateMilestoneInput {
  goal_id: string;
  title: string;
  sort_order?: number;
  linked_task_id?: string | null;
}

/**
 * Fields the client is allowed to UPDATE on an existing milestone.
 * Matches the column-level UPDATE grant in the corrective migration.
 */
export interface UpdateMilestoneInput {
  title?: string;
  sort_order?: number;
  linked_task_id?: string | null;
}

// ─── RPC Response Types ──────────────────────────────────────────────────────

/** Matches the JSONB return value of public.complete_milestone(UUID) */
export interface CompleteMilestoneResult {
  milestone_id: string;
  goal_id: string;
  completed: boolean;
  completed_at: string | null;
  xp_earned: number;
  total_xp: number;
  already_completed: boolean;
}

/** Matches the JSONB return value of public.uncomplete_milestone(UUID) */
export interface UncompleteMilestoneResult {
  milestone_id: string;
  goal_id: string;
  completed: boolean;
  was_completed: boolean;
}

/** Matches the JSONB return value of public.complete_goal(UUID) */
export interface CompleteGoalResult {
  goal_id: string;
  status: string;
  completed_at: string | null;
  base_xp_earned: number;
  bonus_xp_earned: number;
  bonus_eligible?: boolean;
  total_xp: number;
  already_completed: boolean;
}
