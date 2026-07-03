import type { FocusSession, Task, Expense, SavingsGoal, Profile } from '../../store/useStore';
import {
  calculateTodayFocus,
  calculateTodaySessions,
  calculateAllTimeFocusMinutes,
} from './focus';
import {
  calculateTodayTasks,
  calculateCompletedTasks,
  calculatePendingTasks,
} from './tasks';
import {
  calculateBudgetUsage,
  calculateCategoryBreakdown,
} from './finance';
import { getEarnedBadgeIds } from '../statsUtils';

export interface DashboardStats {
  completedTasks: number;
  totalTasks: number;
  totalFocusMinutes: number;
  earnedBadgesCount: number;
  streak: number;
  totalSpent: number;
  available: number;
  budgetPct: number;
  todayMinutes: number;
  todaySessionCount: number;
  pendingTasks: number;
  completedToday: number;
  categoryData: Array<{ name: string; value: number; fill: string }>;
  productivityScore: number;
  productivityStatus: string;
  budgetUsedPercent: number;
  budgetHealth: string;
  budgetColor: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f59e0b',
  transport: '#06b6d4',
  shopping: '#ec4899',
  entertainment: '#a855f7',
  health: '#10b981',
  education: '#3b82f6',
  utilities: '#6b7280',
  other: '#8b5cf6',
};

export function calculateDashboardStatistics(params: {
  expenses: Expense[];
  tasks: Task[];
  focusSessions: FocusSession[];
  savingsGoals: SavingsGoal[];
  profile: Profile;
}): DashboardStats {
  const { expenses, tasks, focusSessions, savingsGoals, profile } = params;

  const completedTasks = calculateCompletedTasks(tasks);
  const totalTasks = tasks?.length || 0;
  const totalFocusMinutes = calculateAllTimeFocusMinutes(focusSessions);
  const earnedBadges = getEarnedBadgeIds({ profile, focusSessions, tasks, savingsGoals });
  const streak = profile?.streak || 0;

  const { totalSpent, available, budgetPct } = calculateBudgetUsage(expenses, profile.monthly_budget);

  const todayMinutes = calculateTodayFocus(focusSessions);
  const todaySessionCount = calculateTodaySessions(focusSessions);

  const pendingTasks = calculatePendingTasks(tasks);
  const completedToday = calculateTodayTasks(tasks);

  // Category breakdown for donut
  const categoriesList = Object.entries(CATEGORY_COLORS).map(([id, color]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    color,
  }));
  const categoryDataRaw = calculateCategoryBreakdown(expenses, categoriesList);
  const categoryData = categoryDataRaw.map(entry => ({
    name: entry.name,
    value: entry.value,
    fill: entry.fill || '#8b5cf6',
  })).slice(0, 5);

  // Productivity Score
  const productivityScore = Math.min(
    100,
    Math.round(
      (completedTasks * 12) +
      (totalFocusMinutes * 0.35) +
      (streak * 5) +
      (totalSpent < profile.monthly_budget ? 15 : 0)
    )
  );

  let productivityStatus = 'Needs Improvement';
  if (productivityScore >= 80) {
    productivityStatus = 'Excellent';
  } else if (productivityScore >= 60) {
    productivityStatus = 'Good';
  } else if (productivityScore >= 40) {
    productivityStatus = 'Average';
  }

  const budgetUsedPercent = Math.min(
    100,
    Math.floor(profile.monthly_budget > 0 ? (totalSpent / profile.monthly_budget) * 100 : 0)
  );

  let budgetHealth = 'Healthy';
  if (budgetUsedPercent >= 90) {
    budgetHealth = 'Critical';
  } else if (budgetUsedPercent >= 70) {
    budgetHealth = 'Warning';
  } else if (budgetUsedPercent >= 50) {
    budgetHealth = 'Moderate';
  }

  const budgetColor =
    budgetUsedPercent < 50
      ? '#10b981'
      : budgetUsedPercent < 80
        ? '#f59e0b'
        : '#ef4444';

  return {
    completedTasks,
    totalTasks,
    totalFocusMinutes,
    earnedBadgesCount: earnedBadges.size,
    streak,
    totalSpent,
    available,
    budgetPct,
    todayMinutes,
    todaySessionCount,
    pendingTasks,
    completedToday,
    categoryData,
    productivityScore,
    productivityStatus,
    budgetUsedPercent,
    budgetHealth,
    budgetColor,
  };
}
