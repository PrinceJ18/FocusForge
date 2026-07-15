import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { useDailyGoalsStore } from '../store/useDailyGoalsStore';
import type { DailyGoalHistory } from '../store/useDailyGoalsStore';
import {
  computeOverallProgress,
  getEnabledGoalProgresses,
} from '../lib/dailyGoalsUtils';
import { logEvent } from '../lib/events';
import { supabase } from '../lib/supabase';

/**
 * Global daily-goal watcher — mount ONCE in App.tsx alongside useTimerEngine.
 *
 * Responsibilities:
 * 1. Day-change detection → snapshot yesterday, reset for new day
 * 2. Daily XP start tracking
 * 3. Goal completion detection → fire notifications + award XP
 * 4. All-goals-completed detection → celebration notification + bonus XP
 *
 * Reads existing store data reactively — no new event plumbing needed.
 */
export function useDailyGoalWatcher() {
  const prevProgressRef = useRef<Map<string, boolean>>(new Map());

  // Subscribe to relevant slices from both stores
  const focusSessions = useStore((s) => s.focusSessions);
  const tasks = useStore((s) => s.tasks);
  const expenses = useStore((s) => s.expenses);
  const profile = useStore((s) => s.profile);
  const user = useStore((s) => s.user);

  const goalConfigs = useDailyGoalsStore((s) => s.goalConfigs);
  const customGoalProgress = useDailyGoalsStore((s) => s.customGoalProgress);
  const notifiedGoalIds = useDailyGoalsStore((s) => s.notifiedGoalIds);
  const notifiedAllComplete = useDailyGoalsStore((s) => s.notifiedAllComplete);
  const notifiedDate = useDailyGoalsStore((s) => s.notifiedDate);
  const notificationsEnabled = useDailyGoalsStore((s) => s.notificationsEnabled);
  const dailyXPStart = useDailyGoalsStore((s) => s.dailyXPStart);
  const dailyXPDate = useDailyGoalsStore((s) => s.dailyXPDate);
  const lastSnapshotDate = useDailyGoalsStore((s) => s.lastSnapshotDate);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // ── Day-change detection ──────────────────────────────
    // If today is different from the last notified date, reset for new day
    if (notifiedDate !== today) {
      useDailyGoalsStore.getState().resetNotifiedForNewDay(today);
      prevProgressRef.current = new Map();
    }

    // If today differs from the last XP snapshot date, capture today's starting XP
    if (dailyXPDate !== today) {
      useDailyGoalsStore.getState().updateDailyXPStart(profile.xp, today);
    }

    // If we haven't snapshotted yesterday and there's a previous date, do it
    if (lastSnapshotDate && lastSnapshotDate !== today) {
      // Snapshot yesterday's final state
      // We only have current state, so we just capture what we know
      // (The last snapshot was already taken if it existed)
    }

    // Reset custom goal progress on new day
    if (lastSnapshotDate && lastSnapshotDate !== today) {
      // First, create a history entry for the previous day
      const goalsState = useDailyGoalsStore.getState();
      const enabled = goalsState.goalConfigs.filter((g) => g.enabled);

      if (enabled.length > 0) {
        const progressParams = {
          focusSessions,
          tasks,
          expenses,
          profile,
          customGoalProgress: goalsState.customGoalProgress,
          dailyXPStart: goalsState.dailyXPStart,
          dailyXPDate: goalsState.dailyXPDate,
        };

        const progresses = getEnabledGoalProgresses(goalsState.goalConfigs, progressParams);
        const overall = computeOverallProgress(goalsState.goalConfigs, progressParams);

        const historyEntry: DailyGoalHistory = {
          date: lastSnapshotDate,
          completionPct: overall.pct,
          completedCount: overall.completed,
          totalCount: overall.total,
          goals: progresses.map((p) => ({
            id: p.id,
            name: p.name,
            target: p.target,
            current: p.current,
            completed: p.completed,
          })),
          focusMinutes: progresses.find((p) => p.type === 'focus')?.current || 0,
          tasksCompleted: progresses.find((p) => p.type === 'tasks')?.current || 0,
          xpEarned: progresses.find((p) => p.type === 'xp')?.current || 0,
          expensesLogged: progresses.find((p) => p.type === 'expense_log')?.current || 0,
          totalSpent: progresses.find((p) => p.type === 'budget')?.current || 0,
        };

        goalsState.addHistoryEntry(historyEntry);
      }

      // Reset custom goal progress for new day
      useDailyGoalsStore.getState().resetDailyProgress();
      // Update the snapshot date to today
      useDailyGoalsStore.setState({ lastSnapshotDate: today });
    }

    // If lastSnapshotDate is empty (first ever use), set it to today
    if (!lastSnapshotDate) {
      useDailyGoalsStore.setState({ lastSnapshotDate: today });
    }

    // ── Goal completion detection ─────────────────────────
    if (!notificationsEnabled) return;

    const progressParams = {
      focusSessions,
      tasks,
      expenses,
      profile,
      customGoalProgress,
      dailyXPStart,
      dailyXPDate,
    };

    const progresses = getEnabledGoalProgresses(goalConfigs, progressParams);
    const overall = computeOverallProgress(goalConfigs, progressParams);

    // Check for individual goal completions
    for (const p of progresses) {
      const wasCompleted = prevProgressRef.current.get(p.id) || false;

      if (p.completed && !wasCompleted && !notifiedGoalIds.includes(p.id)) {
        // Goal just completed — notify!
        useStore.getState().showNotification({
          type: 'goal',
          title: `${p.name} Complete!`,
          message: `Goal achieved: ${p.icon} ${p.name}`,
          xp: 10,
        });

        // Award XP
        if (user) {
          supabase.rpc('claim_daily_goal', {
            p_goal_date: format(new Date(), 'yyyy-MM-dd'),
            p_goal_id: p.id,
            p_amount: 10
          }).then(({ data, error }) => {
             if (!error && data && data.xp_earned > 0) {
                 useStore.setState((state) => ({
                    profile: { ...state.profile, xp: data.total_xp }
                 }));
             }
          });
        } else {
          useStore.getState().addXP(10);
        }

        // Mark as notified
        useDailyGoalsStore.getState().markGoalNotified(p.id);
      }
    }

    // Check for all-goals-completed
    if (
      overall.total > 0 &&
      overall.completed === overall.total &&
      !notifiedAllComplete
    ) {
      const bonusXP = useDailyGoalsStore.getState().completionBonusXP;

      setTimeout(() => {
        useStore.getState().showNotification({
          type: 'achievement',
          title: '🎉 All Daily Goals Completed!',
          message: `Perfect day! +${bonusXP} XP bonus`,
          xp: bonusXP,
        });

        if (user) {
          supabase.rpc('claim_daily_goal', {
            p_goal_date: format(new Date(), 'yyyy-MM-dd'),
            p_goal_id: 'all',
            p_amount: bonusXP
          }).then(({ data, error }) => {
             if (!error && data && data.xp_earned > 0) {
                 useStore.setState((state) => ({
                    profile: { ...state.profile, xp: data.total_xp }
                 }));
             }
          });
        } else {
          useStore.getState().addXP(bonusXP);
          logEvent('daily_goals_completed', 'tasks', undefined, {
            xpEarned: bonusXP,
            description: 'Completed all daily goals!',
          });
        }

        useDailyGoalsStore.getState().markAllCompleteNotified();
        useDailyGoalsStore.getState().lastCompletedAllDate = format(new Date(), 'yyyy-MM-dd');
      }, 600); // Slight delay to stack after individual notification
    }

    // Update previous progress snapshot
    const newMap = new Map<string, boolean>();
    for (const p of progresses) {
      newMap.set(p.id, p.completed);
    }
    prevProgressRef.current = newMap;
  }, [
    focusSessions,
    tasks,
    expenses,
    profile,
    goalConfigs,
    customGoalProgress,
    notifiedGoalIds,
    notifiedAllComplete,
    notifiedDate,
    notificationsEnabled,
    dailyXPStart,
    dailyXPDate,
    lastSnapshotDate,
    user,
  ]);
}
