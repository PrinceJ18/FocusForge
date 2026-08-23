/**
 * Coach Engine — Utility Functions
 *
 * Pure helper functions used by the coach rules and engine.
 * Every function is stateless, side-effect-free, and deterministic.
 *
 * Dependencies:
 * - date-fns: date calculations
 * - coachTypes: type references only
 *
 * Future consumers:
 * - coachRules.ts (trend detection, streak risk)
 * - coachEngine.ts (predictions, grade mapping)
 *
 * @module coach/coachUtils
 */

import { format, getDaysInMonth as dateFnsGetDaysInMonth, getDate } from 'date-fns';
import type { TrendDirection } from './coachTypes';
import type { DailyGoalHistory } from '../../store/useDailyGoalsStore';

// ═══════════════════════════════════════════════════════════════
// Numeric Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Clamps a numeric value between min and max bounds.
 *
 * @param value - The value to clamp
 * @param min - Lower bound (inclusive)
 * @param max - Upper bound (inclusive)
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Division-safe percentage calculation.
 * Returns 0 if the denominator is zero or if the result is NaN.
 *
 * @param numerator - Dividend
 * @param denominator - Divisor
 * @param decimalPlaces - Number of decimal places to round to (default: 0)
 * @returns Percentage value (0–100), clamped
 */
export function safePercent(numerator: number, denominator: number, decimalPlaces = 0): number {
  if (denominator <= 0 || isNaN(numerator) || isNaN(denominator)) return 0;
  const raw = (numerator / denominator) * 100;
  if (isNaN(raw)) return 0;
  const factor = Math.pow(10, decimalPlaces);
  return clamp(Math.round(raw * factor) / factor, 0, 100);
}

// ═══════════════════════════════════════════════════════════════
// Date Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the 1-indexed day of the current month.
 * Wrapper around date-fns for consistent usage within the coach module.
 */
export function getCurrentDayOfMonth(now?: Date): number {
  return getDate(now ?? new Date());
}

/**
 * Returns the total number of days in the current month.
 * Wrapper around date-fns for consistent usage within the coach module.
 */
export function getCurrentMonthDays(now?: Date): number {
  return dateFnsGetDaysInMonth(now ?? new Date());
}

/**
 * Returns the current year-month string in 'yyyy-MM' format.
 */
export function getCurrentYearMonth(now?: Date): string {
  return format(now ?? new Date(), 'yyyy-MM');
}

/**
 * Returns today's date string in 'yyyy-MM-dd' format.
 */
export function getTodayDateString(now?: Date): string {
  return format(now ?? new Date(), 'yyyy-MM-dd');
}

// ═══════════════════════════════════════════════════════════════
// Trend Detection
// ═══════════════════════════════════════════════════════════════

/**
 * Classifies a data series as improving, declining, or stable.
 *
 * Compares the average of the recent window (last `recentDays` entries)
 * against the average of the preceding window (entries before that).
 * A change of ±10% is required to classify as improving/declining;
 * anything within ±10% is considered stable.
 *
 * @param values - Array of numeric values ordered chronologically (oldest first)
 * @param recentDays - Size of the recent window to compare (default: 7)
 * @returns Trend direction and magnitude percentage
 */
export function detectTrend(
  values: readonly number[],
  recentDays = 7
): { direction: TrendDirection; magnitudePct: number } {
  if (values.length < recentDays * 2) {
    return { direction: 'stable', magnitudePct: 0 };
  }

  const recentSlice = values.slice(-recentDays);
  const previousSlice = values.slice(-recentDays * 2, -recentDays);

  const recentAvg = recentSlice.reduce((s, v) => s + v, 0) / recentSlice.length;
  const previousAvg = previousSlice.reduce((s, v) => s + v, 0) / previousSlice.length;

  if (previousAvg === 0) {
    return recentAvg > 0
      ? { direction: 'improving', magnitudePct: 100 }
      : { direction: 'stable', magnitudePct: 0 };
  }

  const changePct = ((recentAvg - previousAvg) / previousAvg) * 100;
  const magnitude = Math.abs(Math.round(changePct));

  if (changePct > 10) return { direction: 'improving', magnitudePct: magnitude };
  if (changePct < -10) return { direction: 'declining', magnitudePct: magnitude };
  return { direction: 'stable', magnitudePct: magnitude };
}

// ═══════════════════════════════════════════════════════════════
// Prediction Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Computes a weighted moving average over a numeric series.
 * More recent values receive higher weights using a linear weighting scheme.
 *
 * @param values - Array of numeric values ordered chronologically (oldest first)
 * @param windowSize - Number of values to include in the average (default: 7)
 * @returns Weighted average, or 0 if no values
 */
export function weightedMovingAverage(values: readonly number[], windowSize = 7): number {
  if (values.length === 0) return 0;

  const window = values.slice(-windowSize);
  const n = window.length;

  // Linear weights: 1, 2, 3, ..., n (most recent gets highest weight)
  const weightSum = (n * (n + 1)) / 2;
  const weightedSum = window.reduce((sum, val, i) => sum + val * (i + 1), 0);

  const result = weightedSum / weightSum;
  return isNaN(result) ? 0 : result;
}

/**
 * Projects a value to the end of the current month using linear extrapolation.
 * Uses the daily rate derived from partial-month data.
 *
 * @param currentTotal - Total accumulated so far this month
 * @param dayOfMonth - Current day of month (1-indexed)
 * @param totalDaysInMonth - Total days in the current month
 * @returns Projected month-end value
 */
export function linearExtrapolate(
  currentTotal: number,
  dayOfMonth: number,
  totalDaysInMonth: number
): number {
  if (dayOfMonth <= 0 || totalDaysInMonth <= 0) return currentTotal;
  const dailyRate = currentTotal / dayOfMonth;
  return Math.round(dailyRate * totalDaysInMonth);
}

/**
 * Projects a month-end value from daily snapshot history using
 * weighted moving average for the daily rate.
 *
 * This produces more accurate predictions than simple linear extrapolation
 * because it accounts for recent behavioral changes.
 *
 * @param dailyValues - Daily values ordered chronologically (oldest first)
 * @param dayOfMonth - Current day of month
 * @param totalDaysInMonth - Total days in the current month
 * @param windowSize - WMA window size (default: 7)
 * @returns Projected month-end value, clamped to non-negative
 */
export function predictMonthlyValue(
  dailyValues: readonly number[],
  dayOfMonth: number,
  totalDaysInMonth: number,
  windowSize = 7
): number {
  if (dailyValues.length === 0 || totalDaysInMonth <= 0) return 0;

  const dailyRate = weightedMovingAverage(dailyValues, windowSize);
  const remainingDays = Math.max(0, totalDaysInMonth - dayOfMonth);
  const currentTotal = dailyValues.reduce((s, v) => s + v, 0);
  const projected = currentTotal + dailyRate * remainingDays;

  return Math.max(0, Math.round(projected));
}

// ═══════════════════════════════════════════════════════════════
// Streak Risk Detection
// ═══════════════════════════════════════════════════════════════

/**
 * Determines if the user's streak is at risk of breaking.
 *
 * A streak is considered at risk if:
 * 1. The user has an active streak (> 0 days)
 * 2. No focus sessions or completed tasks have been recorded today
 *
 * @param currentStreak - Current consecutive-day streak
 * @param todayFocusMinutes - Focus minutes logged today
 * @param todayCompletedTasks - Tasks completed today
 * @returns Whether the streak is at risk
 */
export function calculateStreakRisk(
  currentStreak: number,
  todayFocusMinutes: number,
  todayCompletedTasks: number
): boolean {
  if (currentStreak <= 0) return false;
  return todayFocusMinutes === 0 && todayCompletedTasks === 0;
}

// ═══════════════════════════════════════════════════════════════
// Grade Mapping
// ═══════════════════════════════════════════════════════════════

/**
 * Maps a numeric score (0–100) to a letter grade.
 * Reuses the same thresholds as the existing reports engine for consistency.
 *
 * @param score - Numeric score (0–100)
 * @returns Letter grade string
 */
export function gradeFromScore(score: number): string {
  const clamped = clamp(score, 0, 100);
  if (clamped >= 95) return 'A+';
  if (clamped >= 85) return 'A';
  if (clamped >= 70) return 'B';
  if (clamped >= 50) return 'C';
  return 'F';
}

/**
 * Returns a hex color for a given letter grade.
 * Consistent with the existing report grade color scheme.
 *
 * @param grade - Letter grade (A+, A, B, C, F)
 * @returns Hex color string
 */
export function gradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'A') return '#10b981';
  if (grade === 'B') return '#06b6d4';
  if (grade === 'C') return '#f59e0b';
  return '#ef4444';
}

// ═══════════════════════════════════════════════════════════════
// Data Extraction Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Extracts daily focus minutes from DailyGoalHistory entries,
 * ordered chronologically (oldest first).
 *
 * @param history - Array of daily goal history entries
 * @returns Array of daily focus minute values
 */
export function extractDailyFocusFromHistory(history: readonly DailyGoalHistory[]): number[] {
  return [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => h.focusMinutes);
}

/**
 * Extracts daily spending from DailyGoalHistory entries,
 * ordered chronologically (oldest first).
 *
 * @param history - Array of daily goal history entries
 * @returns Array of daily spending values
 */
export function extractDailySpendingFromHistory(history: readonly DailyGoalHistory[]): number[] {
  return [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => h.totalSpent);
}

/**
 * Extracts daily task completion counts from DailyGoalHistory entries,
 * ordered chronologically (oldest first).
 *
 * @param history - Array of daily goal history entries
 * @returns Array of daily completed task counts
 */
export function extractDailyTasksFromHistory(history: readonly DailyGoalHistory[]): number[] {
  return [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => h.tasksCompleted);
}

/**
 * Extracts daily completion percentages from DailyGoalHistory entries,
 * ordered chronologically (oldest first).
 *
 * @param history - Array of daily goal history entries
 * @returns Array of daily completion percentage values (0–100)
 */
export function extractDailyProgressFromHistory(history: readonly DailyGoalHistory[]): number[] {
  return [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => h.completionPct);
}

/**
 * Determines prediction confidence based on available data points.
 *
 * - high: 30+ days of history
 * - medium: 14–29 days
 * - low: less than 14 days
 *
 * @param dataPoints - Number of available daily history entries
 * @returns Confidence level
 */
export function getPredictionConfidence(dataPoints: number): 'high' | 'medium' | 'low' {
  if (dataPoints >= 30) return 'high';
  if (dataPoints >= 14) return 'medium';
  return 'low';
}

/**
 * Counts overdue tasks — tasks that are pending and past their deadline.
 *
 * @param tasks - Array of tasks
 * @param todayStr - Today's date string in 'yyyy-MM-dd' format
 * @returns Count of overdue tasks
 */
export function countOverdueTasks(
  tasks: readonly { status: string; deadline: string | null }[],
  todayStr: string
): number {
  return tasks.filter(t =>
    t.status === 'pending' &&
    t.deadline !== null &&
    t.deadline < todayStr
  ).length;
}
