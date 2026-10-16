import { StateCreator } from 'zustand';
import { AppState, GoalsSlice } from './types';

/**
 * Goals & Milestones Zustand slice.
 *
 * Follows the same pattern as productivitySlice.ts and financeSlice.ts:
 * - Array state with bulk setters for initial hydration
 * - Local mutators for optimistic updates (add/update/remove)
 * - No async logic — all Supabase calls live in goalsStoreUtils.ts
 */
export const createGoalsSlice: StateCreator<AppState, [], [], GoalsSlice> = (set) => ({
  goals: [],
  goalMilestones: [],

  // ─── Bulk Setters (used by loadUserData) ─────────────────────────────────

  setGoals: (goals) => set({ goals }),
  setGoalMilestones: (goalMilestones) => set({ goalMilestones }),

  // ─── Goal Local Mutators ─────────────────────────────────────────────────

  addGoalLocal: (goal) =>
    set((s) => ({ goals: [goal, ...s.goals] })),

  updateGoalLocal: (id, updates) =>
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),

  removeGoalLocal: (id) =>
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

  // ─── Milestone Local Mutators ────────────────────────────────────────────

  addMilestoneLocal: (milestone) =>
    set((s) => ({
      goalMilestones: [...s.goalMilestones, milestone],
    })),

  updateMilestoneLocal: (id, updates) =>
    set((s) => ({
      goalMilestones: s.goalMilestones.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  removeMilestoneLocal: (id) =>
    set((s) => ({
      goalMilestones: s.goalMilestones.filter((m) => m.id !== id),
    })),

  /** Remove all milestones belonging to a goal (used during CASCADE delete) */
  removeMilestonesByGoalLocal: (goalId) =>
    set((s) => ({
      goalMilestones: s.goalMilestones.filter((m) => m.goal_id !== goalId),
    })),
});
