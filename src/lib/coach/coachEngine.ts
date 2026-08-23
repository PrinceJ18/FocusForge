/**
 * Coach Engine — Main Orchestrator
 *
 * Provides the `createCoachEngine()` factory function that accepts CoachInput
 * and returns an object with 8 generation methods. Each method computes its
 * result lazily on first call and caches it for subsequent calls.
 *
 * The engine is the single public entry point for all coach functionality.
 * It delegates to coachRules for rule evaluation and coachUtils for
 * predictions and trend analysis.
 *
 * No React. No JSX. No components. No UI. No store access. No side effects.
 *
 * Dependencies:
 * - coachTypes: all type definitions
 * - coachRules: rule evaluation
 * - coachUtils: prediction, trend, and utility helpers
 *
 * Future consumers:
 * - Dashboard (morning brief, risk alerts)
 * - Analytics (trend detection, predictions panel)
 * - Reports (enhanced recommendations, prediction accuracy)
 * - Notification Center (critical risk push)
 *
 * @module coach/coachEngine
 */

import type {
  CoachInput,
  DailyBrief,
  EveningReview,
  WeeklyReview,
  MonthlyReview,
  CoachRecommendation,
  CoachPredictions,
  CoachRiskItem,
  AchievementsSummary,
  CoachTrendItem,
} from './coachTypes';
import { evaluateAllRules } from './coachRules';
import {
  detectTrend,
  weightedMovingAverage,
  linearExtrapolate,
  predictMonthlyValue,
  clamp,
  safePercent,
  gradeFromScore,
  gradeColor,
  calculateStreakRisk,
  getCurrentDayOfMonth,
  getCurrentMonthDays,
  getTodayDateString,
  getPredictionConfidence,
  extractDailyFocusFromHistory,
  extractDailySpendingFromHistory,
  extractDailyTasksFromHistory,
  extractDailyProgressFromHistory,
} from './coachUtils';
import { format, getWeek, getYear } from 'date-fns';

// ═══════════════════════════════════════════════════════════════
// Engine Interface
// ═══════════════════════════════════════════════════════════════

/**
 * Public interface returned by createCoachEngine().
 * Each method generates a specific coaching output.
 */
export interface CoachEngine {
  /** Morning brief with greeting, priorities, risks, streak status */
  generateDailyBrief: () => DailyBrief;
  /** Evening review with accomplishments, missed targets, day score */
  generateEveningReview: () => EveningReview;
  /** Weekly review with wins, improvements, trends, grade */
  generateWeeklyReview: () => WeeklyReview;
  /** Monthly review enriched by coach insights */
  generateMonthlyReview: () => MonthlyReview;
  /** All fired recommendations sorted by priority */
  generateRecommendations: () => readonly CoachRecommendation[];
  /** Projected values for current period */
  generatePredictions: () => CoachPredictions;
  /** Critical and high severity risk items */
  generateRiskAssessment: () => readonly CoachRiskItem[];
  /** Recent achievements and approaching milestones */
  generateAchievementsSummary: () => AchievementsSummary;
}

// ═══════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a lazy-evaluated, memoized function.
 * The factory function is only called on the first invocation;
 * subsequent calls return the cached result.
 */
function memoize<T>(factory: () => T): () => T {
  let cached: T | undefined;
  let computed = false;
  return () => {
    if (!computed) {
      cached = factory();
      computed = true;
    }
    return cached as T;
  };
}

/**
 * Generates a time-appropriate greeting.
 */
function getGreeting(displayName: string): string {
  const hour = new Date().getHours();
  const name = displayName || 'there';
  if (hour < 12) return `Good morning, ${name}!`;
  if (hour < 17) return `Good afternoon, ${name}!`;
  return `Good evening, ${name}!`;
}

/**
 * Generates a deterministic motivational message based on performance data.
 * No randomness — the message is selected by current metrics.
 */
function getMotivation(score: number, streak: number, focusGrowthPct: number): string {
  if (score >= 85 && streak >= 7) {
    return 'You\'re in the zone — elite-level consistency and performance. Keep pushing!';
  }
  if (score >= 70) {
    return 'Solid performance! Small improvements compound into major results over time.';
  }
  if (focusGrowthPct > 15) {
    return 'Your focus is trending upward — momentum is building. Capitalize on it today!';
  }
  if (streak >= 3) {
    return `${streak}-day streak and counting! Every day you show up, you get stronger.`;
  }
  if (score >= 40) {
    return 'Progress is progress, no matter the pace. One focused session can shift your entire day.';
  }
  return 'Start small, start now. Even 25 minutes of focused work creates momentum.';
}

/**
 * Builds a CoachTrendItem from a metric name and detected trend data.
 */
function buildTrendItem(
  metric: string,
  direction: 'improving' | 'declining' | 'stable',
  magnitudePct: number,
  category: CoachTrendItem['category']
): CoachTrendItem {
  const dirLabel = direction === 'improving' ? 'up' : direction === 'declining' ? 'down' : 'stable';
  const icon = direction === 'improving' ? '📈' : direction === 'declining' ? '📉' : '➡️';
  const color = direction === 'improving' ? '#10b981' : direction === 'declining' ? '#f59e0b' : '#6b7280';

  return {
    metric,
    direction,
    magnitudePct,
    summary: magnitudePct > 0
      ? `${metric} is ${dirLabel} by ${magnitudePct}% compared to the previous period.`
      : `${metric} has remained stable.`,
    category,
    icon,
    color,
  };
}

// ═══════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a new Coach Engine instance.
 *
 * The engine accepts pre-computed data from the analytics and reports engines,
 * plus raw store data for granular rule evaluation. It never duplicates
 * calculations that already exist elsewhere in the application.
 *
 * All methods are lazily computed and memoized — the first call computes
 * the result, subsequent calls return the cached value.
 *
 * @example
 * ```ts
 * const engine = createCoachEngine({
 *   analytics: analyticsResult,
 *   dailyGoalHistory: goalsStore.history,
 *   tasks, focusSessions, expenses, profile,
 *   savingsGoals, events, preferences,
 * });
 *
 * const brief = engine.generateDailyBrief();
 * const risks = engine.generateRiskAssessment();
 * const predictions = engine.generatePredictions();
 * ```
 *
 * @param input - Complete coach input data
 * @returns CoachEngine instance with 8 generation methods
 */
export function createCoachEngine(input: CoachInput): CoachEngine {
  const { analytics, profile, preferences, dailyGoalHistory } = input;

  // ─── Shared lazy computations ────────────────────────────
  const getRecommendations = memoize(() => evaluateAllRules(input));

  const getPredictions = memoize((): CoachPredictions => {
    const dayOfMonth = getCurrentDayOfMonth();
    const daysInMonth = getCurrentMonthDays();
    const historyCount = dailyGoalHistory.length;

    const dailyFocus = extractDailyFocusFromHistory(dailyGoalHistory);
    const dailySpending = extractDailySpendingFromHistory(dailyGoalHistory);
    const dailyProgress = extractDailyProgressFromHistory(dailyGoalHistory);

    // Use WMA-based prediction when we have enough history, fallback to linear extrapolation
    const expectedMonthlyFocusMinutes = historyCount >= 7
      ? predictMonthlyValue(dailyFocus, dayOfMonth, daysInMonth)
      : linearExtrapolate(analytics.monthlyFocusMin, dayOfMonth, daysInMonth);

    const expectedMonthlySpending = historyCount >= 7
      ? predictMonthlyValue(dailySpending, dayOfMonth, daysInMonth)
      : analytics.forecast.projectedMonthEndSpend;

    const expectedDailyProgress = historyCount >= 3
      ? clamp(Math.round(weightedMovingAverage(dailyProgress, 7)), 0, 100)
      : clamp(analytics.taskCompletionRate, 0, 100);

    // Productivity & financial scores projected from recent trends
    const expectedProductivityScore = clamp(
      analytics.productivityScore + Math.round(analytics.comparison.focusGrowthPct * 0.1),
      0, 100
    );

    const expectedFinancialScore = clamp(
      analytics.financialScore - Math.round(
        expectedMonthlySpending > profile.monthly_budget
          ? ((expectedMonthlySpending - profile.monthly_budget) / Math.max(1, profile.monthly_budget)) * 20
          : -5
      ),
      0, 100
    );

    const expectedWeeklyGrade = gradeFromScore(
      Math.round(expectedProductivityScore * 0.5 + expectedFinancialScore * 0.3 + expectedDailyProgress * 0.2)
    );

    const expectedMonthlyGrade = gradeFromScore(
      Math.round(expectedProductivityScore * 0.4 + expectedFinancialScore * 0.3 + expectedDailyProgress * 0.3)
    );

    return {
      expectedMonthlyFocusMinutes,
      expectedMonthlySpending,
      expectedDailyProgress,
      expectedProductivityScore,
      expectedFinancialScore,
      expectedWeeklyGrade,
      expectedMonthlyGrade,
      confidence: getPredictionConfidence(historyCount),
      dataPointsUsed: historyCount,
    };
  });

  const getRisks = memoize((): readonly CoachRiskItem[] => {
    const recommendations = getRecommendations();
    return recommendations
      .filter(r => r.priority === 'critical' || r.priority === 'high')
      .map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        severity: r.priority,
        category: r.category,
        icon: r.icon,
        color: r.color,
        threshold: r.metric ?? {
          label: 'N/A',
          actual: 0,
          limit: 0,
          unit: '',
        },
      }));
  });

  // ─── Daily Brief ─────────────────────────────────────────
  const generateDailyBrief = memoize((): DailyBrief => {
    const todayStr = getTodayDateString();
    const yesterdayHistory = dailyGoalHistory.find(h => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return h.date === format(yesterday, 'yyyy-MM-dd');
    });

    // Top priorities: pending high-priority tasks, sorted by deadline
    const pendingHighPriority = [...input.tasks]
      .filter(t => t.status === 'pending' && t.priority === 'high')
      .sort((a, b) => {
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
      })
      .slice(0, 3)
      .map(t => ({
        title: t.title,
        priority: 'high' as const,
        icon: '🔴',
      }));

    // Fill remaining slots with medium priority if needed
    const pendingMedium = pendingHighPriority.length < 3
      ? [...input.tasks]
          .filter(t => t.status === 'pending' && t.priority === 'medium')
          .slice(0, 3 - pendingHighPriority.length)
          .map(t => ({
            title: t.title,
            priority: 'medium' as const,
            icon: '🟡',
          }))
      : [];

    const topPriorities = [...pendingHighPriority, ...pendingMedium];

    const riskAlerts = getRisks();
    const streakIsAtRisk = calculateStreakRisk(profile.streak, analytics.todayFocusMin, 0);

    const yesterdaySummary = yesterdayHistory
      ? `Yesterday: ${yesterdayHistory.focusMinutes}m focus, ${yesterdayHistory.tasksCompleted} tasks, ₹${yesterdayHistory.totalSpent} spent (${yesterdayHistory.completionPct}% goals).`
      : 'No data from yesterday — make today count!';

    const dailyBudget = profile.monthly_budget > 0
      ? Math.round((profile.monthly_budget - analytics.monthlySpent) / Math.max(1, getCurrentMonthDays() - getCurrentDayOfMonth() + 1))
      : 0;

    return {
      greeting: getGreeting(profile.display_name),
      yesterdaySummary,
      topPriorities,
      riskAlerts,
      streakStatus: {
        currentStreak: profile.streak,
        isAtRisk: streakIsAtRisk,
        message: streakIsAtRisk
          ? `Your ${profile.streak}-day streak is at risk! Log some activity today.`
          : profile.streak > 0
            ? `${profile.streak}-day streak going strong!`
            : 'Start a new streak today by completing a task or focus session.',
      },
      predictions: {
        expectedFocusMinutes: preferences.default_daily_focus_goal || 120,
        expectedTasksToComplete: topPriorities.length,
        budgetRemainingToday: Math.max(0, dailyBudget),
      },
      motivation: getMotivation(
        analytics.productivityScore,
        profile.streak,
        analytics.comparison.focusGrowthPct
      ),
    };
  });

  // ─── Evening Review ──────────────────────────────────────
  const generateEveningReview = memoize((): EveningReview => {
    const todayFocus = analytics.todayFocusMin;
    const todaySpent = analytics.todaySpent;
    const focusGoal = preferences.default_daily_focus_goal || 120;
    const todayStr = getTodayDateString();

    const completedToday = input.tasks.filter(t =>
      t.status === 'completed' &&
      t.completed_at !== null &&
      t.completed_at.startsWith(todayStr)
    ).length;

    const accomplishments: EveningReview['accomplishments'] = [];
    if (todayFocus > 0) {
      accomplishments.push({
        title: 'Focus Time',
        value: `${todayFocus} minutes`,
        icon: '⏱️',
      });
    }
    if (completedToday > 0) {
      accomplishments.push({
        title: 'Tasks Completed',
        value: `${completedToday} task${completedToday !== 1 ? 's' : ''}`,
        icon: '✅',
      });
    }
    if (todaySpent > 0) {
      accomplishments.push({
        title: 'Expenses Tracked',
        value: `₹${Math.round(todaySpent)}`,
        icon: '💰',
      });
    }

    const missedTargets: EveningReview['missedTargets'] = [];
    if (todayFocus < focusGoal) {
      missedTargets.push({
        title: 'Focus Goal',
        expected: `${focusGoal}m`,
        actual: `${todayFocus}m`,
        icon: '⏱️',
      });
    }
    const overdueCount = input.tasks.filter(t =>
      t.status === 'pending' && t.deadline !== null && t.deadline <= todayStr
    ).length;
    if (overdueCount > 0) {
      missedTargets.push({
        title: 'Overdue Tasks',
        expected: '0',
        actual: `${overdueCount}`,
        icon: '⚠️',
      });
    }

    // Tomorrow priorities: overdue first, then high priority pending
    const tomorrowPriorities = [...input.tasks]
      .filter(t => t.status === 'pending')
      .sort((a, b) => {
        // Overdue items first
        const aOverdue = a.deadline && a.deadline <= todayStr ? 1 : 0;
        const bOverdue = b.deadline && b.deadline <= todayStr ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        // Then by priority
        const priorityMap = { high: 0, medium: 1, low: 2 };
        return (priorityMap[a.priority] ?? 1) - (priorityMap[b.priority] ?? 1);
      })
      .slice(0, 3)
      .map(t => ({
        title: t.title,
        reason: t.deadline && t.deadline <= todayStr
          ? 'Overdue — needs immediate attention'
          : t.priority === 'high'
            ? 'High priority task'
            : 'Pending task',
        icon: t.deadline && t.deadline <= todayStr ? '🔴' : t.priority === 'high' ? '🟠' : '🟡',
      }));

    // Day score: weighted combination of focus achievement + task completion + budget discipline
    const focusAchievement = safePercent(todayFocus, focusGoal);
    const taskTarget = preferences.default_task_goal || 6;
    const taskAchievement = safePercent(completedToday, taskTarget);
    const dailyBudget = profile.monthly_budget > 0 ? profile.monthly_budget / getCurrentMonthDays() : 0;
    const budgetAchievement = dailyBudget > 0 && todaySpent <= dailyBudget ? 100 : dailyBudget > 0 ? clamp(100 - safePercent(todaySpent - dailyBudget, dailyBudget), 0, 100) : 50;

    const dayScore = clamp(
      Math.round(focusAchievement * 0.4 + taskAchievement * 0.35 + budgetAchievement * 0.25),
      0, 100
    );

    return {
      heading: dayScore >= 80
        ? 'Excellent day!'
        : dayScore >= 60
          ? 'Good effort today.'
          : dayScore >= 40
            ? 'Some progress made.'
            : 'A quieter day — tomorrow is a fresh start.',
      accomplishments,
      missedTargets,
      tomorrowPriorities,
      dayScore,
      dayGrade: gradeFromScore(dayScore),
    };
  });

  // ─── Weekly Review ───────────────────────────────────────
  const generateWeeklyReview = memoize((): WeeklyReview => {
    const now = new Date();
    const weekNum = getWeek(now);
    const yearNum = getYear(now);
    const weekLabel = `Week ${weekNum}, ${yearNum}`;

    const dailyFocus = extractDailyFocusFromHistory(dailyGoalHistory);
    const dailySpending = extractDailySpendingFromHistory(dailyGoalHistory);
    const dailyTasks = extractDailyTasksFromHistory(dailyGoalHistory);

    const focusTrendData = detectTrend(dailyFocus, 7);
    const spendingTrendData = detectTrend(dailySpending, 7);
    const taskTrendData = detectTrend(dailyTasks, 7);

    const focusTrend = buildTrendItem('Focus Time', focusTrendData.direction, focusTrendData.magnitudePct, 'focus');
    const spendingTrend = buildTrendItem('Spending', spendingTrendData.direction, spendingTrendData.magnitudePct, 'finance');
    const taskTrend = buildTrendItem('Task Completion', taskTrendData.direction, taskTrendData.magnitudePct, 'tasks');

    // Wins: positive metrics from this period
    const wins: WeeklyReview['wins'] = [];
    if (analytics.comparison.focusGrowthPct > 10) {
      wins.push({
        title: 'Focus Growth',
        description: `Focus time increased by ${analytics.comparison.focusGrowthPct}% vs previous period.`,
        icon: '📈',
        color: '#10b981',
      });
    }
    if (analytics.taskCompletionRate >= 80) {
      wins.push({
        title: 'High Task Completion',
        description: `Completed ${analytics.taskCompletionRate}% of all tasks.`,
        icon: '✅',
        color: '#06b6d4',
      });
    }
    if (analytics.budgetHealth === 'Healthy') {
      wins.push({
        title: 'Budget Healthy',
        description: `Spending at ${analytics.budgetUtilizationPct}% of budget — well controlled.`,
        icon: '💰',
        color: '#10b981',
      });
    }
    if (profile.streak >= 7) {
      wins.push({
        title: 'Streak Champion',
        description: `Maintained a ${profile.streak}-day active streak.`,
        icon: '🔥',
        color: '#f59e0b',
      });
    }
    if (analytics.focusConsistencyRate >= 70) {
      wins.push({
        title: 'Consistent Focus',
        description: `Active on ${analytics.focusConsistencyRate}% of days with 30+ minutes of focus.`,
        icon: '🎯',
        color: '#a855f7',
      });
    }

    // Improvements: areas that need attention
    const improvements: WeeklyReview['improvements'] = [];
    if (analytics.taskCompletionRate < 50 && analytics.totalTasksCount > 0) {
      improvements.push({
        title: 'Low Task Completion',
        description: `Only ${analytics.taskCompletionRate}% of tasks completed.`,
        icon: '⚠️',
        color: '#f59e0b',
      });
    }
    if (analytics.comparison.focusGrowthPct < -15) {
      improvements.push({
        title: 'Focus Decline',
        description: `Focus time dropped ${Math.abs(analytics.comparison.focusGrowthPct)}% vs previous period.`,
        icon: '📉',
        color: '#ef4444',
      });
    }
    if (analytics.budgetHealth === 'Critical') {
      improvements.push({
        title: 'Budget Critical',
        description: `Budget utilization at ${analytics.budgetUtilizationPct}% — spending needs immediate attention.`,
        icon: '💸',
        color: '#ef4444',
      });
    }

    const weekScore = analytics.overallWellnessScore;
    const weekGrade = gradeFromScore(weekScore);

    // Filter recommendations to those most relevant for weekly context
    const allRecs = getRecommendations();
    const weeklyRecs = allRecs.slice(0, 5); // Top 5 by priority

    return {
      weekLabel,
      wins: wins.slice(0, 5),
      improvements: improvements.slice(0, 5),
      focusTrend,
      spendingTrend,
      taskTrend,
      weekScore,
      weekGrade,
      recommendations: weeklyRecs,
    };
  });

  // ─── Monthly Review ──────────────────────────────────────
  const generateMonthlyReview = memoize((): MonthlyReview => {
    const now = new Date();
    const monthLabel = format(now, 'MMMM yyyy');
    const report = input.monthlyReport;

    // If monthly report data is available, leverage it
    const monthScore = report?.overallScore ?? analytics.overallWellnessScore;
    const monthGrade = report?.grade ?? gradeFromScore(monthScore);

    // Build executive summary from report or analytics
    const executiveSummary: string[] = report?.executiveSummary ?? [];

    if (executiveSummary.length === 0) {
      executiveSummary.push(
        `This month you focused for ${analytics.totalFocusHours}h, completed ${analytics.completedTasksCount} tasks, and spent ₹${Math.round(analytics.monthlySpent)}.`
      );
      if (analytics.productivityScore >= 70) {
        executiveSummary.push(`Your productivity score of ${analytics.productivityScore} reflects strong performance.`);
      }
      if (analytics.budgetHealth !== 'Healthy') {
        executiveSummary.push(`Budget health is ${analytics.budgetHealth} — monitor spending closely.`);
      }
    }

    // Month-level trends
    const dailyFocus = extractDailyFocusFromHistory(dailyGoalHistory);
    const dailySpending = extractDailySpendingFromHistory(dailyGoalHistory);
    const dailyTasks = extractDailyTasksFromHistory(dailyGoalHistory);

    const trends: CoachTrendItem[] = [];
    const focusTrend = detectTrend(dailyFocus, 14);
    trends.push(buildTrendItem('Monthly Focus', focusTrend.direction, focusTrend.magnitudePct, 'focus'));
    const spendTrend = detectTrend(dailySpending, 14);
    trends.push(buildTrendItem('Monthly Spending', spendTrend.direction, spendTrend.magnitudePct, 'finance'));
    const tasksTrend = detectTrend(dailyTasks, 14);
    trends.push(buildTrendItem('Monthly Task Completion', tasksTrend.direction, tasksTrend.magnitudePct, 'tasks'));

    // Recommendations for next month
    const allRecs = getRecommendations();
    const monthlyRecs = allRecs.filter(r => r.priority !== 'info').slice(0, 6);

    return {
      monthLabel,
      monthScore,
      monthGrade,
      executiveSummary,
      recommendations: monthlyRecs,
      trends,
      nextMonthPredictions: getPredictions(),
    };
  });

  // ─── Achievements Summary ────────────────────────────────
  const generateAchievementsSummary = memoize((): AchievementsSummary => {
    const { profile: p, analytics: a } = input;

    // Recent badges (unlocked in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffStr = format(thirtyDaysAgo, 'yyyy-MM-dd');

    const recentAchievements = p.badges
      .filter(b => b.unlockedAt && b.unlockedAt >= cutoffStr)
      .map(b => ({
        id: b.id,
        name: b.name,
        icon: b.icon,
        unlockedAt: b.unlockedAt,
      }));

    // Approaching milestones based on current metrics
    const milestones: AchievementsSummary['approachingMilestones'] = [];

    // Focus milestone: approaching 100 hours total
    const totalFocusHours = a.totalFocusHours;
    const nextFocusMilestone = Math.ceil(totalFocusHours / 50) * 50;
    if (nextFocusMilestone > 0 && totalFocusHours >= nextFocusMilestone * 0.7) {
      milestones.push({
        title: `${nextFocusMilestone}h Focus Club`,
        description: `Reach ${nextFocusMilestone} total hours of focused work.`,
        progressPct: safePercent(totalFocusHours, nextFocusMilestone),
        icon: '⏱️',
        color: '#a855f7',
      });
    }

    // Streak milestone: approaching next multiple of 7
    const nextStreakMilestone = Math.ceil((p.streak + 1) / 7) * 7;
    if (p.streak > 0 && p.streak >= nextStreakMilestone - 3) {
      milestones.push({
        title: `${nextStreakMilestone}-Day Streak`,
        description: `Maintain your streak for ${nextStreakMilestone} consecutive days.`,
        progressPct: safePercent(p.streak, nextStreakMilestone),
        icon: '🔥',
        color: '#f59e0b',
      });
    }

    // Task milestone: approaching next multiple of 50 completed
    const nextTaskMilestone = Math.ceil((a.completedTasksCount + 1) / 50) * 50;
    if (a.completedTasksCount >= nextTaskMilestone * 0.8) {
      milestones.push({
        title: `${nextTaskMilestone} Tasks Completed`,
        description: `Complete ${nextTaskMilestone} total tasks.`,
        progressPct: safePercent(a.completedTasksCount, nextTaskMilestone),
        icon: '✅',
        color: '#10b981',
      });
    }

    // Level info
    const currentLevel = Math.floor(p.xp / 100) + 1;

    return {
      recentAchievements,
      approachingMilestones: milestones.slice(0, 5),
      periodXP: p.xp,
      currentLevel,
      totalBadges: p.badges.length,
    };
  });

  // ─── Return Public Engine ────────────────────────────────
  return {
    generateDailyBrief,
    generateEveningReview,
    generateWeeklyReview,
    generateMonthlyReview,
    generateRecommendations: getRecommendations,
    generatePredictions: getPredictions,
    generateRiskAssessment: getRisks,
    generateAchievementsSummary,
  };
}
