import { format } from 'date-fns';
import type { DailyGoalConfig, DailyGoalHistory, GoalType } from '../store/useDailyGoalsStore';
import type { FocusSession, Task, Expense, Profile } from '../store/useStore';
import {
  getTodayFocusMinutes,
  getTodayCompletedTasks,
  getTodayExpensesCount,
  getTodayExpensesAmount,
} from './statsUtils';

// ============================================================
// Goal Progress Computation — Single Source of Truth
// ============================================================

export interface GoalProgress {
  id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  current: number;
  pct: number;
  completed: boolean;
  unit: string;
  type: GoalType;
}

export interface OverallProgress {
  pct: number;
  completed: number;
  total: number;
  remainingMinutes: number;
  motivationMessage: string;
}

export interface SmartRecommendation {
  goalId: string;
  goalName: string;
  icon: string;
  message: string;
  suggestedTarget: number;
  color: string;
}

/**
 * Compute the current progress for a single goal.
 *
 * Reuses existing statsUtils.ts functions — no duplicate logic.
 */
export function computeGoalProgress(
  config: DailyGoalConfig,
  params: {
    focusSessions: FocusSession[];
    tasks: Task[];
    expenses: Expense[];
    profile: Profile;
    customGoalProgress: Record<string, number>;
    dailyXPStart: number;
    dailyXPDate: string;
  }
): GoalProgress {
  const { focusSessions, tasks, expenses, profile, customGoalProgress, dailyXPStart, dailyXPDate } = params;
  const today = format(new Date(), 'yyyy-MM-dd');

  let current = 0;

  switch (config.type) {
    case 'focus':
      current = getTodayFocusMinutes(focusSessions);
      break;

    case 'tasks':
      current = getTodayCompletedTasks(tasks);
      break;

    case 'xp':
      // XP earned today = current XP - start-of-day snapshot
      if (dailyXPDate === today) {
        current = Math.max(0, profile.xp - dailyXPStart);
      } else {
        current = 0; // New day, no snapshot yet
      }
      break;

    case 'budget':
      // Budget goal: "stay under X" — current = amount spent
      // Completed when spending <= target
      current = getTodayExpensesAmount(expenses);
      break;

    case 'expense_log':
      // Checkbox: did user log at least 1 expense today?
      current = getTodayExpensesCount(expenses) > 0 ? 1 : 0;
      break;

    case 'streak':
      // Checkbox: does user have an active streak?
      current = profile.streak >= 1 ? 1 : 0;
      break;

    case 'custom':
      current = customGoalProgress[config.id] || 0;
      break;
  }

  // Budget goal has inverse logic: completed when spending ≤ target
  const isBudgetGoal = config.type === 'budget';

  const completed = isBudgetGoal
    ? current <= config.target
    : current >= config.target;

  // Percentage calculation
  let pct: number;
  if (isBudgetGoal) {
    // Show how much of budget is "safe" — 100% when 0 spent, 0% when over budget
    pct = config.target > 0
      ? Math.max(0, Math.min(100, ((config.target - current) / config.target) * 100))
      : (current === 0 ? 100 : 0);
  } else {
    pct = config.target > 0
      ? Math.min(100, (current / config.target) * 100)
      : (current > 0 ? 100 : 0);
  }

  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    color: config.color,
    target: config.target,
    current,
    pct: Math.round(pct),
    completed,
    unit: config.unit,
    type: config.type,
  };
}

/**
 * Compute overall progress across all enabled goals.
 */
export function computeOverallProgress(
  configs: DailyGoalConfig[],
  params: {
    focusSessions: FocusSession[];
    tasks: Task[];
    expenses: Expense[];
    profile: Profile;
    customGoalProgress: Record<string, number>;
    dailyXPStart: number;
    dailyXPDate: string;
  }
): OverallProgress {
  const enabled = configs.filter((g) => g.enabled).sort((a, b) => a.order - b.order);

  if (enabled.length === 0) {
    return {
      pct: 0,
      completed: 0,
      total: 0,
      remainingMinutes: 0,
      motivationMessage: getMotivationMessage(0),
    };
  }

  const progresses = enabled.map((g) => computeGoalProgress(g, params));
  const completedCount = progresses.filter((p) => p.completed).length;
  const overallPct = Math.round(
    progresses.reduce((sum, p) => sum + p.pct, 0) / enabled.length
  );

  // Estimate remaining time: rough heuristic based on focus and task goals
  const remainingMinutes = estimateRemainingTime(progresses);

  return {
    pct: overallPct,
    completed: completedCount,
    total: enabled.length,
    remainingMinutes,
    motivationMessage: getMotivationMessage(overallPct),
  };
}

/**
 * Get all goal progresses sorted by order.
 */
export function getEnabledGoalProgresses(
  configs: DailyGoalConfig[],
  params: {
    focusSessions: FocusSession[];
    tasks: Task[];
    expenses: Expense[];
    profile: Profile;
    customGoalProgress: Record<string, number>;
    dailyXPStart: number;
    dailyXPDate: string;
  }
): GoalProgress[] {
  return configs
    .filter((g) => g.enabled)
    .sort((a, b) => a.order - b.order)
    .map((g) => computeGoalProgress(g, params));
}

// ============================================================
// Motivation Messages
// ============================================================

export function getMotivationMessage(pct: number): string {
  if (pct >= 100) return 'All goals crushed! 🏆';
  if (pct >= 80) return 'Almost there! Keep going 🔥';
  if (pct >= 60) return 'Great momentum! 💪';
  if (pct >= 40) return "You're making progress 🚀";
  if (pct >= 20) return 'Good start, keep pushing! ⚡';
  return "Let's get started! 🎯";
}

// ============================================================
// Remaining Time Estimation
// ============================================================

function estimateRemainingTime(progresses: GoalProgress[]): number {
  let totalMinutes = 0;

  for (const p of progresses) {
    if (p.completed) continue;

    const remaining = p.target - p.current;
    if (remaining <= 0) continue;

    switch (p.type) {
      case 'focus':
        totalMinutes += remaining; // 1:1 mapping
        break;
      case 'tasks':
        totalMinutes += remaining * 10; // ~10 min per task estimate
        break;
      case 'xp':
        totalMinutes += remaining * 2; // ~2 min per XP estimate
        break;
      case 'custom':
        if (p.unit === 'minutes') totalMinutes += remaining;
        else if (p.unit === 'hours') totalMinutes += remaining * 60;
        else totalMinutes += remaining * 5; // generic estimate
        break;
      // Budget, expense_log, streak: no time estimate
    }
  }

  return Math.max(0, Math.round(totalMinutes));
}

// ============================================================
// Smart Recommendations
// ============================================================

/**
 * Analyze goal history and provide adaptive recommendations.
 * These are suggestions only — never forced.
 */
export function getSmartRecommendations(
  history: DailyGoalHistory[],
  currentConfigs: DailyGoalConfig[]
): SmartRecommendation[] {
  const recommendations: SmartRecommendation[] = [];

  if (history.length < 3) return recommendations; // Need enough data

  const recent = history.slice(0, 7); // Last 7 days
  const avgCompletion = recent.reduce((s, h) => s + h.completionPct, 0) / recent.length;

  // If user consistently completes everything easily, suggest increasing
  if (avgCompletion >= 95 && recent.length >= 5) {
    // Find which goals to increase
    for (const config of currentConfigs) {
      if (!config.enabled || config.isCustom || config.unit === 'checkbox') continue;

      const goalHistory = recent.map((h) =>
        h.goals.find((g) => g.id === config.id)
      ).filter(Boolean);

      const allCompleted = goalHistory.every((g) => g!.completed);
      if (allCompleted) {
        const suggestedTarget = Math.ceil(config.target * 1.15); // +15%
        recommendations.push({
          goalId: config.id,
          goalName: config.name,
          icon: '📈',
          message: `You've been crushing this! Try increasing to ${suggestedTarget}${getUnitSuffix(config.unit)}`,
          suggestedTarget,
          color: config.color,
        });
      }
    }
  }

  // If yesterday was bad, suggest easier goals
  if (history.length > 0 && history[0].completionPct < 40) {
    recommendations.push({
      goalId: '_general',
      goalName: 'Recovery Day',
      icon: '🌱',
      message: 'Yesterday was tough. Consider setting smaller targets today.',
      suggestedTarget: 0,
      color: '#10b981',
    });
  }

  // If average is low, suggest reducing difficulty
  if (avgCompletion < 50 && recent.length >= 5) {
    recommendations.push({
      goalId: '_difficulty',
      goalName: 'Adjust Difficulty',
      icon: '⚙️',
      message: 'Your completion rate is low. Try switching to Easy mode.',
      suggestedTarget: 0,
      color: '#f59e0b',
    });
  }

  return recommendations.slice(0, 3);
}

function getUnitSuffix(unit: string): string {
  switch (unit) {
    case 'minutes': return ' min';
    case 'hours': return 'h';
    case 'tasks': return ' tasks';
    case 'xp': return ' XP';
    case '₹': return '';
    default: return '';
  }
}

// ============================================================
// Format helpers
// ============================================================

export function formatGoalValue(current: number, unit: string, type: GoalType): string {
  if (unit === 'checkbox') return current >= 1 ? '✓' : '—';
  if (unit === '₹' || type === 'budget') return `₹${current}`;
  if (unit === 'minutes') return `${current}m`;
  if (unit === 'hours') return `${current}h`;
  if (unit === 'xp') return `${current} XP`;
  return String(current);
}

export function formatGoalTarget(target: number, unit: string, type: GoalType): string {
  if (unit === 'checkbox') return '';
  if (unit === '₹' || type === 'budget') return `₹${target}`;
  if (unit === 'minutes') return `${target}m`;
  if (unit === 'hours') return `${target}h`;
  if (unit === 'xp') return `${target} XP`;
  return String(target);
}
