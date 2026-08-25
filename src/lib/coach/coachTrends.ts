/**
 * Coach Engine — Behaviour Trend Analysis (Phase 3.9.5 Task 2)
 *
 * Classifies user behavioral trajectories into Improving, Stable, or Declining
 * across 5 key dimensions:
 * 1. Productivity (Composite Score, Daily Goal Progress)
 * 2. Focus (Total Minutes, Session Depth)
 * 3. Finance (Budget Discipline, Spending Deceleration)
 * 4. Task Completion (Completion Rate, Velocity)
 * 5. Consistency (Daily Active Continuity, Streak Durability)
 *
 * Provides momentum scoring (-100 to +100) and actionable summary insights.
 *
 * @module coach/coachTrends
 */

import type {
  CoachInput,
  CoachBehaviourTrends,
  CoachTrendItem,
  TrendDirection,
} from './coachTypes';
import {
  detectTrend,
  clamp,
  extractDailyFocusFromHistory,
  extractDailySpendingFromHistory,
  extractDailyTasksFromHistory,
  extractDailyProgressFromHistory,
} from './coachUtils';

/**
 * Builds a standardized CoachTrendItem with baseline, current, and confidence metrics.
 */
function createTrendItem(
  metric: string,
  category: CoachTrendItem['category'],
  trendData: { direction: TrendDirection; magnitudePct: number; baselineValue?: number; currentValue?: number },
  unit: string,
  invertSentiment = false // e.g. spending increase might be declining sentiment
): CoachTrendItem {
  let effectiveDirection = trendData.direction;
  if (invertSentiment && trendData.direction !== 'stable') {
    effectiveDirection = trendData.direction === 'improving' ? 'declining' : 'improving';
  }

  const icon = effectiveDirection === 'improving' ? '📈' : effectiveDirection === 'declining' ? '📉' : '➡️';
  const color = effectiveDirection === 'improving' ? '#10b981' : effectiveDirection === 'declining' ? '#ef4444' : '#6b7280';

  const dirWord = effectiveDirection === 'improving' ? 'upward' : effectiveDirection === 'declining' ? 'downward' : 'steady';
  const changeWord = trendData.magnitudePct > 0 ? `by ${trendData.magnitudePct}%` : 'with minimal variance';

  const summary = `${metric} is trending ${dirWord} ${changeWord} compared to the previous baseline period.`;

  return {
    metric,
    direction: effectiveDirection,
    magnitudePct: trendData.magnitudePct,
    summary,
    category,
    icon,
    color,
    baselineValue: trendData.baselineValue ? Math.round(trendData.baselineValue * 10) / 10 : undefined,
    currentValue: trendData.currentValue ? Math.round(trendData.currentValue * 10) / 10 : undefined,
    confidence: trendData.magnitudePct >= 20 ? 'high' : trendData.magnitudePct >= 10 ? 'medium' : 'low',
  };
}

/**
 * Generates the full 5-dimension behavioral trend analysis.
 */
export function generateCoachBehaviourTrends(input: CoachInput): CoachBehaviourTrends {
  const { dailyGoalHistory, analytics } = input;

  const dailyFocus = extractDailyFocusFromHistory(dailyGoalHistory);
  const dailySpending = extractDailySpendingFromHistory(dailyGoalHistory);
  const dailyTasks = extractDailyTasksFromHistory(dailyGoalHistory);
  const dailyProgress = extractDailyProgressFromHistory(dailyGoalHistory);

  // 1. Productivity Trend
  const productivityTrendRaw = detectTrend(dailyProgress, 7);
  const productivity = createTrendItem(
    'Productivity Score',
    'productivity',
    productivityTrendRaw,
    'pts'
  );

  // 2. Focus Trend
  const focusTrendRaw = detectTrend(dailyFocus, 7);
  const focus = createTrendItem(
    'Focus Output',
    'focus',
    focusTrendRaw,
    'min'
  );

  // 3. Finance Trend (spending reduction = improving)
  const financeTrendRaw = detectTrend(dailySpending, 7);
  const finance = createTrendItem(
    'Spending Discipline',
    'finance',
    financeTrendRaw,
    '₹',
    true // lower spending = improvement
  );

  // 4. Task Completion Trend
  const taskTrendRaw = detectTrend(dailyTasks, 7);
  const taskCompletion = createTrendItem(
    'Task Completion Rate',
    'tasks',
    taskTrendRaw,
    'tasks'
  );

  // 5. Consistency Trend (based on daily goal completion rate)
  const consistencyTrendRaw = detectTrend(
    dailyGoalHistory.map(h => (h.completionPct >= 70 ? 100 : h.completionPct >= 40 ? 50 : 0)),
    7
  );
  const consistency = createTrendItem(
    'Daily Habit Consistency',
    'habits',
    consistencyTrendRaw,
    '%'
  );

  // Calculate composite momentum score (-100 to +100)
  const trendVector = (t: CoachTrendItem) => {
    if (t.direction === 'improving') return Math.min(25, 5 + t.magnitudePct * 0.4);
    if (t.direction === 'declining') return -Math.min(25, 5 + t.magnitudePct * 0.4);
    return 0;
  };

  const rawMomentum =
    trendVector(productivity) * 0.25 +
    trendVector(focus) * 0.25 +
    trendVector(finance) * 0.20 +
    trendVector(taskCompletion) * 0.15 +
    trendVector(consistency) * 0.15;

  const trendMomentumScore = clamp(Math.round(rawMomentum * 4), -100, 100);

  let overallDirection: TrendDirection = 'stable';
  if (trendMomentumScore >= 15) overallDirection = 'improving';
  else if (trendMomentumScore <= -15) overallDirection = 'declining';

  let keyInsight = 'Your key productivity and financial metrics are maintaining a stable trajectory.';
  if (trendMomentumScore >= 35) {
    keyInsight = 'Outstanding forward momentum across multiple performance vectors!';
  } else if (trendMomentumScore <= -35) {
    keyInsight = 'Noticeable downward pressure observed in recent output — consider a reset day.';
  } else if (focus.direction === 'improving' && finance.direction === 'declining') {
    keyInsight = 'High focus is yielding results, but watch for spending spikes on recovery days.';
  } else if (finance.direction === 'improving' && focus.direction === 'declining') {
    keyInsight = 'Excellent financial discipline; focus output has slight room for revival.';
  }

  return {
    productivity,
    focus,
    finance,
    taskCompletion,
    consistency,
    overallDirection,
    trendMomentumScore,
    keyInsight,
  };
}
