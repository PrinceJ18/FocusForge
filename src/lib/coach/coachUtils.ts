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
 * - coachHabits.ts (habit discovery calculations)
 * - coachRisks.ts (early risk modeling)
 *
 * @module coach/coachUtils
 */

import { format, getDaysInMonth as dateFnsGetDaysInMonth, getDate } from 'date-fns';
import type {
  TrendDirection,
  VelocityDirection,
  CoachRecommendation,
  CoachPriority,
} from './coachTypes';
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
): { direction: TrendDirection; magnitudePct: number; baselineValue: number; currentValue: number } {
  if (values.length < recentDays * 2) {
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return { direction: 'stable', magnitudePct: 0, baselineValue: avg, currentValue: avg };
  }

  const recentSlice = values.slice(-recentDays);
  const previousSlice = values.slice(-recentDays * 2, -recentDays);

  const recentAvg = recentSlice.reduce((s, v) => s + v, 0) / recentSlice.length;
  const previousAvg = previousSlice.reduce((s, v) => s + v, 0) / previousSlice.length;

  if (previousAvg === 0) {
    return recentAvg > 0
      ? { direction: 'improving', magnitudePct: 100, baselineValue: 0, currentValue: recentAvg }
      : { direction: 'stable', magnitudePct: 0, baselineValue: 0, currentValue: 0 };
  }

  const changePct = ((recentAvg - previousAvg) / previousAvg) * 100;
  const magnitude = Math.abs(Math.round(changePct));

  if (changePct > 10) return { direction: 'improving', magnitudePct: magnitude, baselineValue: previousAvg, currentValue: recentAvg };
  if (changePct < -10) return { direction: 'declining', magnitudePct: magnitude, baselineValue: previousAvg, currentValue: recentAvg };
  return { direction: 'stable', magnitudePct: magnitude, baselineValue: previousAvg, currentValue: recentAvg };
}

// ═══════════════════════════════════════════════════════════════
// Prediction & Weighting Helpers (Enhanced in Phase 3.9.5)
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
 * Computes an Exponentially Weighted Moving Average (EWMA).
 *
 * @param values - Chronological numeric series (oldest first)
 * @param alpha - Smoothing factor between 0 and 1 (default 0.35)
 */
export function exponentialMovingAverage(values: readonly number[], alpha = 0.35): number {
  if (values.length === 0) return 0;
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return isNaN(ema) ? 0 : ema;
}

/**
 * Computes a time-decay weighted moving average where recent days receive
 * geometrically higher influence.
 *
 * @param values - Chronological values
 * @param decayFactor - Daily decay multiplier (e.g. 0.90)
 */
export function decayWeightedMovingAverage(values: readonly number[], decayFactor = 0.9): number {
  if (values.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  const n = values.length;

  for (let i = 0; i < n; i++) {
    const daysAgo = n - 1 - i;
    const weight = Math.pow(decayFactor, daysAgo);
    weightedSum += values[i] * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculates spending velocity and acceleration.
 * Determines whether spending burn rate is speeding up, stable, or slowing down.
 */
export function calculateSpendingVelocity(dailyExpenses: readonly number[]): {
  velocity: VelocityDirection;
  factor: number;
  acceleration: number;
  recentDailyRate: number;
  priorDailyRate: number;
} {
  if (dailyExpenses.length < 6) {
    const avg = dailyExpenses.length > 0 ? dailyExpenses.reduce((s, v) => s + v, 0) / dailyExpenses.length : 0;
    return {
      velocity: 'stable',
      factor: 1.0,
      acceleration: 0,
      recentDailyRate: avg,
      priorDailyRate: avg,
    };
  }

  const recentWindow = dailyExpenses.slice(-3);
  const priorWindow = dailyExpenses.slice(-6, -3);

  const recentAvg = recentWindow.reduce((s, v) => s + v, 0) / recentWindow.length;
  const priorAvg = priorWindow.reduce((s, v) => s + v, 0) / priorWindow.length;

  const diff = recentAvg - priorAvg;
  const factor = priorAvg > 0 ? recentAvg / priorAvg : recentAvg > 0 ? 1.5 : 1.0;

  let velocity: VelocityDirection = 'stable';
  if (factor > 1.15 && diff > 50) {
    velocity = 'accelerating';
  } else if (factor < 0.85 && diff < -50) {
    velocity = 'decelerating';
  }

  return {
    velocity,
    factor: clamp(factor, 0.5, 2.5),
    acceleration: diff,
    recentDailyRate: recentAvg,
    priorDailyRate: priorAvg,
  };
}

/**
 * Calculates focus momentum based on streak, consistency, and recent growth vector.
 */
export function calculateFocusMomentum(
  dailyFocus: readonly number[],
  streak: number
): { momentumFactor: number; direction: TrendDirection } {
  if (dailyFocus.length < 4) {
    return { momentumFactor: 1.0, direction: 'stable' };
  }

  const ewma = exponentialMovingAverage(dailyFocus, 0.4);
  const baseline = dailyFocus.reduce((s, v) => s + v, 0) / dailyFocus.length;

  let momentum = baseline > 0 ? ewma / baseline : 1.0;

  // Streak bonus (+2% per active streak day up to +20%)
  const streakBonus = Math.min(0.2, streak * 0.02);
  momentum += streakBonus;

  momentum = clamp(momentum, 0.6, 1.5);

  let direction: TrendDirection = 'stable';
  if (momentum > 1.1) direction = 'improving';
  else if (momentum < 0.9) direction = 'declining';

  return { momentumFactor: momentum, direction };
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
 * Enhanced month-end projection combining EWMA, decay weights, and velocity/momentum.
 *
 * @param dailyValues - Chronological daily values
 * @param dayOfMonth - Current day in month
 * @param totalDaysInMonth - Total days in month
 * @param modifierFactor - Velocity/Momentum adjustment multiplier (e.g. 1.1)
 */
export function enhancedPredictMonthlyValue(
  dailyValues: readonly number[],
  dayOfMonth: number,
  totalDaysInMonth: number,
  modifierFactor = 1.0
): number {
  if (dailyValues.length === 0 || totalDaysInMonth <= 0) return 0;

  const wmaRate = weightedMovingAverage(dailyValues, 7);
  const ewmaRate = exponentialMovingAverage(dailyValues, 0.35);
  const decayRate = decayWeightedMovingAverage(dailyValues, 0.88);

  // Blended daily rate: 40% EWMA + 35% Decay + 25% WMA
  const blendedDailyRate = (ewmaRate * 0.4 + decayRate * 0.35 + wmaRate * 0.25) * modifierFactor;

  const remainingDays = Math.max(0, totalDaysInMonth - dayOfMonth);
  const currentTotal = dailyValues.reduce((s, v) => s + v, 0);
  const projected = currentTotal + blendedDailyRate * remainingDays;

  return Math.max(0, Math.round(projected));
}

/**
 * Legacy wrapper for backward compatibility.
 */
export function predictMonthlyValue(
  dailyValues: readonly number[],
  dayOfMonth: number,
  totalDaysInMonth: number,
  windowSize = 7
): number {
  return enhancedPredictMonthlyValue(dailyValues, dayOfMonth, totalDaysInMonth, 1.0);
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
// Recommendation Ranking & Scoring (Phase 3.9.5 Task 5)
// ═══════════════════════════════════════════════════════════════

const PRIORITY_BASE_SCORE: Record<CoachPriority, number> = {
  critical: 100,
  high: 80,
  medium: 55,
  low: 35,
  info: 20,
};

const IMPACT_MULTIPLIER = { high: 1.0, medium: 0.7, low: 0.4 };
const URGENCY_MULTIPLIER = { high: 1.0, medium: 0.65, low: 0.35 };
const EFFORT_PENALTY = { high: 10, medium: 5, low: 0 };
const CONFIDENCE_MULTIPLIER = { high: 1.0, medium: 0.85, low: 0.65 };

/**
 * Calculates a composite ranking score for a recommendation (0 - 100).
 *
 * Formula:
 * RankScore = (BasePriority * 0.35 + Impact * 0.30 + Urgency * 0.25) * Confidence - EffortPenalty
 */
export function computeRecommendationRankingScore(rec: Partial<CoachRecommendation>): number {
  const base = PRIORITY_BASE_SCORE[rec.priority || 'medium'];
  const impactScore = 100 * (IMPACT_MULTIPLIER[rec.impact || 'medium'] ?? 0.7);
  const urgencyScore = 100 * (URGENCY_MULTIPLIER[rec.urgency || 'medium'] ?? 0.65);
  const confMult = CONFIDENCE_MULTIPLIER[rec.confidence || 'medium'] ?? 0.85;
  const effortPen = EFFORT_PENALTY[rec.estimatedEffort || 'medium'] ?? 5;

  const rawScore = (base * 0.35 + impactScore * 0.30 + urgencyScore * 0.25) * confMult - effortPen;
  return clamp(Math.round(rawScore), 1, 100);
}

/**
 * Deterministically ranks and sorts a list of recommendations by rankingScore descending.
 */
export function rankRecommendations(recommendations: CoachRecommendation[]): CoachRecommendation[] {
  return [...recommendations].sort((a, b) => {
    const scoreA = a.rankingScore ?? computeRecommendationRankingScore(a);
    const scoreB = b.rankingScore ?? computeRecommendationRankingScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });
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
