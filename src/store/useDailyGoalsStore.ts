import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export type GoalUnit = 'minutes' | 'hours' | 'tasks' | 'xp' | '₹' | 'count' | 'checkbox';
export type GoalType = 'focus' | 'tasks' | 'xp' | 'budget' | 'expense_log' | 'streak' | 'custom';
export type GoalDifficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

export interface DailyGoalConfig {
  id: string;
  type: GoalType;
  name: string;
  target: number;
  unit: GoalUnit;
  enabled: boolean;
  icon: string;
  color: string;
  order: number;
  isCustom: boolean;
  category?: string;
}

export interface DailyGoalHistoryEntry {
  id: string;
  name: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface DailyGoalHistory {
  date: string; // yyyy-MM-dd
  completionPct: number;
  completedCount: number;
  totalCount: number;
  goals: DailyGoalHistoryEntry[];
  focusMinutes: number;
  tasksCompleted: number;
  xpEarned: number;
  expensesLogged: number;
  totalSpent: number;
}

// ============================================================
// Default Goal Configs
// ============================================================

export const DEFAULT_GOAL_CONFIGS: DailyGoalConfig[] = [
  {
    id: 'goal_focus',
    type: 'focus',
    name: 'Focus Time',
    target: 120,
    unit: 'minutes',
    enabled: true,
    icon: '⏱',
    color: '#a855f7',
    order: 0,
    isCustom: false,
  },
  {
    id: 'goal_tasks',
    type: 'tasks',
    name: 'Tasks Completed',
    target: 6,
    unit: 'tasks',
    enabled: true,
    icon: '✅',
    color: '#10b981',
    order: 1,
    isCustom: false,
  },
  {
    id: 'goal_xp',
    type: 'xp',
    name: 'Daily XP',
    target: 50,
    unit: 'xp',
    enabled: true,
    icon: '⚡',
    color: '#f59e0b',
    order: 2,
    isCustom: false,
  },
  {
    id: 'goal_budget',
    type: 'budget',
    name: 'Budget Limit',
    target: 500,
    unit: '₹',
    enabled: true,
    icon: '💰',
    color: '#06b6d4',
    order: 3,
    isCustom: false,
  },
  {
    id: 'goal_expense_log',
    type: 'expense_log',
    name: "Log Today's Expenses",
    target: 1,
    unit: 'checkbox',
    enabled: true,
    icon: '📝',
    color: '#ec4899',
    order: 4,
    isCustom: false,
  },
  {
    id: 'goal_streak',
    type: 'streak',
    name: 'Maintain Streak',
    target: 1,
    unit: 'checkbox',
    enabled: true,
    icon: '🔥',
    color: '#ef4444',
    order: 5,
    isCustom: false,
  },
];

// ============================================================
// Store Interface
// ============================================================

interface DailyGoalsState {
  goalConfigs: DailyGoalConfig[];
  history: DailyGoalHistory[];
  difficulty: GoalDifficulty;
  completionBonusXP: number;
  notificationsEnabled: boolean;
  lastCompletedAllDate: string;
  lastSnapshotDate: string;

  // Custom goal progress for today (checkbox/count type custom goals)
  customGoalProgress: Record<string, number>;

  // Track which goals have already fired completion notifications today
  notifiedGoalIds: string[];
  notifiedAllComplete: boolean;
  notifiedDate: string;

  // Track daily XP start for computing "XP earned today"
  dailyXPStart: number;
  dailyXPDate: string;

  // Actions
  updateGoalConfig: (id: string, updates: Partial<DailyGoalConfig>) => void;
  addCustomGoal: (goal: Omit<DailyGoalConfig, 'id' | 'order'>) => void;
  removeCustomGoal: (id: string) => void;
  reorderGoals: (orderedIds: string[]) => void;
  toggleGoal: (id: string) => void;
  addHistoryEntry: (entry: DailyGoalHistory) => void;
  resetToDefaults: () => void;
  setDifficulty: (d: GoalDifficulty) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setCompletionBonusXP: (v: number) => void;

  // Custom goal progress
  updateCustomGoalProgress: (id: string, value: number) => void;
  resetDailyProgress: () => void;

  // Notification tracking
  markGoalNotified: (goalId: string) => void;
  markAllCompleteNotified: () => void;
  resetNotifiedForNewDay: (date: string) => void;

  // Daily XP tracking
  updateDailyXPStart: (xp: number, date: string) => void;
}

// ============================================================
// Store
// ============================================================

export const useDailyGoalsStore = create<DailyGoalsState>()(
  persist(
    (set, get) => ({
      goalConfigs: DEFAULT_GOAL_CONFIGS,
      history: [],
      difficulty: 'medium',
      completionBonusXP: 25,
      notificationsEnabled: true,
      lastCompletedAllDate: '',
      lastSnapshotDate: '',
      customGoalProgress: {},
      notifiedGoalIds: [],
      notifiedAllComplete: false,
      notifiedDate: '',
      dailyXPStart: 0,
      dailyXPDate: '',

      updateGoalConfig: (id, updates) =>
        set((s) => ({
          goalConfigs: s.goalConfigs.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        })),

      addCustomGoal: (goal) => {
        const id = `custom_${crypto.randomUUID().slice(0, 8)}`;
        const maxOrder = Math.max(...get().goalConfigs.map((g) => g.order), -1);
        set((s) => ({
          goalConfigs: [
            ...s.goalConfigs,
            { ...goal, id, order: maxOrder + 1 },
          ],
        }));
      },

      removeCustomGoal: (id) =>
        set((s) => ({
          goalConfigs: s.goalConfigs.filter((g) => g.id !== id),
          customGoalProgress: (() => {
            const copy = { ...s.customGoalProgress };
            delete copy[id];
            return copy;
          })(),
        })),

      reorderGoals: (orderedIds) =>
        set((s) => ({
          goalConfigs: s.goalConfigs.map((g) => ({
            ...g,
            order: orderedIds.indexOf(g.id),
          })),
        })),

      toggleGoal: (id) =>
        set((s) => ({
          goalConfigs: s.goalConfigs.map((g) =>
            g.id === id ? { ...g, enabled: !g.enabled } : g
          ),
        })),

      addHistoryEntry: (entry) =>
        set((s) => ({
          history: [entry, ...s.history].slice(0, 90), // Keep last 90 days
          lastSnapshotDate: entry.date,
        })),

      resetToDefaults: () =>
        set({
          goalConfigs: DEFAULT_GOAL_CONFIGS,
          difficulty: 'medium',
          completionBonusXP: 25,
          customGoalProgress: {},
        }),

      setDifficulty: (difficulty) => set({ difficulty }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setCompletionBonusXP: (completionBonusXP) => set({ completionBonusXP }),

      updateCustomGoalProgress: (id, value) =>
        set((s) => ({
          customGoalProgress: { ...s.customGoalProgress, [id]: value },
        })),

      resetDailyProgress: () =>
        set({ customGoalProgress: {} }),

      markGoalNotified: (goalId) =>
        set((s) => ({
          notifiedGoalIds: [...s.notifiedGoalIds, goalId],
        })),

      markAllCompleteNotified: () =>
        set({ notifiedAllComplete: true }),

      resetNotifiedForNewDay: (date) =>
        set({
          notifiedGoalIds: [],
          notifiedAllComplete: false,
          notifiedDate: date,
        }),

      updateDailyXPStart: (xp, date) =>
        set({ dailyXPStart: xp, dailyXPDate: date }),
    }),
    {
      name: 'focusforge-daily-goals',
      partialize: (state) => ({
        goalConfigs: state.goalConfigs,
        history: state.history,
        difficulty: state.difficulty,
        completionBonusXP: state.completionBonusXP,
        notificationsEnabled: state.notificationsEnabled,
        lastCompletedAllDate: state.lastCompletedAllDate,
        lastSnapshotDate: state.lastSnapshotDate,
        customGoalProgress: state.customGoalProgress,
        notifiedGoalIds: state.notifiedGoalIds,
        notifiedAllComplete: state.notifiedAllComplete,
        notifiedDate: state.notifiedDate,
        dailyXPStart: state.dailyXPStart,
        dailyXPDate: state.dailyXPDate,
      }),
    }
  )
);
