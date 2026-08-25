/**
 * Coach Engine — Deterministic Rule System (Phase 3.9.5 Enhanced)
 *
 * Contains all coach rules that evaluate user data against thresholds.
 * Every rule is a pure function: same input → same output, no randomness,
 * no external AI, no side effects.
 *
 * Every recommendation now includes:
 * - Impact (high / medium / low)
 * - Urgency (high / medium / low)
 * - Confidence (high / medium / low)
 * - Estimated Benefit
 * - Estimated Effort
 * - Ranking Score (0-100)
 * - Comprehensive Explainability (why, trigger metrics, expected improvement, related metrics)
 *
 * Rules are ranked and sorted deterministically.
 *
 * @module coach/coachRules
 */

import type { CoachRule, CoachInput, CoachRecommendation } from './coachTypes';
import {
  countOverdueTasks,
  getTodayDateString,
  calculateStreakRisk,
  computeRecommendationRankingScore,
  rankRecommendations,
  safePercent,
} from './coachUtils';

// ═══════════════════════════════════════════════════════════════
// Rule Definitions
// ═══════════════════════════════════════════════════════════════

/**
 * Rule: Focus Below Weekly Average
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
    const dropPct = Math.round((1 - ratio) * 100);

    const rec: CoachRecommendation = {
      id: 'rule_focus_below_weekly_avg',
      title: 'Focus Below Weekly Average',
      description: `This week's focus (${currentWeekly}m) is ${dropPct}% below your weekly average of ${Math.round(weeklyAvg)}m.`,
      action: `Log at least ${Math.min(deficit, 60)} more focus minutes today to close the gap.`,
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
      impact: 'high',
      urgency: 'high',
      confidence: 'high',
      estimatedBenefit: `Recovers ${Math.min(deficit, 60)}m of productive deep work towards your weekly pace.`,
      estimatedEffort: 'medium',
      explainability: {
        why: `Current weekly focus time (${currentWeekly}m) has dipped more than 20% below your typical weekly baseline (${Math.round(weeklyAvg)}m).`,
        triggerMetrics: [
          { label: 'Weekly Focus', current: currentWeekly, threshold: Math.round(weeklyAvg * 0.8), unit: 'min' },
          { label: 'Deficit to Average', current: deficit, threshold: 0, unit: 'min' },
        ],
        expectedImprovement: 'Brings your weekly focus score back within normal standard deviation.',
        relatedMetrics: ['weeklyFocusMin', 'productivityScore', 'focusConsistencyRate'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Task Completion Below 60%
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

    const rec: CoachRecommendation = {
      id: 'rule_task_completion_low',
      title: 'Task Completion Below 60%',
      description: `Only ${rate}% of your tasks are completed (${analytics.completedTasksCount}/${analytics.totalTasksCount}). You have ${pending} pending tasks.`,
      action: 'Focus on completing 2-3 high-priority tasks first each morning. Break large tasks into smaller sub-steps.',
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
      impact: 'high',
      urgency: 'high',
      confidence: 'high',
      estimatedBenefit: 'Clears task backlog debt and raises overall productivity score by ~15 pts.',
      estimatedEffort: 'medium',
      explainability: {
        why: `The ratio of completed tasks (${analytics.completedTasksCount}) to total active tasks (${analytics.totalTasksCount}) is ${rate}%, falling below the 60% healthy velocity threshold.`,
        triggerMetrics: [
          { label: 'Completion Rate', current: rate, threshold: 60, unit: '%' },
          { label: 'Pending Task Count', current: pending, threshold: 5, unit: 'tasks' },
        ],
        expectedImprovement: 'Increases task throughput and reduces cognitive overhead.',
        relatedMetrics: ['taskCompletionRate', 'completedTasksCount', 'productivityScore'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Budget Likely to Exceed
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

    const rec: CoachRecommendation = {
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
      impact: 'high',
      urgency: 'high',
      confidence: 'high',
      estimatedBenefit: `Prevents ₹${Math.max(overBy, 500)} in monthly deficit and protects savings targets.`,
      estimatedEffort: 'medium',
      explainability: {
        why: `Linear forecast of current daily burn rate (₹${analytics.forecast.dailyBurnRate}/day) projects a month-end expenditure of ₹${projected}, breaching the monthly budget of ₹${budget}.`,
        triggerMetrics: [
          { label: 'Projected Month Spend', current: projected, threshold: budget, unit: '₹' },
          { label: 'Daily Burn Rate', current: analytics.forecast.dailyBurnRate, threshold: Math.round(budget / 30), unit: '₹/day' },
        ],
        expectedImprovement: 'Keeps total monthly spending strictly within budget envelope.',
        relatedMetrics: ['projectedMonthEndSpend', 'budgetUtilizationPct', 'financialScore'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Streak at Risk
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

    const rec: CoachRecommendation = {
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
      impact: 'high',
      urgency: 'high',
      confidence: 'high',
      estimatedBenefit: `Preserves your active ${profile.streak}-day streak and prevents XP reset.`,
      estimatedEffort: 'low',
      explainability: {
        why: `User has an active streak of ${profile.streak} days, but 0 focus sessions and 0 completed tasks have been recorded today.`,
        triggerMetrics: [
          { label: 'Current Streak', current: profile.streak, threshold: 1, unit: 'days' },
          { label: "Today's Focus", current: todayFocus, threshold: 1, unit: 'min' },
          { label: "Today's Completed Tasks", current: todayTasks, threshold: 1, unit: 'tasks' },
        ],
        expectedImprovement: 'Extends consecutive active days counter and boosts habit momentum.',
        relatedMetrics: ['streak', 'currentStreak', 'focusConsistencyRate'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Too Many Overdue Tasks
 */
const tooManyOverdueTasks: CoachRule = {
  id: 'rule_overdue_tasks',
  name: 'Too Many Overdue Tasks',
  category: 'tasks',
  defaultPriority: 'high',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const todayStr = getTodayDateString();
    const overdueCount = countOverdueTasks(input.tasks, todayStr);

    if (overdueCount <= 3) return null;

    const rec: CoachRecommendation = {
      id: 'rule_overdue_tasks',
      title: 'Overdue Tasks Accumulating',
      description: `You have ${overdueCount} overdue tasks that are past their deadlines. This creates unnecessary mental load.`,
      action: 'Review overdue tasks: reschedule, delegate, or mark as done to clear mental clutter.',
      priority: 'high',
      category: 'tasks',
      icon: '⚠️',
      color: '#ef4444',
      metric: {
        label: 'Overdue Tasks',
        current: overdueCount,
        threshold: 3,
        unit: 'tasks',
      },
      impact: 'medium',
      urgency: 'high',
      confidence: 'high',
      estimatedBenefit: 'Reduces task backlog debt and clears cognitive friction.',
      estimatedEffort: 'low',
      explainability: {
        why: `${overdueCount} pending tasks have scheduled deadlines prior to today (${todayStr}).`,
        triggerMetrics: [
          { label: 'Overdue Task Count', current: overdueCount, threshold: 3, unit: 'tasks' },
        ],
        expectedImprovement: 'Improves task velocity and removes stale backlog items.',
        relatedMetrics: ['taskCompletionRate', 'totalTasksCount'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Weekend Spending Spike
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = getTodayDateString(thirtyDaysAgo);

    const recentExpenses = expenses.filter(e => e.expense_date >= cutoff);

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

    if (weekdayAvg <= 0 || weekendAvg < weekdayAvg * 1.8) return null;

    const spikeMultiple = (weekendAvg / weekdayAvg).toFixed(1);

    const rec: CoachRecommendation = {
      id: 'rule_weekend_spending',
      title: 'Weekend Spending Spike',
      description: `Your weekend spending (₹${Math.round(weekendAvg)}/day) is ${spikeMultiple}x higher than weekday spending (₹${Math.round(weekdayAvg)}/day).`,
      action: 'Plan weekend activities with a pre-set budget to avoid impulse purchases.',
      priority: 'medium',
      category: 'finance',
      icon: '📊',
      color: '#ec4899',
      metric: {
        label: 'Weekend vs Weekday Spend',
        current: Math.round(weekendAvg),
        threshold: Math.round(weekdayAvg * 1.8),
        unit: '₹/day',
      },
      impact: 'medium',
      urgency: 'medium',
      confidence: 'high',
      estimatedBenefit: `Potential savings of up to ₹${Math.round((weekendAvg - weekdayAvg) * 8)} per month.`,
      estimatedEffort: 'medium',
      explainability: {
        why: `Average weekend spending (₹${Math.round(weekendAvg)}) significantly outpaces weekday expenditure (₹${Math.round(weekdayAvg)}) by ${spikeMultiple}x.`,
        triggerMetrics: [
          { label: 'Weekend Avg Spend', current: Math.round(weekendAvg), threshold: Math.round(weekdayAvg * 1.8), unit: '₹/day' },
          { label: 'Weekday Avg Spend', current: Math.round(weekdayAvg), threshold: Math.round(weekdayAvg), unit: '₹/day' },
        ],
        expectedImprovement: 'Smooths monthly expenditure variance and preserves savings goals.',
        relatedMetrics: ['monthlySpent', 'availableBudget', 'financialScore'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Savings Progressing
 */
const savingsProgressing: CoachRule = {
  id: 'rule_savings_progressing',
  name: 'Savings Progressing',
  category: 'savings',
  defaultPriority: 'low',
  evaluate: (input: CoachInput): CoachRecommendation | null => {
    const { savingsGoals } = input;
    if (savingsGoals.length === 0) return null;

    const goalsWithProgress = savingsGoals.filter(g => g.target_amount > 0 && g.current_amount > 0);
    if (goalsWithProgress.length === 0) return null;

    const bestGoal = goalsWithProgress.reduce((best, g) => {
      const pct = safePercent(g.current_amount, g.target_amount);
      const bestPct = safePercent(best.current_amount, best.target_amount);
      return pct > bestPct ? g : best;
    });

    const progressPct = safePercent(bestGoal.current_amount, bestGoal.target_amount);
    if (progressPct < 10) return null;

    const rec: CoachRecommendation = {
      id: 'rule_savings_progressing',
      title: 'Savings Goal Progress',
      description: `"${bestGoal.title}" is ${progressPct}% funded (₹${bestGoal.current_amount} of ₹${bestGoal.target_amount}).`,
      action: progressPct >= 75
        ? 'Almost there! Keep allocating to reach your savings target.'
        : 'Stay consistent with your monthly savings contributions to build momentum.',
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
      impact: 'low',
      urgency: 'low',
      confidence: 'high',
      estimatedBenefit: `Completes ₹${bestGoal.target_amount} capital accumulation goal.`,
      estimatedEffort: 'low',
      explainability: {
        why: `Savings goal "${bestGoal.title}" has reached ${progressPct}% funding.`,
        triggerMetrics: [
          { label: 'Current Progress', current: progressPct, threshold: 10, unit: '%' },
        ],
        expectedImprovement: 'Builds financial runway and goal discipline.',
        relatedMetrics: ['total_savings', 'financialScore'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Focus Improving
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

    const rec: CoachRecommendation = {
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
      impact: 'low',
      urgency: 'low',
      confidence: 'high',
      estimatedBenefit: 'Solidifies productive habits and increases total output.',
      estimatedEffort: 'low',
      explainability: {
        why: `Focus minutes grew by ${growth}% over the prior equal period.`,
        triggerMetrics: [
          { label: 'Focus Growth %', current: growth, threshold: 15, unit: '%' },
        ],
        expectedImprovement: 'Increases weekly deep work baseline.',
        relatedMetrics: ['totalFocusHours', 'productivityScore'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Consistency Improving
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

    const rec: CoachRecommendation = {
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
      impact: 'medium',
      urgency: 'low',
      confidence: 'high',
      estimatedBenefit: 'Compounds long-term productivity without burnout risk.',
      estimatedEffort: 'low',
      explainability: {
        why: `${rate}% of recorded days met the 30-minute minimum daily focus threshold.`,
        triggerMetrics: [
          { label: 'Consistency Rate', current: rate, threshold: 70, unit: '%' },
        ],
        expectedImprovement: 'Establishes sustainable automated habit loops.',
        relatedMetrics: ['focusConsistencyRate', 'productivityScore'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Strong Momentum
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

    const rec: CoachRecommendation = {
      id: 'rule_strong_momentum',
      title: 'Strong Momentum',
      description: `Your productivity score is ${score} with ${focusGrowth}% focus growth. You're on a powerful trajectory!`,
      action: "Leverage this momentum — take on that important task you've been postponing.",
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
      impact: 'medium',
      urgency: 'low',
      confidence: 'high',
      estimatedBenefit: 'Maximizes execution on high-leverage stretch goals.',
      estimatedEffort: 'low',
      explainability: {
        why: `Productivity score (${score}) and focus growth (+${focusGrowth}%) both indicate peak operational state.`,
        triggerMetrics: [
          { label: 'Productivity Score', current: score, threshold: 75, unit: 'pts' },
          { label: 'Focus Growth %', current: focusGrowth, threshold: 5, unit: '%' },
        ],
        expectedImprovement: 'Accelerates milestone completions.',
        relatedMetrics: ['productivityScore', 'taskCompletionRate'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

/**
 * Rule: Perfect Focus Day
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

    const rec: CoachRecommendation = {
      id: 'rule_perfect_focus_day',
      title: 'Daily Focus Goal Reached!',
      description: `You've logged ${todayFocus} minutes of focus today, meeting your ${dailyGoal}-minute daily goal.`,
      action: 'Well done! Consider using extra time for learning or resting.',
      priority: 'info',
      category: 'focus',
      icon: '🎯',
      color: '#10b981',
      metric: {
        label: "Today's Focus",
        current: todayFocus,
        threshold: dailyGoal,
        unit: 'min',
      },
      impact: 'low',
      urgency: 'low',
      confidence: 'high',
      estimatedBenefit: 'Secures daily target and strengthens focus endurance.',
      estimatedEffort: 'low',
      explainability: {
        why: `Today's logged focus (${todayFocus}m) meets or exceeds the user goal (${dailyGoal}m).`,
        triggerMetrics: [
          { label: "Today's Focus", current: todayFocus, threshold: dailyGoal, unit: 'min' },
        ],
        expectedImprovement: 'Guarantees goal completion for today snapshot.',
        relatedMetrics: ['todayFocusMin', 'currentStreak'],
      },
    };

    return {
      ...rec,
      rankingScore: computeRecommendationRankingScore(rec),
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// Rule Registry
// ═══════════════════════════════════════════════════════════════

export const COACH_RULES: readonly CoachRule[] = [
  streakAtRisk,
  budgetLikelyToExceed,
  focusBelowWeeklyAverage,
  taskCompletionLow,
  tooManyOverdueTasks,
  weekendSpendingSpike,
  savingsProgressing,
  focusImproving,
  consistencyImproving,
  strongMomentum,
  perfectFocusDay,
];

// ═══════════════════════════════════════════════════════════════
// Rule Evaluation & Deterministic Ranking
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluates all coach rules and deterministically ranks recommendations
 * based on composite ranking score (Impact + Urgency + Confidence - Effort).
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
      // Silently skip broken rules
    }
  }

  // Deterministic automated ranking
  return rankRecommendations(results);
}
