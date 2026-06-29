import { isToday, isThisMonth, parseISO, differenceInCalendarDays, format } from 'date-fns';
import type { FocusSession, Task, Expense, Profile } from '../store/useStore';
import type { SavingsGoal } from '../store/useStore';

// ============================================================
// Focus Statistics — Single Source of Truth
// ============================================================

/** Today's total focus minutes */
export function getTodayFocusMinutes(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isToday(parseISO(s.session_date)))
    .reduce((sum, s) => sum + s.minutes, 0);
}

/** Today's total focus session count */
export function getTodayFocusSessions(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isToday(parseISO(s.session_date)))
    .reduce((sum, s) => sum + s.sessions_count, 0);
}

/** This month's total focus minutes */
export function getMonthlyFocusMinutes(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isThisMonth(parseISO(s.session_date)))
    .reduce((sum, s) => sum + s.minutes, 0);
}

/** This month's total focus session count */
export function getMonthlyFocusSessions(focusSessions: FocusSession[]): number {
  return focusSessions
    .filter((s) => isThisMonth(parseISO(s.session_date)))
    .reduce((sum, s) => sum + s.sessions_count, 0);
}

/** All-time total focus session count */
export function getAllTimeFocusSessions(focusSessions: FocusSession[]): number {
  return focusSessions.reduce((sum, s) => sum + s.sessions_count, 0);
}

/** All-time total focus minutes */
export function getAllTimeFocusMinutes(focusSessions: FocusSession[]): number {
  return focusSessions.reduce((sum, s) => sum + s.minutes, 0);
}

// ============================================================
// Task Statistics — Single Source of Truth
// ============================================================

/** Tasks completed today */
export function getTodayCompletedTasks(tasks: Task[]): number {
  return tasks.filter(
    (t) => t.completed && t.completed_at && isToday(parseISO(t.completed_at))
  ).length;
}

/** Tasks completed this month */
export function getMonthlyCompletedTasks(tasks: Task[]): number {
  return tasks.filter(
    (t) => t.completed && t.completed_at && isThisMonth(parseISO(t.completed_at))
  ).length;
}

/** All pending (incomplete) tasks */
export function getPendingTasksCount(tasks: Task[]): number {
  return tasks.filter((t) => !t.completed).length;
}

/** All completed tasks (all time) */
export function getCompletedTasksCount(tasks: Task[]): number {
  return tasks.filter((t) => t.completed).length;
}

// ============================================================
// Expense Statistics — Single Source of Truth
// ============================================================

/** Expenses recorded today */
export function getTodayExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => {
    try { return isToday(parseISO(e.expense_date)); } catch { return false; }
  });
}

/** Count of expenses recorded today */
export function getTodayExpensesCount(expenses: Expense[]): number {
  return getTodayExpenses(expenses).length;
}

/** Total amount spent today */
export function getTodayExpensesAmount(expenses: Expense[]): number {
  return getTodayExpenses(expenses).reduce((sum, e) => sum + e.amount, 0);
}

/** Expenses recorded this month */
export function getMonthlyExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => {
    try { return isThisMonth(parseISO(e.expense_date)); } catch { return false; }
  });
}

/** Total amount spent this month */
export function getMonthlyExpensesAmount(expenses: Expense[]): number {
  return getMonthlyExpenses(expenses).reduce((sum, e) => sum + e.amount, 0);
}

// ============================================================
// Badge System — Single Source of Truth
// ============================================================

/**
 * All available badges in the system.
 * This is the canonical list used by Rewards, Dashboard, and any other page.
 */
export const ALL_BADGES = [
  { id: 'first_focus', name: 'First Focus', icon: '🎯', desc: 'Complete your first focus session', xpReq: 0, focusReq: 1, color: '#a855f7' },
  { id: 'focus_10', name: 'Focus Master', icon: '🧠', desc: 'Complete 10 focus sessions', xpReq: 0, focusReq: 10, color: '#7c3aed' },
  { id: 'streak_3', name: 'Consistent', icon: '🔥', desc: 'Maintain a 3-day streak', streakReq: 3, color: '#f59e0b' },
  { id: 'streak_7', name: 'Week Warrior', icon: '⚡', desc: 'Maintain a 7-day streak', streakReq: 7, color: '#f59e0b' },
  { id: 'streak_30', name: 'Unstoppable', icon: '💪', desc: '30-day streak achieved', streakReq: 30, color: '#ef4444' },
  { id: 'xp_100', name: 'Rising Star', icon: '⭐', desc: 'Earn 100 XP', xpReq: 100, color: '#fbbf24' },
  { id: 'xp_500', name: 'Champion', icon: '🏆', desc: 'Earn 500 XP', xpReq: 500, color: '#f59e0b' },
  { id: 'xp_1000', name: 'Legend', icon: '👑', desc: 'Earn 1000 XP', xpReq: 1000, color: '#ec4899' },
  { id: 'task_10', name: 'Task Crusher', icon: '✅', desc: 'Complete 10 tasks', tasksReq: 10, color: '#10b981' },
  { id: 'task_50', name: 'Productivity Pro', icon: '🚀', desc: 'Complete 50 tasks', tasksReq: 50, color: '#06b6d4' },
  { id: 'budget_month', name: 'Budget Keeper', icon: '💰', desc: 'Stay within budget for a month', color: '#10b981' },
  { id: 'first_save', name: 'Saver', icon: '🐷', desc: 'Create your first savings goal', color: '#ec4899' },
] as const;

/**
 * Dynamically compute earned badge IDs from current stats.
 * This is the SINGLE SOURCE OF TRUTH for badge status across the entire app.
 */
export function getEarnedBadgeIds(params: {
  profile: Profile;
  focusSessions: FocusSession[];
  tasks: Task[];
  savingsGoals: SavingsGoal[];
}): Set<string> {
  const { profile, focusSessions, tasks, savingsGoals } = params;

  const completedFocusSessions = getAllTimeFocusSessions(focusSessions);
  const completedTasks = getCompletedTasksCount(tasks);

  // Start with badges already persisted in profile
  const earned = new Set(profile.badges.map((b) => b.id));

  // Dynamically check all badge conditions
  if (completedFocusSessions >= 1) earned.add('first_focus');
  if (completedFocusSessions >= 10) earned.add('focus_10');
  if (profile.streak >= 3) earned.add('streak_3');
  if (profile.streak >= 7) earned.add('streak_7');
  if (profile.streak >= 30) earned.add('streak_30');
  if (profile.xp >= 100) earned.add('xp_100');
  if (profile.xp >= 500) earned.add('xp_500');
  if (profile.xp >= 1000) earned.add('xp_1000');
  if (completedTasks >= 10) earned.add('task_10');
  if (completedTasks >= 50) earned.add('task_50');
  if (savingsGoals.length >= 1) earned.add('first_save');

  return earned;
}

// ============================================================
// Streak — Calendar-Day Based Calculation
// ============================================================

/**
 * Compute the new streak value based on calendar days.
 *
 * Rules:
 * - If last active was yesterday → increment streak by 1
 * - If last active is today → keep current streak (no double-count)
 * - Otherwise (missed 1+ days) → reset to 1
 */
export function computeStreak(lastActiveDate: string, currentStreak: number): number {
  if (!lastActiveDate) return 1;

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Normalize to date-only to avoid timezone issues
  const lastDate = parseISO(lastActiveDate);
  const todayDate = parseISO(todayStr);

  const diffDays = differenceInCalendarDays(todayDate, lastDate);

  if (diffDays === 0) {
    // Same calendar day — streak already counted
    return currentStreak;
  } else if (diffDays === 1) {
    // Consecutive day — increment
    return currentStreak + 1;
  } else {
    // Gap of 2+ days — reset
    return 1;
  }
}
