/**
 * Coach Engine — Deterministic Rule System
 *
 * Contains all coach rules that evaluate user data against thresholds.
 * Every rule is a pure function: same input → same output, no randomness,
 * no external AI, no side effects.
 *
 * Rules are defined as an array of CoachRule objects. The engine iterates
 * all rules, collects non-null results, and sorts by priority.
 *
 * Dependencies:
 * - coachTypes: CoachRule, CoachInput, CoachRecommendation
 * - coachUtils: streak risk, overdue counting, safe math
 *
 * Future consumers:
 * - coachEngine.ts (evaluates all rules to generate recommendations/risks)
 *
 * @module coach/coachRules
 */

import type { CoachRule, CoachInput, CoachRecommendation } from './coachTypes';
import { safePercent, countOverdueTasks, getTodayDateString, calculateStreakRisk } from './coachUtils';

// ═══════════════════════════════════════════════════════════════
// Rule Definitions
// ═══════════════════════════════════════════════════════════════

/**
 * Rule: Focus Below Weekly Average
 *
 * Fires when this week's focus is more than 20% below the period's
 * weekly average. Uses analytics engine's weeklyFocusMin and
 * totalFocusMin / daysCount for the average.
 */
const focusBelowWeeklyAverage: CoachRule = {
  id: 'rule_focus_below_weekly_avg',
  name: 'Focus Below Weekly Average',
  category: 'focus',
  defaultPriority: 'high',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics } = input;
    const weeklyAvg = analytics.daysCount > 0
      ? (analytics.totalFocusMin / analytics.daysCount) * 7
      : 0;

    if (weeklyAvg <= 0) return null;

    const currentWeekly = analytics.weeklyFocusMin;
    const ratio = currentWeekly / weeklyAvg;

    if (ratio >= 0.8) return null;

    const deficit = Math.round(weeklyAvg - currentWeekly);

    return {
      id: 'rule_focus_below_weekly_avg',
      title: 'Focus Below Weekly Average',
      description: `This week's focus (${currentWeekly}m) is ${Math.round((1 - ratio) * 100)}% below your weekly average of ${Math.round(weeklyAvg)}m.`,
      action: `Try to log at least ${Math.min(deficit, 60)} more focus minutes today to close the gap.`,
      priority: 'high',
      category: 'focus',
      icon: '⏱️',
      color: '#f59e0b',
      metric: {
        label: 'Weekly Focus',
        current: currentWeekly,
        threshold: Math.round(weeklyAvg * 0.8),
        unit: 'min',
      },
    };
  },
};

/**
 * Rule: Task Completion Below 60%
 *
 * Fires when the overall task completion rate drops below 60%.
 * Uses analytics engine's taskCompletionRate.
 */
const taskCompletionLow: CoachRule = {
  id: 'rule_task_completion_low',
  name: 'Task Completion Below 60%',
  category: 'tasks',
  defaultPriority: 'high',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics } = input;
    const rate = analytics.taskCompletionRate;

    if (rate >= 60 || analytics.totalTasksCount === 0) return null;

    const pending = analytics.totalTasksCount - analytics.completedTasksCount;

    return {
      id: 'rule_task_completion_low',
      title: 'Task Completion Below 60%',
      description: `Only ${rate}% of your tasks are completed (${analytics.completedTasksCount}/${analytics.totalTasksCount}). You have ${pending} pending tasks.`,
      action: 'Focus on completing high-priority tasks first each morning. Consider breaking large tasks into smaller steps.',
      priority: 'high',
      category: 'tasks',
      icon: '✅',
      color: '#ef4444',
      metric: {
        label: 'Completion Rate',
        current: rate,
        threshold: 60,
        unit: '%',
      },
    };
  },
};

/**
 * Rule: Budget Likely to Exceed
 *
 * Fires when projected month-end spending exceeds 95% of the monthly budget.
 * Uses analytics engine's forecast data.
 */
const budgetLikelyToExceed: CoachRule = {
  id: 'rule_budget_likely_exceed',
  name: 'Budget Likely to Exceed',
  category: 'finance',
  defaultPriority: 'critical',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics, profile } = input;
    const budget = profile.monthly_budget;

    if (budget <= 0) return null;

    const projected = analytics.forecast.projectedMonthEndSpend;
    const ratio = projected / budget;

    if (ratio < 0.95) return null;

    const overBy = Math.round(projected - budget);
    const isCritical = ratio >= 1.0;

    return {
      id: 'rule_budget_likely_exceed',
      title: isCritical ? 'Budget Will Be Exceeded' : 'Budget at Risk',
      description: isCritical
        ? `At your current spending rate (₹${analytics.forecast.dailyBurnRate}/day), you are projected to exceed your budget by ₹${overBy}.`
        : `You are on track to use ${Math.round(ratio * 100)}% of your monthly budget. Only ₹${Math.round(budget - analytics.monthlySpent)} remains.`,
      action: isCritical
        ? 'Reduce daily spending immediately to avoid overspending this month.'
        : 'Monitor your spending closely for the remainder of the month.',
      priority: isCritical ? 'critical' : 'high',
      category: 'finance',
      icon: '💸',
      color: '#ef4444',
      metric: {
        label: 'Projected Spending',
        current: projected,
        threshold: budget,
        unit: '₹',
      },
    };
  },
};

/**
 * Rule: Focus Improving
 *
 * Fires when focus growth is 15%+ compared to previous period.
 * Positive reinforcement rule.
 */
const focusImproving: CoachRule = {
  id: 'rule_focus_improving',
  name: 'Focus Improving',
  category: 'focus',
  defaultPriority: 'info',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics } = input;
    const growth = analytics.comparison.focusGrowthPct;

    if (growth < 15) return null;

    return {
      id: 'rule_focus_improving',
      title: 'Focus Time Improving',
      description: `Your focus time has increased by ${growth}% compared to the previous period. Great momentum!`,
      action: 'Maintain your current cadence by scheduling key tasks during your peak hours.',
      priority: 'info',
      category: 'focus',
      icon: '📈',
      color: '#10b981',
      metric: {
        label: 'Focus Growth',
        current: growth,
        threshold: 15,
        unit: '%',
      },
    };
  },
};

/**
 * Rule: Consistency Improving
 *
 * Fires when focus consistency rate is 70%+ (active days with ≥30m focus).
 * Positive reinforcement rule.
 */
const consistencyImproving: CoachRule = {
  id: 'rule_consistency_improving',
  name: 'Consistency Improving',
  category: 'habits',
  defaultPriority: 'info',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics } = input;
    const rate = analytics.focusConsistencyRate;

    if (rate < 70) return null;

    return {
      id: 'rule_consistency_improving',
      title: 'Strong Consistency',
      description: `You maintained 30+ minutes of focus on ${rate}% of days in this period. Consistency compounds!`,
      action: 'Keep your daily routine — consistency is more powerful than intensity.',
      priority: 'info',
      category: 'habits',
      icon: '🔄',
      color: '#10b981',
      metric: {
        label: 'Consistency Rate',
        current: rate,
        threshold: 70,
        unit: '%',
      },
    };
  },
};

/**
 * Rule: Streak at Risk
 *
 * Fires when the user has an active streak but hasn't logged any
 * activity today (no focus sessions, no completed tasks).
 */
const streakAtRisk: CoachRule = {
  id: 'rule_streak_at_risk',
  name: 'Streak at Risk',
  category: 'streak',
  defaultPriority: 'critical',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics, profile } = input;
    const todayFocus = analytics.todayFocusMin;
    const todayTasks = input.tasks.filter(t =>
      t.status === 'completed' &&
      t.completed_at !== null &&
      t.completed_at.startsWith(getTodayDateString())
    ).length;

    const isAtRisk = calculateStreakRisk(profile.streak, todayFocus, todayTasks);
    if (!isAtRisk) return null;

    return {
      id: 'rule_streak_at_risk',
      title: 'Streak at Risk!',
      description: `Your ${profile.streak}-day streak will break if you don't log any activity today. No focus sessions or completed tasks recorded yet.`,
      action: 'Complete at least one task or start a quick 25-minute focus session to keep your streak alive.',
      priority: 'critical',
      category: 'streak',
      icon: '🔥',
      color: '#ef4444',
      metric: {
        label: 'Current Streak',
        current: profile.streak,
        threshold: 1,
        unit: 'days',
      },
    };
  },
};

/**
 * Rule: Savings Progressing
 *
 * Fires when savings goals exist and at least one has meaningful progress.
 * Positive reinforcement rule.
 */
const savingsProgressing: CoachRule = {
  id: 'rule_savings_progressing',
  name: 'Savings Progressing',
  category: 'savings',
  defaultPriority: 'low',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { savingsGoals } = input;

    if (savingsGoals.length === 0) return null;

    const goalsWithProgress = savingsGoals.filter(g =>
      g.target_amount > 0 && g.current_amount > 0
    );

    if (goalsWithProgress.length === 0) return null;

    const bestGoal = goalsWithProgress.reduce((best, g) => {
      const pct = safePercent(g.current_amount, g.target_amount);
      const bestPct = safePercent(best.current_amount, best.target_amount);
      return pct > bestPct ? g : best;
    });

    const progressPct = safePercent(bestGoal.current_amount, bestGoal.target_amount);

    if (progressPct < 10) return null;

    return {
      id: 'rule_savings_progressing',
      title: 'Savings Goal Progress',
      description: `"${bestGoal.title}" is ${progressPct}% funded (₹${bestGoal.current_amount} of ₹${bestGoal.target_amount}).`,
      action: progressPct >= 75
        ? 'Almost there! Keep allocating to reach your savings target.'
        : 'Stay consistent with your savings contributions to build momentum.',
      priority: 'low',
      category: 'savings',
      icon: '🐷',
      color: '#10b981',
      metric: {
        label: 'Savings Progress',
        current: progressPct,
        threshold: 10,
        unit: '%',
      },
    };
  },
};

/**
 * Rule: Too Many Overdue Tasks
 *
 * Fires when there are more than 5 overdue tasks (past deadline, still pending).
 */
const tooManyOverdueTasks: CoachRule = {
  id: 'rule_overdue_tasks',
  name: 'Too Many Overdue Tasks',
  category: 'tasks',
  defaultPriority: 'high',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const todayStr = getTodayDateString();
    const overdueCount = countOverdueTasks(input.tasks, todayStr);

    if (overdueCount <= 5) return null;

    return {
      id: 'rule_overdue_tasks',
      title: 'Too Many Overdue Tasks',
      description: `You have ${overdueCount} overdue tasks that are past their deadlines. This can create unnecessary mental load.`,
      action: 'Review overdue tasks and either reschedule, complete, or mark as won\'t do. Prioritize the most impactful ones.',
      priority: 'high',
      category: 'tasks',
      icon: '⚠️',
      color: '#ef4444',
      metric: {
        label: 'Overdue Tasks',
        current: overdueCount,
        threshold: 5,
        unit: 'tasks',
      },
    };
  },
};

/**
 * Rule: Weekend Spending Spike
 *
 * Fires when weekend spending is more than 2x the weekday average.
 * Analyzes expenses from the current period.
 */
const weekendSpendingSpike: CoachRule = {
  id: 'rule_weekend_spending',
  name: 'Weekend Spending Spike',
  category: 'finance',
  defaultPriority: 'medium',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { expenses } = input;

    if (expenses.length < 7) return null;

    let weekdayTotal = 0;
    let weekdayDays = 0;
    let weekendTotal = 0;
    let weekendDays = 0;

    // Analyze spending patterns over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = getTodayDateString(thirtyDaysAgo);

    const recentExpenses = expenses.filter(e =>
      e.expense_date >= cutoff
    );

    // Group by date and classify as weekday/weekend
    const dateSpending: Record<string, number> = {};
    recentExpenses.forEach(e => {
      dateSpending[e.expense_date] = (dateSpending[e.expense_date] || 0) + e.amount;
    });

    Object.entries(dateSpending).forEach(([dateStr, amount]) => {
      const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendTotal += amount;
        weekendDays++;
      } else {
        weekdayTotal += amount;
        weekdayDays++;
      }
    });

    if (weekdayDays === 0 || weekendDays === 0) return null;

    const weekdayAvg = weekdayTotal / weekdayDays;
    const weekendAvg = weekendTotal / weekendDays;

    if (weekdayAvg <= 0 || weekendAvg < weekdayAvg * 2) return null;

    const spikeMultiple = (weekendAvg / weekdayAvg).toFixed(1);

    return {
      id: 'rule_weekend_spending',
      title: 'Weekend Spending Spike',
      description: `Your weekend spending (₹${Math.round(weekendAvg)}/day) is ${spikeMultiple}x higher than weekday spending (₹${Math.round(weekdayAvg)}/day).`,
      action: 'Plan weekend activities with a pre-set budget to avoid impulse spending.',
      priority: 'medium',
      category: 'finance',
      icon: '📊',
      color: '#ec4899',
      metric: {
        label: 'Weekend vs Weekday Spend',
        current: Math.round(weekendAvg),
        threshold: Math.round(weekdayAvg * 2),
        unit: '₹/day',
      },
    };
  },
};

/**
 * Rule: High Spending After Low Productivity
 *
 * Fires when today has low focus (< 30 min) combined with
 * above-average spending. Indicates a potential "off" day.
 */
const highSpendLowFocus: CoachRule = {
  id: 'rule_high_spend_low_focus',
  name: 'High Spending After Low Productivity',
  category: 'wellness',
  defaultPriority: 'medium',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics } = input;
    const todayFocus = analytics.todayFocusMin;
    const todaySpent = analytics.todaySpent;
    const avgDailySpend = analytics.avgDailySpend;

    // Only trigger when focus is low AND spending is notably above average
    if (todayFocus >= 30 || todaySpent <= avgDailySpend * 1.5 || avgDailySpend <= 0) {
      return null;
    }

    return {
      id: 'rule_high_spend_low_focus',
      title: 'Low Focus, High Spending Day',
      description: `Today has low focus time (${todayFocus}m) but above-average spending (₹${Math.round(todaySpent)} vs ₹${Math.round(avgDailySpend)} avg).`,
      action: 'Consider starting a short focus session. On focused days, you tend to spend less.',
      priority: 'medium',
      category: 'wellness',
      icon: '🧘',
      color: '#f59e0b',
      metric: {
        label: 'Today\'s Spending',
        current: Math.round(todaySpent),
        threshold: Math.round(avgDailySpend * 1.5),
        unit: '₹',
      },
    };
  },
};

/**
 * Rule: Strong Momentum
 *
 * Fires when the productivity score is 75+ and focus is on an improving trend.
 * Positive reinforcement for sustained performance.
 */
const strongMomentum: CoachRule = {
  id: 'rule_strong_momentum',
  name: 'Strong Momentum',
  category: 'productivity',
  defaultPriority: 'info',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics } = input;
    const score = analytics.productivityScore;
    const focusGrowth = analytics.comparison.focusGrowthPct;

    if (score < 75 || focusGrowth < 5) return null;

    return {
      id: 'rule_strong_momentum',
      title: 'Strong Momentum',
      description: `Your productivity score is ${score} with ${focusGrowth}% focus growth. You're on a powerful trajectory!`,
      action: 'Leverage this momentum — take on that important task you\'ve been postponing.',
      priority: 'info',
      category: 'productivity',
      icon: '🚀',
      color: '#a855f7',
      metric: {
        label: 'Productivity Score',
        current: score,
        threshold: 75,
        unit: 'pts',
      },
    };
  },
};

/**
 * Rule: Excellent Week
 *
 * Fires when the overall wellness score is 80+ (grade A or better).
 * Positive reinforcement for a well-rounded week.
 */
const excellentWeek: CoachRule = {
  id: 'rule_excellent_week',
  name: 'Excellent Week',
  category: 'productivity',
  defaultPriority: 'info',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics } = input;
    const score = analytics.overallWellnessScore;

    if (score < 80) return null;

    return {
      id: 'rule_excellent_week',
      title: 'Excellent Performance',
      description: `Your overall wellness score is ${score} (${analytics.overallWellnessLabel}). You're balancing productivity and finances exceptionally well.`,
      action: 'Celebrate this achievement! Share your progress or set a new stretch goal.',
      priority: 'info',
      category: 'productivity',
      icon: '🏆',
      color: '#10b981',
      metric: {
        label: 'Wellness Score',
        current: score,
        threshold: 80,
        unit: 'pts',
      },
    };
  },
};

/**
 * Rule: Perfect Focus Day
 *
 * Fires when today's focus meets or exceeds the daily focus goal.
 * Positive reinforcement for reaching the target.
 */
const perfectFocusDay: CoachRule = {
  id: 'rule_perfect_focus_day',
  name: 'Perfect Focus Day',
  category: 'focus',
  defaultPriority: 'info',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { analytics, preferences } = input;
    const todayFocus = analytics.todayFocusMin;
    const dailyGoal = preferences.default_daily_focus_goal || 120;

    if (todayFocus < dailyGoal) return null;

    return {
      id: 'rule_perfect_focus_day',
      title: 'Daily Focus Goal Reached!',
      description: `You've logged ${todayFocus} minutes of focus today, meeting your ${dailyGoal}-minute daily goal.`,
      action: 'Well done! Consider using extra time for learning or tackling a stretch task.',
      priority: 'info',
      category: 'focus',
      icon: '🎯',
      color: '#10b981',
      metric: {
        label: 'Today\'s Focus',
        current: todayFocus,
        threshold: dailyGoal,
        unit: 'min',
      },
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// Rule Registry
// ═══════════════════════════════════════════════════════════════

/**
 * Complete list of all coach rules.
 *
 * Rules are ordered by typical priority (critical first), but the engine
 * sorts results by the actual fired priority, not definition order.
 *
 * To add a new rule:
 * 1. Define a CoachRule object above
 * 2. Add it to this array
 * 3. The engine will automatically pick it up
 */
export const COACH_RULES: readonly CoachRule[] = [
  // Critical
  streakAtRisk,
  budgetLikelyToExceed,
  // High
  focusBelowWeeklyAverage,
  taskCompletionLow,
  tooManyOverdueTasks,
  // Medium
  weekendSpendingSpike,
  highSpendLowFocus,
  // Low
  savingsProgressing,
  // Info (positive reinforcement)
  focusImproving,
  consistencyImproving,
  strongMomentum,
  excellentWeek,
  perfectFocusDay,
];

// ═══════════════════════════════════════════════════════════════
// Rule Evaluation
// ═══════════════════════════════════════════════════════════════

/**
 * Priority sort order for deterministic ranking.
 * Lower value = higher urgency.
 */
const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/**
 * Evaluates all coach rules against the provided input and returns
 * fired recommendations sorted by priority (most urgent first).
 *
 * This is the main entry point for rule evaluation. The engine calls
 * this function to generate the complete recommendations list.
 *
 * @param input - Complete coach input data
 * @returns Array of fired recommendations, sorted by priority
 */
export function evaluateAllRules(input: CoachInput): CoachRecommendation[] {
  const results: CoachRecommendation[] = [];

  for (const rule of COACH_RULES) {
    try {
      const result = rule.evaluate(input);
      if (result !== null) {
        results.push(result);
      }
    } catch {
      // Silently skip rules that error — coach should never crash the app.
      // In production, this would log to an observability service.
    }
  }

  // Sort by priority (critical first), then alphabetically by id for stability
  return results.sort((a, b) => {
    const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
    if (priorityDiff !== 0) return priorityDiff;
    return a.id.localeCompare(b.id);
  });
}
