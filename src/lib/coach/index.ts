/**
 * Coach Engine — Public API
 *
 * Barrel re-export for the FocusForge AI Coach module.
 * Import everything from 'lib/coach' — this is the single entry point.
 *
 * @example
 * ```ts
 * import {
 *   createCoachEngine,
 *   type CoachInput,
 *   type CoachHabitAnalysis,
 *   type CoachBehaviourTrends,
 *   type CoachEarlyRiskReport,
 *   type CoachTimelineEvent,
 * } from '../lib/coach';
 * ```
 *
 * @module coach
 */

// Engine factory (main entry point)
export { createCoachEngine } from './coachEngine';
export type { CoachEngine } from './coachEngine';

// Context builder (wires stores to engine)
export { buildCoachContext } from './coachContext';
export type { CoachRawData, BuildCoachContextOptions } from './coachContext';

// Habit Detection Layer (Phase 3.9.5 Task 1)
export {
  generateCoachHabitAnalysis,
  analyzeWeekdayPerformance,
  analyzeFocusHours,
  analyzeWeekendBehaviour,
  analyzeSpendingHabits,
  analyzeProcrastinationPatterns,
} from './coachHabits';

// Behaviour Trend Analysis (Phase 3.9.5 Task 2)
export { generateCoachBehaviourTrends } from './coachTrends';

// Early Risk Detection (Phase 3.9.5 Task 3)
export {
  generateCoachEarlyRiskReport,
  evaluateStreakLossRisk,
  evaluateBudgetExhaustionRisk,
  evaluateBurnoutRisk,
  evaluateOverdueTaskRisk,
  evaluateSavingsGoalRisk,
} from './coachRisks';

// Coach Timeline (Phase 3.9.5 Task 7)
export { generateCoachTimeline } from './coachTimeline';

// Rules & Ranking (Phase 3.9.5 Task 5 & 6)
export { COACH_RULES, evaluateAllRules } from './coachRules';

// Utilities & Prediction Math (Phase 3.9.5 Task 4)
export {
  clamp,
  safePercent,
  detectTrend,
  weightedMovingAverage,
  exponentialMovingAverage,
  decayWeightedMovingAverage,
  calculateSpendingVelocity,
  calculateFocusMomentum,
  linearExtrapolate,
  predictMonthlyValue,
  enhancedPredictMonthlyValue,
  calculateStreakRisk,
  gradeFromScore,
  gradeColor,
  getPredictionConfidence,
  countOverdueTasks,
  computeRecommendationRankingScore,
  rankRecommendations,
  extractDailyFocusFromHistory,
  extractDailySpendingFromHistory,
  extractDailyTasksFromHistory,
  extractDailyProgressFromHistory,
} from './coachUtils';

// Types
export type {
  CoachPriority,
  CoachCategory,
  TrendDirection,
  VelocityDirection,
  CoachExplainability,
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
  WeekdayPerformance,
  FocusHourSlot,
  WeekendBehaviour,
  SpendingHabitAnalysis,
  ProcrastinationPatternAnalysis,
  CoachHabitAnalysis,
  CoachBehaviourTrends,
  StreakLossRisk,
  BudgetExhaustionRisk,
  BurnoutRisk,
  OverdueTaskRisk,
  SavingsGoalRisk,
  CoachEarlyRiskReport,
  CoachTimelineEvent,
} from './coachTypes';
