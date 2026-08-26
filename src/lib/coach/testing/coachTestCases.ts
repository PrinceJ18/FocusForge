/**
 * Coach QA Suite — Deterministic Test Scenarios (Phase 3.9.7)
 *
 * Provides a comprehensive collection of 10 deterministic test cases covering
 * edge cases, high intensity, financial distress, burnout, habit anomalies, and new users.
 *
 * All mock data is immutable, fully-typed, and produces 100% reproducible engine outputs.
 *
 * @module coach/testing/coachTestCases
 */

import type { CoachInput } from '../coachTypes';
import type { Task, FocusSession, Expense, Profile, SavingsGoal, UserPreferences } from '../../../store/slices/types';
import type { DailyGoalHistory } from '../../../store/useDailyGoalsStore';
import type { AppEvent } from '../../events';
import type { AnalyticsEngineResult } from '../../statistics/analyticsEngine';

// ═══════════════════════════════════════════════════════════════
// Baseline Mock Factory
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  accent_color: 'purple',
  card_style: 'rounded',
  animation: 'full',
  font_size: 'medium',
  ui_density: 'comfortable',
  default_pomodoro: 25,
  default_short_break: 5,
  default_long_break: 15,
  auto_start_next_session: false,
  auto_start_break: false,
  auto_start_focus: false,
  play_completion_sound: true,
  enable_timer_notifications: true,
  show_full_screen_mode: false,
  focus_ring_style: 'gradient',
  default_timer_mode: 'pomodoro',
  default_daily_focus_goal: 120,
  default_task_goal: 6,
  default_xp_goal: 50,
  default_budget_goal: 500,
  enable_goal_focus: true,
  enable_goal_tasks: true,
  enable_goal_xp: true,
  enable_goal_budget: true,
  goal_difficulty: 'medium',
  goal_order: '',
  notify_xp: true,
  notify_level_up: true,
  notify_achievements: true,
  notify_badges: true,
  notify_goals: true,
  notify_focus_timer: true,
  notify_weekly_report: true,
  notify_monthly_report: true,
  notify_recurring_expenses: true,
  notify_budget_alerts: true,
  notify_arena_champion: true,
  notify_arena_personal_best: true,
  notify_arena_rank_up: true,
  notify_arena_activity: true,
  reminder_time: '09:00',
  notification_sound: 'default',
  currency: 'INR',
  default_monthly_budget: 10000,
  budget_alert_low_warning: true,
  budget_alert_overspending: true,
  recurring_expense_reminder: true,
  week_start_day: 'monday',
  default_dashboard_view: 'weekly',
  default_analytics_chart: 'bar',
  preferred_date_format: 'dd/MM/yyyy',
  preferred_time_format: '12h',
  high_contrast: false,
  keyboard_navigation: false,
  screen_reader_support: false,
  dashboard_widgets: '',
  dashboard_hidden_widgets: '',
  dashboard_compact: false,
  dashboard_pinned_widgets: '',
};

function createMockAnalytics(overrides: Partial<AnalyticsEngineResult> = {}): AnalyticsEngineResult {
  return {
    period: '30d',
    daysCount: 30,
    hasData: true,
    totalSpent: 4500,
    totalFocusMin: 1800,
    totalFocusHours: 30,
    completedTasksCount: 45,
    totalTasksCount: 50,
    taskCompletionRate: 90,
    todayFocusMin: 60,
    weeklyFocusMin: 420,
    monthlyFocusMin: 1800,
    todaySessions: 2,
    monthlySessions: 60,
    avgSessionLength: 30,
    longestSessionMins: 60,
    bestFocusDay: { dayName: 'Wednesday', totalMinutes: 400, avgMinutes: 100 },
    bestFocusHour: { timeWindow: '09:00 - 10:00', sessionCount: 15 },
    currentStreak: 7,
    longestStreak: 14,
    focusConsistencyRate: 80,
    priorityDistribution: {
      high: { total: 15, completed: 14, rate: 93 },
      medium: { total: 20, completed: 18, rate: 90 },
      low: { total: 15, completed: 13, rate: 87 },
    },
    weeklyFocusBars: [],
    todaySpent: 150,
    weeklySpent: 1050,
    monthlySpent: 4500,
    availableBudget: 5500,
    budgetUtilizationPct: 45,
    budgetHealth: 'Healthy',
    avgDailySpend: 150,
    topCategory: { name: 'Food', amount: 2000, percentage: 44 },
    categoryBreakdown: [],
    largestExpense: { title: 'Groceries', amount: 850, date: '2026-08-10', category: 'Food' },
    comparison: {
      focusGrowthPct: 15,
      spendingChangePct: -5,
      tasksGrowthPct: 10,
    },
    productivityScore: 82,
    productivityScoreLabel: 'Excellent',
    financialScore: 88,
    financialScoreLabel: 'Excellent',
    overallWellnessScore: 85,
    overallWellnessLabel: 'Excellent',
    focusDollarRatio: 0.4,
    dailyTimeline: [],
    scatterData: [],
    heatmap: [],
    forecast: {
      projectedMonthEndSpend: 4650,
      projectedMonthEndFocusHours: 32,
      daysUntilBudgetExhaustion: 35,
      budgetHealthStatus: 'healthy',
      dailyBurnRate: 150,
    },
    ...overrides,
  };
}

function generateDailyHistory(
  days: number,
  baseFocus: number,
  baseTasks: number,
  baseSpend: number,
  completionPct = 85
): DailyGoalHistory[] {
  const list: DailyGoalHistory[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    list.push({
      date: dateStr,
      completionPct,
      completedCount: Math.round(baseTasks * (completionPct / 100)),
      totalCount: baseTasks,
      goals: [],
      focusMinutes: baseFocus,
      tasksCompleted: Math.round(baseTasks * (completionPct / 100)),
      xpEarned: 50,
      expensesLogged: 2,
      totalSpent: baseSpend,
    });
  }
  return list;
}

// ═══════════════════════════════════════════════════════════════
// Test Case Scenarios (10 Deterministic Profiles)
// ═══════════════════════════════════════════════════════════════

export interface CoachTestCase {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: CoachInput;
  readonly expectedOutcomes: {
    readonly minRecommendations: number;
    readonly maxRecommendations?: number;
    readonly expectedTopCategory?: string;
    readonly expectedRiskLevel?: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
    readonly expectedWeeklyGrade?: string;
    readonly isStreakAtRisk?: boolean;
    readonly expectedBurnoutLevel?: 'low' | 'moderate' | 'high' | 'critical';
  };
}

/**
 * 1. New User Scenario: Day 1, zero history, zero tasks, zero sessions.
 */
export const NEW_USER_SCENARIO: CoachTestCase = {
  id: 'scenario_new_user',
  name: 'New User (Zero Data)',
  description: 'First day on FocusForge with no previous history or logged activity.',
  input: {
    analytics: createMockAnalytics({
      daysCount: 1,
      hasData: false,
      totalSpent: 0,
      totalFocusMin: 0,
      totalFocusHours: 0,
      completedTasksCount: 0,
      totalTasksCount: 0,
      taskCompletionRate: 0,
      todayFocusMin: 0,
      weeklyFocusMin: 0,
      monthlyFocusMin: 0,
      currentStreak: 0,
      productivityScore: 0,
      financialScore: 0,
      overallWellnessScore: 0,
      monthlySpent: 0,
      forecast: {
        projectedMonthEndSpend: 0,
        projectedMonthEndFocusHours: 0,
        daysUntilBudgetExhaustion: null,
        budgetHealthStatus: 'healthy',
        dailyBurnRate: 0,
      },
    }),
    dailyGoalHistory: [],
    tasks: [],
    focusSessions: [],
    expenses: [],
    savingsGoals: [],
    events: [],
    profile: {
      xp: 0,
      streak: 0,
      last_active_date: '',
      monthly_budget: 10000,
      total_savings: 0,
      badges: [],
      display_name: 'New Explorer',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 0,
    expectedRiskLevel: 'minimal',
    isStreakAtRisk: false,
  },
};

/**
 * 2. Heavy Productivity Scenario: 300m+ focus daily, 90%+ completion, 14-day streak.
 */
export const HEAVY_PRODUCTIVITY_SCENARIO: CoachTestCase = {
  id: 'scenario_heavy_productivity',
  name: 'Heavy Productivity (Elite Momentum)',
  description: 'Super-performer with high focus volume, high task completion, and strong streak.',
  input: {
    analytics: createMockAnalytics({
      totalFocusMin: 6000,
      totalFocusHours: 100,
      todayFocusMin: 320,
      weeklyFocusMin: 1800,
      monthlyFocusMin: 6000,
      completedTasksCount: 80,
      totalTasksCount: 85,
      taskCompletionRate: 94,
      currentStreak: 14,
      productivityScore: 95,
      overallWellnessScore: 92,
      comparison: { focusGrowthPct: 35, spendingChangePct: -10, tasksGrowthPct: 25 },
    }),
    dailyGoalHistory: generateDailyHistory(30, 240, 6, 100, 95),
    tasks: Array.from({ length: 15 }, (_, i) => ({
      id: `task_${i}`,
      user_id: 'u1',
      title: `High impact project deliverable #${i + 1}`,
      description: '',
      priority: 'high',
      section_id: null,
      scheduled_date: '2026-08-25',
      deadline: '2026-08-28',
      has_no_end_date: false,
      reminder_enabled: false,
      reminder_time: null,
      recurrence_type: 'none',
      recurrence_interval: null,
      recurrence_weekdays: null,
      recurrence_end_date: null,
      status: i < 12 ? 'completed' : 'pending',
      subject: 'Engineering',
      created_at: '2026-08-20',
      completed_at: i < 12 ? '2026-08-25T14:00:00Z' : null,
      updated_at: '2026-08-25',
    })),
    focusSessions: Array.from({ length: 30 }, (_, i) => ({
      id: `sess_${i}`,
      session_date: '2026-08-25',
      minutes: 50,
      sessions_count: 2,
    })),
    expenses: [],
    savingsGoals: [],
    events: [],
    profile: {
      xp: 2500,
      streak: 14,
      last_active_date: '2026-08-25',
      monthly_budget: 15000,
      total_savings: 50000,
      badges: [{ id: 'b1', name: 'Master Focus', icon: '🏆', unlockedAt: '2026-08-20' }],
      display_name: 'Apex Builder',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 1,
    expectedTopCategory: 'focus',
    expectedWeeklyGrade: 'A+',
    isStreakAtRisk: false,
  },
};

/**
 * 3. Heavy Spending Scenario: Budget almost depleted (95% used), rapid spending velocity.
 */
export const HEAVY_SPENDING_SCENARIO: CoachTestCase = {
  id: 'scenario_heavy_spending',
  name: 'Heavy Spending (Budget Distress)',
  description: 'Rapid expenditure burn rate with high risk of month-end deficit.',
  input: {
    analytics: createMockAnalytics({
      totalSpent: 9600,
      monthlySpent: 9600,
      availableBudget: 400,
      budgetUtilizationPct: 96,
      budgetHealth: 'Critical',
      avgDailySpend: 380,
      financialScore: 35,
      overallWellnessScore: 50,
      forecast: {
        projectedMonthEndSpend: 11800,
        projectedMonthEndFocusHours: 20,
        daysUntilBudgetExhaustion: 2,
        budgetHealthStatus: 'critical',
        dailyBurnRate: 380,
      },
    }),
    dailyGoalHistory: generateDailyHistory(30, 45, 3, 400, 60),
    tasks: [],
    focusSessions: [],
    expenses: Array.from({ length: 25 }, (_, i) => ({
      id: `exp_${i}`,
      title: `Impulse purchase #${i}`,
      amount: 450,
      category: 'Shopping',
      note: '',
      expense_date: '2026-08-24',
      created_at: '2026-08-24',
    })),
    savingsGoals: [],
    events: [],
    profile: {
      xp: 400,
      streak: 2,
      last_active_date: '2026-08-24',
      monthly_budget: 10000,
      total_savings: 500,
      badges: [],
      display_name: 'Spender',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 1,
    expectedRiskLevel: 'critical',
    isStreakAtRisk: true,
  },
};

/**
 * 4. Excellent Habits Scenario: Morning focus, consistent task closures, balanced spending.
 */
export const EXCELLENT_HABITS_SCENARIO: CoachTestCase = {
  id: 'scenario_excellent_habits',
  name: 'Excellent Habits (Consistent Routine)',
  description: 'Stable 120m focus daily at 09:00 AM, high task consistency, disciplined finances.',
  input: {
    analytics: createMockAnalytics({
      totalFocusMin: 3600,
      focusConsistencyRate: 92,
      currentStreak: 21,
      productivityScore: 88,
      financialScore: 90,
      overallWellnessScore: 89,
    }),
    dailyGoalHistory: generateDailyHistory(30, 130, 6, 120, 90),
    tasks: [],
    focusSessions: [],
    expenses: [],
    savingsGoals: [],
    events: [],
    profile: {
      xp: 3200,
      streak: 21,
      last_active_date: '2026-08-25',
      monthly_budget: 12000,
      total_savings: 30000,
      badges: [],
      display_name: 'Consistent Pro',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 1,
    expectedRiskLevel: 'minimal',
    isStreakAtRisk: false,
  },
};

/**
 * 5. Poor Habits Scenario: Chronic backlog aging (8+ overdue tasks), weekend spending surge (3x).
 */
export const POOR_HABITS_SCENARIO: CoachTestCase = {
  id: 'scenario_poor_habits',
  name: 'Poor Habits (Procrastination & Weekend Surge)',
  description: 'Overdue task backlog accumulating with high weekend spending ratio.',
  input: {
    analytics: createMockAnalytics({
      completedTasksCount: 10,
      totalTasksCount: 35,
      taskCompletionRate: 28,
      productivityScore: 42,
      overallWellnessScore: 45,
    }),
    dailyGoalHistory: generateDailyHistory(30, 20, 2, 250, 40),
    tasks: Array.from({ length: 12 }, (_, i) => ({
      id: `overdue_${i}`,
      user_id: 'u1',
      title: `Old task #${i + 1}`,
      description: '',
      priority: 'high',
      section_id: null,
      scheduled_date: '2026-08-01',
      deadline: '2026-08-10', // Long overdue
      has_no_end_date: false,
      reminder_enabled: false,
      reminder_time: null,
      recurrence_type: 'none',
      recurrence_interval: null,
      recurrence_weekdays: null,
      recurrence_end_date: null,
      status: 'pending',
      subject: 'Admin',
      created_at: '2026-08-01',
      completed_at: null,
      updated_at: '2026-08-01',
    })),
    focusSessions: [],
    expenses: [
      { id: 'e1', title: 'Weekend Club', amount: 2500, category: 'Entertainment', note: '', expense_date: '2026-08-23', created_at: '2026-08-23' },
      { id: 'e2', title: 'Weekend Dining', amount: 1800, category: 'Food', note: '', expense_date: '2026-08-24', created_at: '2026-08-24' },
    ],
    savingsGoals: [],
    events: [],
    profile: {
      xp: 200,
      streak: 0,
      last_active_date: '2026-08-20',
      monthly_budget: 8000,
      total_savings: 0,
      badges: [],
      display_name: 'Struggling User',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 2,
    expectedRiskLevel: 'high',
  },
};

/**
 * 6. Budget Exhausted Scenario: Total spend exceeds monthly budget (105%).
 */
export const BUDGET_EXHAUSTED_SCENARIO: CoachTestCase = {
  id: 'scenario_budget_exhausted',
  name: 'Budget Fully Exhausted (Overspent)',
  description: 'User has completely spent 100% of their monthly budget allocation.',
  input: {
    analytics: createMockAnalytics({
      totalSpent: 10500,
      monthlySpent: 10500,
      availableBudget: 0,
      budgetUtilizationPct: 105,
      budgetHealth: 'Critical',
      financialScore: 20,
      forecast: {
        projectedMonthEndSpend: 11500,
        projectedMonthEndFocusHours: 15,
        daysUntilBudgetExhaustion: 0,
        budgetHealthStatus: 'critical',
        dailyBurnRate: 350,
      },
    }),
    dailyGoalHistory: generateDailyHistory(30, 40, 2, 350, 50),
    tasks: [],
    focusSessions: [],
    expenses: [],
    savingsGoals: [],
    events: [],
    profile: {
      xp: 600,
      streak: 1,
      last_active_date: '2026-08-25',
      monthly_budget: 10000,
      total_savings: 0,
      badges: [],
      display_name: 'Overspent User',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 1,
    expectedRiskLevel: 'critical',
  },
};

/**
 * 7. Burnout Scenario: 5 consecutive days with > 320m focus + late-night strain.
 */
export const BURNOUT_SCENARIO: CoachTestCase = {
  id: 'scenario_burnout',
  name: 'Cognitive Burnout Alert',
  description: 'Excessive marathon focus hours and midnight sessions indicating severe fatigue.',
  input: {
    analytics: createMockAnalytics({
      todayFocusMin: 340,
      weeklyFocusMin: 2200,
      monthlyFocusMin: 7000,
      longestSessionMins: 180,
      productivityScore: 85,
    }),
    dailyGoalHistory: generateDailyHistory(30, 330, 8, 100, 95),
    tasks: [],
    focusSessions: [],
    expenses: [],
    savingsGoals: [],
    events: Array.from({ length: 8 }, (_, i) => ({
      id: `late_night_${i}`,
      user_id: 'u1',
      timestamp: '2026-08-25T01:30:00Z', // 1:30 AM late night
      type: 'pomodoro_completed',
      category: 'focus',
      metadata: { amount: 50 },
    })),
    profile: {
      xp: 4000,
      streak: 25,
      last_active_date: '2026-08-25',
      monthly_budget: 10000,
      total_savings: 10000,
      badges: [],
      display_name: 'Overworked Hero',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 1,
    expectedBurnoutLevel: 'critical',
  },
};

/**
 * 8. Lost Streak Scenario: Active streak, 0 focus today, 2 hours remaining before midnight.
 */
export const LOST_STREAK_SCENARIO: CoachTestCase = {
  id: 'scenario_lost_streak',
  name: 'Imminent Streak Loss Warning',
  description: 'Active 18-day streak on the verge of breaking today with 0 activity logged.',
  input: {
    analytics: createMockAnalytics({
      todayFocusMin: 0,
      todaySessions: 0,
      completedTasksCount: 0,
      currentStreak: 18,
    }),
    dailyGoalHistory: generateDailyHistory(30, 100, 5, 100, 85),
    tasks: [
      {
        id: 't_pending',
        user_id: 'u1',
        title: 'Pending chore',
        description: '',
        priority: 'medium',
        section_id: null,
        scheduled_date: '2026-08-25',
        deadline: '2026-08-25',
        has_no_end_date: false,
        reminder_enabled: false,
        reminder_time: null,
        recurrence_type: 'none',
        recurrence_interval: null,
        recurrence_weekdays: null,
        recurrence_end_date: null,
        status: 'pending',
        subject: 'General',
        created_at: '2026-08-25',
        completed_at: null,
        updated_at: '2026-08-25',
      },
    ],
    focusSessions: [],
    expenses: [],
    savingsGoals: [],
    events: [],
    profile: {
      xp: 1800,
      streak: 18,
      last_active_date: '2026-08-24', // Yesterday
      monthly_budget: 10000,
      total_savings: 5000,
      badges: [],
      display_name: 'Streak Defender',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 1,
    isStreakAtRisk: true,
    expectedRiskLevel: 'high',
  },
};

/**
 * 9. Perfect Consistency Scenario: 30 consecutive days of 100% daily goals.
 */
export const PERFECT_CONSISTENCY_SCENARIO: CoachTestCase = {
  id: 'scenario_perfect_consistency',
  name: 'Perfect Consistency (Flawless 30 Days)',
  description: '100% goal completion every single day for the past month.',
  input: {
    analytics: createMockAnalytics({
      totalFocusMin: 4500,
      totalFocusHours: 75,
      completedTasksCount: 180,
      totalTasksCount: 180,
      taskCompletionRate: 100,
      focusConsistencyRate: 100,
      currentStreak: 30,
      productivityScore: 98,
      financialScore: 95,
      overallWellnessScore: 97,
    }),
    dailyGoalHistory: generateDailyHistory(30, 150, 6, 100, 100),
    tasks: [],
    focusSessions: [],
    expenses: [],
    savingsGoals: [],
    events: [],
    profile: {
      xp: 5000,
      streak: 30,
      last_active_date: '2026-08-25',
      monthly_budget: 10000,
      total_savings: 25000,
      badges: [],
      display_name: 'Flawless Master',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 1,
    expectedWeeklyGrade: 'A+',
    expectedRiskLevel: 'minimal',
    isStreakAtRisk: false,
  },
};

/**
 * 10. No Activity Scenario: Account exists but completely dormant.
 */
export const NO_ACTIVITY_SCENARIO: CoachTestCase = {
  id: 'scenario_no_activity',
  name: 'No Activity (Dormant Account)',
  description: 'User has not performed any focus sessions, task completions, or expense entries.',
  input: {
    analytics: createMockAnalytics({
      hasData: false,
      totalSpent: 0,
      totalFocusMin: 0,
      totalFocusHours: 0,
      completedTasksCount: 0,
      totalTasksCount: 0,
      taskCompletionRate: 0,
      todayFocusMin: 0,
      weeklyFocusMin: 0,
      monthlyFocusMin: 0,
      productivityScore: 0,
      financialScore: 0,
      overallWellnessScore: 0,
      currentStreak: 0,
    }),
    dailyGoalHistory: [],
    tasks: [],
    focusSessions: [],
    expenses: [],
    savingsGoals: [],
    events: [],
    profile: {
      xp: 50,
      streak: 0,
      last_active_date: '',
      monthly_budget: 5000,
      total_savings: 0,
      badges: [],
      display_name: 'Dormant User',
      avatar_url: '',
    },
    preferences: DEFAULT_PREFERENCES,
  },
  expectedOutcomes: {
    minRecommendations: 0,
    expectedRiskLevel: 'minimal',
    isStreakAtRisk: false,
  },
};

/**
 * Registry of all 10 deterministic test cases.
 */
export const ALL_COACH_TEST_CASES: readonly CoachTestCase[] = [
  NEW_USER_SCENARIO,
  HEAVY_PRODUCTIVITY_SCENARIO,
  HEAVY_SPENDING_SCENARIO,
  EXCELLENT_HABITS_SCENARIO,
  POOR_HABITS_SCENARIO,
  BUDGET_EXHAUSTED_SCENARIO,
  BURNOUT_SCENARIO,
  LOST_STREAK_SCENARIO,
  PERFECT_CONSISTENCY_SCENARIO,
  NO_ACTIVITY_SCENARIO,
];
