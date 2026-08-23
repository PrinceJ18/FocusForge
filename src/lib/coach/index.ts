/**
 * Coach Engine — Public API
 *
 * Barrel re-export for the FocusForge AI Coach module.
 * Import everything from 'lib/coach' — this is the single entry point.
 *
 * @example
 * ```ts
 * import { createCoachEngine, type CoachInput, type CoachPredictions } from '../lib/coach';
 * ```
 *
 * @module coach
 */

// Engine factory (main entry point)
export { createCoachEngine } from './coachEngine';
export type { CoachEngine } from './coachEngine';

// Types
export type {
  CoachPriority,
  CoachCategory,
  TrendDirection,
  CoachRecommendation,
  CoachRiskItem,
  CoachTrendItem,
  CoachPredictions,
  DailyBrief,
  EveningReview,
  WeeklyReview,
  MonthlyReview,
  AchievementsSummary,
  CoachInput,
  CoachOutput,
  CoachRule,
} from './coachTypes';

// Rules (for testing / advanced consumers)
export { COACH_RULES, evaluateAllRules } from './coachRules';

// Utilities (for testing / advanced consumers)
export {
  clamp,
  safePercent,
  detectTrend,
  weightedMovingAverage,
  linearExtrapolate,
  predictMonthlyValue,
  calculateStreakRisk,
  gradeFromScore,
  gradeColor,
  getPredictionConfidence,
  countOverdueTasks,
  extractDailyFocusFromHistory,
  extractDailySpendingFromHistory,
  extractDailyTasksFromHistory,
  extractDailyProgressFromHistory,
} from './coachUtils';
