/**
 * Coach Context Builder
 *
 * Builds a normalized CoachInput object from existing application stores
 * and engines. This is the bridge between the FocusForge data layer and
 * the AI Coach Engine.
 *
 * Responsibilities:
 * - Read data from zustand stores (useStore, useDailyGoalsStore)
 * - Compute AnalyticsEngineResult using existing calculateAnalyticsEngineData()
 * - Optionally compute MonthlyReportData using existing calculateMonthlyReportData()
 * - Assemble a fully-typed CoachInput object
 *
 * This file performs NO UI work, NO state mutations, and NO side effects.
 * It is a pure data transformation layer.
 *
 * Dependencies:
 * - store/useStore: tasks, focusSessions, expenses, savingsGoals, profile, preferences, events
 * - store/useDailyGoalsStore: history (DailyGoalHistory[])
 * - lib/statistics/analyticsEngine: calculateAnalyticsEngineData
 * - lib/statistics/reports: calculateMonthlyReportData
 * - lib/coach/coachTypes: CoachInput
 *
 * @module coach/coachContext
 */

import { format } from 'date-fns';
import type { CoachInput } from './coachTypes';
import type {
  Task,
  FocusSession,
  Expense,
  Profile,
  SavingsGoal,
  UserPreferences,
} from '../../store/slices/types';
import type { AppEvent } from '../events';
import type { DailyGoalHistory } from '../../store/useDailyGoalsStore';
import type { AnalyticsEngineResult, AnalyticsPeriod } from '../statistics/analyticsEngine';
import { calculateAnalyticsEngineData } from '../statistics/analyticsEngine';
import type { MonthlyReportData } from '../statistics/reports';
import { calculateMonthlyReportData } from '../statistics/reports';

// ═══════════════════════════════════════════════════════════════
// Safe Defaults
// ═══════════════════════════════════════════════════════════════

/**
 * Returns a safe default Profile when the store has no profile data.
 * Ensures the coach engine never receives undefined/null for required fields.
 */
const SAFE_PROFILE: Profile = {
  xp: 0,
  streak: 0,
  last_active_date: '',
  monthly_budget: 0,
  total_savings: 0,
  badges: [],
  display_name: '',
  avatar_url: '',
};

/**
 * Returns safe default UserPreferences when the store has no preferences.
 * Only the fields consumed by the coach engine are listed; the full
 * defaults come from the settings slice.
 */
const SAFE_PREFERENCES: UserPreferences = {
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

// ═══════════════════════════════════════════════════════════════
// Raw Store Data Interface
// ═══════════════════════════════════════════════════════════════

/**
 * Raw data extracted from zustand stores.
 * This interface exists so that the context builder is decoupled from
 * the zustand hook API — data is passed in, not pulled via hooks.
 */
export interface CoachRawData {
  tasks: Task[];
  focusSessions: FocusSession[];
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  profile: Profile;
  preferences: UserPreferences;
  events: AppEvent[];
  dailyGoalHistory: DailyGoalHistory[];
}

// ═══════════════════════════════════════════════════════════════
// Context Builder Options
// ═══════════════════════════════════════════════════════════════

export interface BuildCoachContextOptions {
  /** Analytics period to compute (default: '30d') */
  period?: AnalyticsPeriod;
  /** Whether to include monthly report data (default: false — heavier computation) */
  includeMonthlyReport?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Context Builder
// ═══════════════════════════════════════════════════════════════

/**
 * Builds a fully-typed CoachInput from raw store data.
 *
 * This is a pure function — it reads data passed in as arguments and
 * returns a new CoachInput object. No store access, no side effects.
 *
 * The function is intentionally defensive:
 * - Every array defaults to []
 * - Profile/preferences fallback to safe defaults
 * - Analytics/report computation is wrapped in try/catch
 * - Failures return graceful fallback data, never throw
 *
 * @param rawData - Raw data from zustand stores
 * @param options - Optional configuration
 * @returns Fully-typed CoachInput ready for createCoachEngine()
 */
export function buildCoachContext(
  rawData: CoachRawData,
  options: BuildCoachContextOptions = {}
): CoachInput {
  const {
    tasks = [],
    focusSessions = [],
    expenses = [],
    savingsGoals = [],
    profile = SAFE_PROFILE,
    preferences = SAFE_PREFERENCES,
    events = [],
    dailyGoalHistory = [],
  } = rawData;

  const { period = '30d', includeMonthlyReport = false } = options;

  // ─── Compute Analytics ─────────────────────────────────
  let analytics: AnalyticsEngineResult;
  try {
    analytics = calculateAnalyticsEngineData({
      expenses,
      focusSessions,
      tasks,
      profile,
      savingsGoals,
      events,
      period,
    });
  } catch (err) {
    if (import.meta.env.NODE_ENV === 'development') {
      console.warn('[Coach] Analytics computation failed, using safe defaults:', err);
    }
    // Return a minimal safe AnalyticsEngineResult
    analytics = createSafeAnalyticsResult(period);
  }

  // ─── Compute Monthly Report (Optional) ─────────────────
  let monthlyReport: MonthlyReportData | undefined;
  if (includeMonthlyReport) {
    try {
      const yearMonth = format(new Date(), 'yyyy-MM');
      monthlyReport = calculateMonthlyReportData({
        expenses,
        tasks,
        focusSessions,
        savingsGoals,
        profile,
        goalsHistory: dailyGoalHistory,
        yearMonth,
      });
    } catch (err) {
      if (import.meta.env.NODE_ENV === 'development') {
        console.warn('[Coach] Monthly report computation failed:', err);
      }
      monthlyReport = undefined;
    }
  }

  // ─── Assemble CoachInput ───────────────────────────────
  return {
    analytics,
    monthlyReport,
    dailyGoalHistory,
    tasks,
    focusSessions,
    expenses,
    profile,
    savingsGoals,
    events,
    preferences,
  };
}

// ═══════════════════════════════════════════════════════════════
// Safe Analytics Fallback
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a minimal AnalyticsEngineResult with safe zero values.
 * Used when the analytics engine throws — ensures the coach engine
 * can still evaluate rules (they'll just see zero data).
 */
function createSafeAnalyticsResult(period: AnalyticsPeriod): AnalyticsEngineResult {
  return {
    period,
    daysCount: 0,
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
    todaySessions: 0,
    monthlySessions: 0,
    avgSessionLength: 0,
    longestSessionMins: 0,
    bestFocusDay: { dayName: '', totalMinutes: 0, avgMinutes: 0 },
    bestFocusHour: { timeWindow: '', sessionCount: 0 },
    currentStreak: 0,
    longestStreak: 0,
    focusConsistencyRate: 0,
    priorityDistribution: {
      high: { total: 0, completed: 0, rate: 0 },
      medium: { total: 0, completed: 0, rate: 0 },
      low: { total: 0, completed: 0, rate: 0 },
    },
    weeklyFocusBars: [],
    todaySpent: 0,
    weeklySpent: 0,
    monthlySpent: 0,
    availableBudget: 0,
    budgetUtilizationPct: 0,
    budgetHealth: 'Healthy',
    avgDailySpend: 0,
    topCategory: { name: '', amount: 0, percentage: 0 },
    categoryBreakdown: [],
    largestExpense: null,
    comparison: {
      focusGrowthPct: 0,
      spendingChangePct: 0,
      tasksGrowthPct: 0,
    },
    productivityScore: 0,
    productivityScoreLabel: 'No Data',
    financialScore: 0,
    financialScoreLabel: 'No Data',
    overallWellnessScore: 0,
    overallWellnessLabel: 'No Data',
    focusDollarRatio: 0,
    dailyTimeline: [],
    scatterData: [],
    heatmap: [],
    forecast: {
      projectedMonthEndSpend: 0,
      projectedMonthEndFocusHours: 0,
      daysUntilBudgetExhaustion: null,
      budgetHealthStatus: 'healthy',
      dailyBurnRate: 0,
    },
  };
}
