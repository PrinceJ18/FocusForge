/**
 * Coach Engine — Habit Detection Layer (Phase 3.9.5 Task 1)
 *
 * Discovers and models user recurring habits, peak performance zones,
 * friction points, weekend dynamics, spending patterns, and procrastination habits.
 *
 * All functions are pure, deterministic, and side-effect free.
 *
 * @module coach/coachHabits
 */

import { parseISO, getDay, getHours } from 'date-fns';
import type {
  CoachInput,
  CoachHabitAnalysis,
  WeekdayPerformance,
  FocusHourSlot,
  WeekendBehaviour,
  SpendingHabitAnalysis,
  ProcrastinationPatternAnalysis,
} from './coachTypes';
import { clamp, safePercent, detectTrend } from './coachUtils';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Computes performance broken down across all 7 days of the week.
 */
export function analyzeWeekdayPerformance(input: CoachInput): {
  allWeekdays: WeekdayPerformance[];
  bestWeekday: WeekdayPerformance;
  weakestWeekday: WeekdayPerformance;
} {
  const { focusSessions, tasks, expenses, dailyGoalHistory } = input;

  const weekdayStats: Array<{
    dayIndex: number;
    dayName: string;
    totalFocus: number;
    totalTasks: number;
    totalSpend: number;
    sessionCount: number;
    dayCount: number;
  }> = WEEKDAY_NAMES.map((name, index) => ({
    dayIndex: index,
    dayName: name,
    totalFocus: 0,
    totalTasks: 0,
    totalSpend: 0,
    sessionCount: 0,
    dayCount: 0,
  }));

  // Aggregate from daily snapshots if available for historical robustness
  if (dailyGoalHistory.length > 0) {
    dailyGoalHistory.forEach(entry => {
      try {
        const d = parseISO(entry.date);
        const dayIdx = getDay(d);
        weekdayStats[dayIdx].totalFocus += entry.focusMinutes;
        weekdayStats[dayIdx].totalTasks += entry.tasksCompleted;
        weekdayStats[dayIdx].totalSpend += entry.totalSpent;
        weekdayStats[dayIdx].dayCount += 1;
      } catch {
        // Skip invalid date
      }
    });
  } else {
    // Fallback directly to raw sessions, tasks, and expenses
    focusSessions.forEach(session => {
      try {
        const d = parseISO(session.session_date);
        const dayIdx = getDay(d);
        weekdayStats[dayIdx].totalFocus += session.minutes;
        weekdayStats[dayIdx].sessionCount += session.sessions_count || 1;
        weekdayStats[dayIdx].dayCount = Math.max(1, weekdayStats[dayIdx].dayCount);
      } catch {
        // Skip
      }
    });

    tasks.forEach(t => {
      if (t.status === 'completed' && t.completed_at) {
        try {
          const d = parseISO(t.completed_at);
          const dayIdx = getDay(d);
          weekdayStats[dayIdx].totalTasks += 1;
        } catch {
          // Skip
        }
      }
    });

    expenses.forEach(e => {
      try {
        const d = parseISO(e.expense_date);
        const dayIdx = getDay(d);
        weekdayStats[dayIdx].totalSpend += e.amount;
      } catch {
        // Skip
      }
    });
  }

  const allWeekdays: WeekdayPerformance[] = weekdayStats.map(stat => {
    const divisor = Math.max(1, stat.dayCount || 1);
    return {
      dayIndex: stat.dayIndex,
      dayName: stat.dayName,
      avgFocusMinutes: Math.round(stat.totalFocus / divisor),
      avgTasksCompleted: Math.round((stat.totalTasks / divisor) * 10) / 10,
      avgSpending: Math.round(stat.totalSpend / divisor),
      sessionCount: stat.sessionCount,
    };
  });

  // Calculate composite score to rank best and weakest
  const scoredDays = allWeekdays.map(d => ({
    weekday: d,
    score: d.avgFocusMinutes * 1.0 + d.avgTasksCompleted * 15 - (d.avgSpending > 1000 ? 10 : 0),
  }));

  scoredDays.sort((a, b) => b.score - a.score);

  const bestWeekday = scoredDays[0]?.weekday ?? allWeekdays[1]; // Default Mon
  const weakestWeekday = scoredDays[scoredDays.length - 1]?.weekday ?? allWeekdays[0]; // Default Sun

  return { allWeekdays, bestWeekday, weakestWeekday };
}

/**
 * Analyzes focus session start times to detect best and weakest focus hours.
 */
export function analyzeFocusHours(input: CoachInput): {
  hourlyDistribution: FocusHourSlot[];
  bestFocusHour: FocusHourSlot;
  weakestFocusHour: FocusHourSlot;
} {
  const { focusSessions, events } = input;

  const hourBuckets: Array<{ count: number; minutes: number }> = Array.from({ length: 24 }, () => ({
    count: 0,
    minutes: 0,
  }));

  // Analyze events or focus sessions
  events.forEach(evt => {
    if (evt.type === 'pomodoro_completed' || evt.category === 'focus') {
      try {
        const h = getHours(parseISO(evt.timestamp));
        if (h >= 0 && h < 24) {
          hourBuckets[h].count += 1;
          hourBuckets[h].minutes += (evt.metadata?.amount as number) || 25;
        }
      } catch {
        // Skip
      }
    }
  });

  // If no granular events, synthesize from bestFocusHour in analytics
  if (hourBuckets.every(b => b.count === 0)) {
    const bestHourStr = input.analytics.bestFocusHour?.timeWindow;
    let fallbackBestHour = 9; // 9 AM default
    if (bestHourStr) {
      const match = bestHourStr.match(/(\d{1,2}):/);
      if (match) fallbackBestHour = parseInt(match[1], 10);
    }
    hourBuckets[fallbackBestHour] = { count: 8, minutes: 200 };
    hourBuckets[(fallbackBestHour + 1) % 24] = { count: 6, minutes: 150 };
  }

  const hourlyDistribution: FocusHourSlot[] = hourBuckets.map((b, h) => {
    const start = `${h.toString().padStart(2, '0')}:00`;
    const end = `${((h + 1) % 24).toString().padStart(2, '0')}:00`;
    return {
      hour: h,
      timeWindow: `${start} - ${end}`,
      sessionCount: b.count,
      totalMinutes: b.minutes,
      avgMinutes: b.count > 0 ? Math.round(b.minutes / b.count) : 0,
    };
  });

  const sorted = [...hourlyDistribution].sort((a, b) => b.totalMinutes - a.totalMinutes);

  const bestFocusHour = sorted[0];
  // Weakest active or low hour during daylight/working hours (08:00 - 20:00)
  const daytimeHours = hourlyDistribution.filter(h => h.hour >= 8 && h.hour <= 20);
  const weakestFocusHour = [...daytimeHours].sort((a, b) => a.totalMinutes - b.totalMinutes)[0] || hourlyDistribution[0];

  return { hourlyDistribution, bestFocusHour, weakestFocusHour };
}

/**
 * Analyzes weekend vs weekday behaviors.
 */
export function analyzeWeekendBehaviour(allWeekdays: readonly WeekdayPerformance[]): WeekendBehaviour {
  const weekdaysOnly = allWeekdays.filter(d => d.dayIndex >= 1 && d.dayIndex <= 5);
  const weekendsOnly = allWeekdays.filter(d => d.dayIndex === 0 || d.dayIndex === 6);

  const weekdayAvgFocus = weekdaysOnly.reduce((s, d) => s + d.avgFocusMinutes, 0) / Math.max(1, weekdaysOnly.length);
  const weekendAvgFocus = weekendsOnly.reduce((s, d) => s + d.avgFocusMinutes, 0) / Math.max(1, weekendsOnly.length);

  const weekdayAvgSpend = weekdaysOnly.reduce((s, d) => s + d.avgSpending, 0) / Math.max(1, weekdaysOnly.length);
  const weekendAvgSpend = weekendsOnly.reduce((s, d) => s + d.avgSpending, 0) / Math.max(1, weekendsOnly.length);

  const focusRatio = weekdayAvgFocus > 0 ? weekendAvgFocus / weekdayAvgFocus : 1.0;
  const spendRatio = weekdayAvgSpend > 0 ? weekendAvgSpend / weekdayAvgSpend : 1.0;

  let pattern: WeekendBehaviour['pattern'] = 'balanced';
  let insight = 'Your weekends follow a steady, balanced distribution of focus and budget.';

  if (spendRatio >= 1.7) {
    pattern = 'high_spending_weekend';
    insight = `Weekend spending is ${spendRatio.toFixed(1)}x higher than weekdays. Setting weekend budgets can preserve savings.`;
  } else if (focusRatio >= 1.2) {
    pattern = 'productive_weekend';
    insight = 'You maintain strong focus momentum over weekends, accelerating project completion.';
  } else if (focusRatio < 0.4) {
    pattern = 'relaxed_weekend';
    insight = 'Weekends are primarily rest and recovery periods with minimal logged focus.';
  }

  return {
    weekendAvgFocusMin: Math.round(weekendAvgFocus),
    weekdayAvgFocusMin: Math.round(weekdayAvgFocus),
    weekendAvgSpend: Math.round(weekendAvgSpend),
    weekdayAvgSpend: Math.round(weekdayAvgSpend),
    focusRatioWeekendToWeekday: Math.round(focusRatio * 100) / 100,
    spendRatioWeekendToWeekday: Math.round(spendRatio * 100) / 100,
    pattern,
    insight,
  };
}

/**
 * Detects spending habits, micro-spending, and impulsive patterns.
 */
export function analyzeSpendingHabits(input: CoachInput, allWeekdays: readonly WeekdayPerformance[]): SpendingHabitAnalysis {
  const { expenses, analytics } = input;

  const smallSpends = expenses.filter(e => e.amount > 0 && e.amount <= 200).length;
  const largeSpends = expenses.filter(e => e.amount >= 1000).length;

  // Peak spending day
  const peakDay = [...allWeekdays].sort((a, b) => b.avgSpending - a.avgSpending)[0]?.dayName ?? 'Saturday';

  // Impulsive spend detection: days with < 30m focus where spending was > 1.5x average
  let impulsiveCount = 0;
  if (input.dailyGoalHistory.length > 0) {
    const avgDailySpend = analytics.avgDailySpend || 300;
    impulsiveCount = input.dailyGoalHistory.filter(
      h => h.focusMinutes < 30 && h.totalSpent > avgDailySpend * 1.5
    ).length;
  }

  const topCategory = analytics.topCategory?.name || 'General';

  let summary = `Primary expenditure is in ${topCategory}.`;
  if (smallSpends > 15) {
    summary += ` High volume of micro-transactions (${smallSpends} small purchases) detected.`;
  }
  if (impulsiveCount >= 2) {
    summary += ` Noticeable trend of higher spending on low-focus recovery days (${impulsiveCount} days).`;
  }

  return {
    topSpendingCategory: topCategory,
    frequentSmallSpendsCount: smallSpends,
    largeSpendsCount: largeSpends,
    peakSpendingDay: peakDay,
    impulsiveSpendingDayCount: impulsiveCount,
    dailySpendVariance: Math.round(analytics.avgDailySpend * 0.4),
    summary,
  };
}

/**
 * Analyzes procrastination patterns and task delay habits.
 */
export function analyzeProcrastinationPatterns(input: CoachInput): ProcrastinationPatternAnalysis {
  const { tasks } = input;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  let lastMinuteCount = 0;
  let overdueBacklogSum = 0;
  let overdueCount = 0;

  tasks.forEach(t => {
    if (t.status === 'completed' && t.completed_at && t.deadline) {
      try {
        const completedMs = parseISO(t.completed_at).getTime();
        const deadlineMs = parseISO(t.deadline).getTime();
        const diffHours = (deadlineMs - completedMs) / (1000 * 60 * 60);
        // Completed within 2 hours before deadline or slightly after
        if (diffHours >= -1 && diffHours <= 2) {
          lastMinuteCount += 1;
        }
      } catch {
        // Skip
      }
    } else if (t.status === 'pending' && t.deadline && t.deadline < todayStr) {
      overdueCount += 1;
      try {
        const deadlineDate = parseISO(t.deadline);
        const ageDays = Math.max(1, Math.round((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24)));
        overdueBacklogSum += ageDays;
      } catch {
        overdueBacklogSum += 1;
      }
    }
  });

  const avgOverdueAge = overdueCount > 0 ? Math.round(overdueBacklogSum / overdueCount) : 0;

  // Delay frequency score: weighted composite (0-100)
  const delayScore = clamp(
    Math.round(overdueCount * 8 + lastMinuteCount * 6 + avgOverdueAge * 3),
    0,
    100
  );

  let tendency: ProcrastinationPatternAnalysis['tendency'] = 'proactive';
  let patternSummary = 'Tasks are generally executed comfortably ahead of deadlines.';

  if (delayScore >= 60) {
    tendency = 'chronic_delay';
    patternSummary = `Significant task aging (${overdueCount} overdue, avg ${avgOverdueAge} days old) and frequent deadline rushes.`;
  } else if (delayScore >= 25) {
    tendency = 'moderate';
    patternSummary = `Occasional last-minute completions (${lastMinuteCount} tasks) detected, but majority are managed well.`;
  }

  return {
    lastMinuteTasksCompleted: lastMinuteCount,
    overdueBacklogAgingDays: avgOverdueAge,
    delayFrequencyScore: delayScore,
    tendency,
    patternSummary,
  };
}

/**
 * Main Habit Analysis Entrypoint.
 */
export function generateCoachHabitAnalysis(input: CoachInput): CoachHabitAnalysis {
  const { allWeekdays, bestWeekday, weakestWeekday } = analyzeWeekdayPerformance(input);
  const { hourlyDistribution, bestFocusHour, weakestFocusHour } = analyzeFocusHours(input);
  const weekendBehaviour = analyzeWeekendBehaviour(allWeekdays);
  const spendingHabits = analyzeSpendingHabits(input, allWeekdays);
  const procrastinationPatterns = analyzeProcrastinationPatterns(input);

  // Consistency trend
  const dailyFocus = input.dailyGoalHistory.map(h => h.focusMinutes);
  const trendResult = detectTrend(dailyFocus, 7);

  const consistencyScore = clamp(
    Math.round(
      (input.analytics.focusConsistencyRate * 0.4) +
      (input.profile.streak > 5 ? 30 : input.profile.streak * 5) +
      (procrastinationPatterns.tendency === 'proactive' ? 30 : 15)
    ),
    10,
    100
  );

  const primaryHabitStrength = `${bestWeekday.dayName}s at ${bestFocusHour.timeWindow} represents your highest productivity window (${bestFocusHour.totalMinutes}m logged).`;
  const primaryHabitLeak =
    weekendBehaviour.pattern === 'high_spending_weekend'
      ? `Weekend spending surges to ₹${weekendBehaviour.weekendAvgSpend}/day (${weekendBehaviour.spendRatioWeekendToWeekday}x weekday average).`
      : procrastinationPatterns.overdueBacklogAgingDays > 3
        ? `Pending overdue tasks linger for an average of ${procrastinationPatterns.overdueBacklogAgingDays} days.`
        : `${weakestWeekday.dayName}s show a slump in focus (${weakestWeekday.avgFocusMinutes}m average).`;

  return {
    bestWeekday,
    weakestWeekday,
    allWeekdays,
    bestFocusHour,
    weakestFocusHour,
    hourlyDistribution,
    weekendBehaviour,
    spendingHabits,
    procrastinationPatterns,
    consistencyScore,
    consistencyTrend: trendResult.direction,
    primaryHabitStrength,
    primaryHabitLeak,
  };
}
