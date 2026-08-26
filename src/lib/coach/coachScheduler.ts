/**
 * Coach Engine — Computation Scheduler & Dirty Checker (Phase 3.9.6)
 *
 * Controls when the AI Coach should execute expensive calculations by:
 * - Tracking input context signature hashes (dirty checking)
 * - Monitoring execution intervals (TTL / cooldown checking)
 * - Guarding against redundant per-render re-execution
 *
 * @module coach/coachScheduler
 */

import type { CoachInput } from './coachTypes';
import { COACH_INFRASTRUCTURE } from './coachConstants';

export interface CoachSchedulerInstance {
  generateContextHash: (input: CoachInput) => string;
  needsRefresh: (input: CoachInput, customTtlMs?: number) => boolean;
  markComputed: (input: CoachInput) => void;
  getLastRun: () => number | null;
  getElapsedSinceLastRun: () => number;
  nextSuggestedRun: (intervalMs?: number) => number;
  getLastContextHash: () => string | null;
  reset: () => void;
}

/**
 * Computes a fast deterministic signature hash of the CoachInput.
 */
export function generateContextHash(input: CoachInput): string {
  const {
    tasks,
    focusSessions,
    expenses,
    savingsGoals,
    profile,
    preferences,
    events,
    dailyGoalHistory,
    analytics,
  } = input;

  const parts = [
    `t:${tasks.length}`,
    `tc:${analytics.completedTasksCount}`,
    `fs:${focusSessions.length}`,
    `fm:${analytics.totalFocusMin}`,
    `e:${expenses.length}`,
    `es:${analytics.totalSpent}`,
    `sg:${savingsGoals.length}`,
    `p_xp:${profile.xp}`,
    `p_st:${profile.streak}`,
    `p_mb:${profile.monthly_budget}`,
    `pref_fg:${preferences.default_daily_focus_goal}`,
    `pref_tg:${preferences.default_task_goal}`,
    `ev:${events.length}`,
    `dgh:${dailyGoalHistory.length}`,
    `dgh_last:${dailyGoalHistory[dailyGoalHistory.length - 1]?.date || 'none'}`,
  ];

  const payload = parts.join('|');
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

/**
 * Creates an in-memory scheduler instance.
 */
export function createCoachScheduler(
  defaultIntervalMs = COACH_INFRASTRUCTURE.DEFAULT_SCHEDULER_INTERVAL_MS
): CoachSchedulerInstance {
  let lastRunTimestamp: number | null = null;
  let lastContextHash: string | null = null;

  function needsRefresh(input: CoachInput, customTtlMs = defaultIntervalMs): boolean {
    // 1. If never run before, definitely needs computation
    if (lastRunTimestamp === null || lastContextHash === null) {
      return true;
    }

    // 2. Check if data context hash changed (dirty checking)
    const currentHash = generateContextHash(input);
    if (currentHash !== lastContextHash) {
      return true;
    }

    // 3. Check if interval expired (time-based refresh)
    const elapsed = Date.now() - lastRunTimestamp;
    if (elapsed >= customTtlMs) {
      return true;
    }

    return false;
  }

  function markComputed(input: CoachInput): void {
    lastRunTimestamp = Date.now();
    lastContextHash = generateContextHash(input);
  }

  function getLastRun(): number | null {
    return lastRunTimestamp;
  }

  function getElapsedSinceLastRun(): number {
    return lastRunTimestamp ? Date.now() - lastRunTimestamp : Infinity;
  }

  function nextSuggestedRun(intervalMs = defaultIntervalMs): number {
    if (!lastRunTimestamp) return Date.now();
    return lastRunTimestamp + intervalMs;
  }

  function getLastContextHash(): string | null {
    return lastContextHash;
  }

  function reset(): void {
    lastRunTimestamp = null;
    lastContextHash = null;
  }

  return {
    generateContextHash,
    needsRefresh,
    markComputed,
    getLastRun,
    getElapsedSinceLastRun,
    nextSuggestedRun,
    getLastContextHash,
    reset,
  };
}

/**
 * Global singleton coach scheduler.
 */
export const coachScheduler = createCoachScheduler();
