// =============================================================================
// Goals & Milestones Data Access Layer
// =============================================================================
// Follows the exact same patterns as storeUtils.ts:
//   - Optimistic local update → Supabase mutation → rollback on error
//   - RPC calls for server-authoritative operations (completion, XP)
//   - setProfileXPAuthoritative for server-sourced XP totals
//
// No guest mode fallback — goals require authenticated Supabase access.
// Protected columns (status, base_xp, completed, xp_reward, etc.) are never
// set by the client. Column-level INSERT/UPDATE grants enforce this server-side.

import { supabase } from '../lib/supabase';
import { formatLocalDate } from '../lib/dateUtils';
import { useStore } from './useStore';
import { checkUnlocksAndMilestones } from '../lib/events';
import type {
  Goal,
  GoalMilestone,
  CreateGoalInput,
  UpdateGoalInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  CompleteMilestoneResult,
  UncompleteMilestoneResult,
  CompleteGoalResult,
} from '../types/goals';


// ─── Goal CRUD ───────────────────────────────────────────────────────────────

/**
 * Fetch all goals for the authenticated user and populate the store.
 */
export const fetchGoals = async (userId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (data) useStore.getState().setGoals(data);
};

/**
 * Create a new goal with optimistic update.
 *
 * Only sends client-allowed columns (matching INSERT column grants).
 * Protected columns (id, status, base_xp, bonus_xp, completed_at, timestamps)
 * use server-generated defaults.
 */
export const createGoal = async (
  input: CreateGoalInput,
  userId: string
): Promise<Goal> => {
  const store = useStore.getState();
  const now = new Date().toISOString();

  // Optimistic placeholder with server defaults for protected columns
  const tempId = crypto.randomUUID();
  const tempGoal: Goal = {
    id: tempId,
    user_id: userId,
    title: input.title,
    description: input.description ?? '',
    period: input.period,
    progress_method: input.progress_method,
    manual_progress_pct: input.manual_progress_pct ?? 0,
    start_date: input.start_date ?? formatLocalDate(new Date()),
    deadline: input.deadline ?? null,
    status: 'in_progress',
    is_strict: input.is_strict ?? false,
    base_xp: 50,     // Server default
    bonus_xp: 25,    // Server default
    completed_at: null,
    created_at: now,
    updated_at: now,
  };

  store.addGoalLocal(tempGoal);

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? '',
      period: input.period,
      progress_method: input.progress_method,
      manual_progress_pct: input.manual_progress_pct ?? 0,
      start_date: input.start_date ?? formatLocalDate(new Date()),
      deadline: input.deadline ?? null,
      is_strict: input.is_strict ?? false,
    })
    .select()
    .single();

  if (error) {
    store.removeGoalLocal(tempId);
    throw error;
  }

  // Replace optimistic placeholder with server-confirmed data
  store.removeGoalLocal(tempId);
  store.addGoalLocal(data as Goal);
  return data as Goal;
};

/**
 * Update an existing goal with optimistic update.
 * Only sends client-allowed UPDATE columns.
 */
export const updateGoal = async (
  id: string,
  updates: UpdateGoalInput
): Promise<void> => {
  const store = useStore.getState();
  const original = store.goals.find((g) => g.id === id);
  const now = new Date().toISOString();

  store.updateGoalLocal(id, { ...updates, updated_at: now });

  const { error } = await supabase
    .from('goals')
    .update({
      ...updates,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    if (original) store.updateGoalLocal(id, original);
    throw error;
  }
};

/**
 * Delete a goal with optimistic update.
 * Server-side CASCADE deletes associated milestones.
 */
export const deleteGoal = async (id: string): Promise<void> => {
  const store = useStore.getState();
  const original = store.goals.find((g) => g.id === id);
  const originalMilestones = store.goalMilestones.filter((m) => m.goal_id === id);

  // Optimistic: remove goal and its milestones
  store.removeGoalLocal(id);
  store.removeMilestonesByGoalLocal(id);

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) {
    // Rollback: restore goal and milestones
    if (original) store.addGoalLocal(original);
    originalMilestones.forEach((m) => store.addMilestoneLocal(m));
    throw error;
  }
};


// ─── Milestone CRUD ──────────────────────────────────────────────────────────

/**
 * Fetch all milestones for the authenticated user and populate the store.
 */
export const fetchMilestones = async (userId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  if (data) useStore.getState().setGoalMilestones(data);
};

/**
 * Create a new milestone with optimistic update.
 *
 * Only sends client-allowed columns (matching INSERT column grants).
 * Protected columns (id, completed, completed_at, xp_reward, timestamps)
 * use server-generated defaults.
 */
export const createMilestone = async (
  input: CreateMilestoneInput,
  userId: string
): Promise<GoalMilestone> => {
  const store = useStore.getState();
  const now = new Date().toISOString();

  const tempId = crypto.randomUUID();
  const tempMilestone: GoalMilestone = {
    id: tempId,
    goal_id: input.goal_id,
    user_id: userId,
    title: input.title,
    completed: false,
    completed_at: null,
    xp_reward: 10,     // Server default
    sort_order: input.sort_order ?? 0,
    linked_task_id: input.linked_task_id ?? null,
    created_at: now,
    updated_at: now,
  };

  store.addMilestoneLocal(tempMilestone);

  const { data, error } = await supabase
    .from('goal_milestones')
    .insert({
      goal_id: input.goal_id,
      user_id: userId,
      title: input.title,
      sort_order: input.sort_order ?? 0,
      linked_task_id: input.linked_task_id ?? null,
    })
    .select()
    .single();

  if (error) {
    store.removeMilestoneLocal(tempId);
    throw error;
  }

  // Replace optimistic placeholder with server-confirmed data
  store.removeMilestoneLocal(tempId);
  store.addMilestoneLocal(data as GoalMilestone);
  return data as GoalMilestone;
};

/**
 * Update an existing milestone with optimistic update.
 * Only sends client-allowed UPDATE columns.
 */
export const updateMilestone = async (
  id: string,
  updates: UpdateMilestoneInput
): Promise<void> => {
  const store = useStore.getState();
  const original = store.goalMilestones.find((m) => m.id === id);
  const now = new Date().toISOString();

  store.updateMilestoneLocal(id, { ...updates, updated_at: now });

  const { error } = await supabase
    .from('goal_milestones')
    .update({
      ...updates,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    if (original) store.updateMilestoneLocal(id, original);
    throw error;
  }
};

/**
 * Delete a milestone with optimistic update.
 */
export const deleteMilestone = async (id: string): Promise<void> => {
  const store = useStore.getState();
  const original = store.goalMilestones.find((m) => m.id === id);

  store.removeMilestoneLocal(id);

  const { error } = await supabase
    .from('goal_milestones')
    .delete()
    .eq('id', id);

  if (error) {
    if (original) store.addMilestoneLocal(original);
    throw error;
  }
};


// ─── RPC Completion Operations ───────────────────────────────────────────────
// These use server-authoritative RPCs. No optimistic updates for protected
// fields — local state is only updated after server confirmation.

/**
 * Complete a milestone via the complete_milestone RPC.
 *
 * Updates local milestone state and XP from the server response.
 * Idempotent: re-completing returns already_completed with xp_earned=0.
 */
export const completeMilestone = async (
  milestoneId: string
): Promise<CompleteMilestoneResult> => {
  const { data, error } = await supabase.rpc('complete_milestone', {
    p_milestone_id: milestoneId,
  });

  if (error) throw error;

  const result = data as CompleteMilestoneResult;
  const store = useStore.getState();

  // Update local state from server-confirmed result
  store.updateMilestoneLocal(milestoneId, {
    completed: result.completed,
    completed_at: result.completed_at,
    updated_at: new Date().toISOString(),
  });

  // Update parent goal's updated_at to signal change
  store.updateGoalLocal(result.goal_id, {
    updated_at: new Date().toISOString(),
  });

  // Set authoritative XP from server
  store.setProfileXPAuthoritative(result.total_xp);

  // Notify user if XP was earned
  if (result.xp_earned > 0) {
    const milestone = store.goalMilestones.find((m) => m.id === milestoneId);
    store.showNotification({
      type: 'xp',
      title: `+${result.xp_earned} XP Earned`,
      message: `Milestone completed: ${milestone?.title ?? 'Milestone'}`,
      xp: result.xp_earned,
    });
  }

  // Check for new unlocks if this was a first-time completion
  if (!result.already_completed) {
    checkUnlocksAndMilestones();
  }

  return result;
};

/**
 * Reopen a completed milestone via the uncomplete_milestone RPC.
 *
 * XP is non-deductible: reopening does not remove earned XP.
 */
export const uncompleteMilestone = async (
  milestoneId: string
): Promise<UncompleteMilestoneResult> => {
  const { data, error } = await supabase.rpc('uncomplete_milestone', {
    p_milestone_id: milestoneId,
  });

  if (error) throw error;

  const result = data as UncompleteMilestoneResult;
  const store = useStore.getState();

  // Update local state from server-confirmed result
  if (result.was_completed) {
    store.updateMilestoneLocal(milestoneId, {
      completed: false,
      completed_at: null,
      updated_at: new Date().toISOString(),
    });

    // Update parent goal's updated_at to signal change
    store.updateGoalLocal(result.goal_id, {
      updated_at: new Date().toISOString(),
    });
  }

  return result;
};

/**
 * Complete a goal via the complete_goal RPC.
 *
 * The RPC validates progress (all milestones completed or manual_progress_pct=100),
 * determines bonus eligibility, and awards base + bonus XP atomically.
 */
export const completeGoal = async (
  goalId: string
): Promise<CompleteGoalResult> => {
  const { data, error } = await supabase.rpc('complete_goal', {
    p_goal_id: goalId,
  });

  if (error) throw error;

  const result = data as CompleteGoalResult;
  const store = useStore.getState();

  // Update local state from server-confirmed result
  store.updateGoalLocal(goalId, {
    status: 'completed',
    completed_at: result.completed_at,
    updated_at: new Date().toISOString(),
  });

  // Set authoritative XP from server
  store.setProfileXPAuthoritative(result.total_xp);

  // Notify user if XP was earned
  const totalXpEarned = result.base_xp_earned + result.bonus_xp_earned;
  if (totalXpEarned > 0) {
    const goal = store.goals.find((g) => g.id === goalId);
    const bonusText = result.bonus_xp_earned > 0
      ? ` (includes ${result.bonus_xp_earned} bonus XP)`
      : '';
    store.showNotification({
      type: 'xp',
      title: `+${totalXpEarned} XP Earned${bonusText}`,
      message: `Goal completed: ${goal?.title ?? 'Goal'}`,
      xp: totalXpEarned,
    });
  }

  // Check for new unlocks if this was a first-time completion
  if (!result.already_completed) {
    checkUnlocksAndMilestones();
  }

  return result;
};
