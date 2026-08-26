/**
 * Coach Engine — Public API (Phase 3.9.7 Quality & QA Enhanced)
 *
 * Barrel re-export for the FocusForge AI Coach module.
 * Import everything from 'lib/coach' — this is the single entry point.
 *
 * @module coach
 */

// Engine factory (main entry point)
export { createCoachEngine } from './coachEngine';
export type { CoachEngine } from './coachEngine';

// Context builder (wires stores to engine)
export { buildCoachContext } from './coachContext';
export type { CoachRawData, BuildCoachContextOptions } from './coachContext';

// Infrastructure & Repository (Phase 3.9.6)
export { coachRepository, createCoachRepository } from './coachRepository';
export type { CoachRepositoryInstance } from './coachRepository';

export { coachHistory, createCoachHistory } from './coachHistory';
export type { CoachHistorySnapshot, CoachHistoryInstance } from './coachHistory';

export { coachCache, createCoachCache } from './coachCache';
export type { CacheEntry, CacheStats, CoachCacheInstance } from './coachCache';

export { coachScheduler, createCoachScheduler, generateContextHash } from './coachScheduler';
export type { CoachSchedulerInstance } from './coachScheduler';

export {
  serializeCoachOutput,
  deserializeCoachOutput,
  exportCompactState,
  restoreCompactState,
  deepCloneImmutable,
} from './coachSerializer';
export type { CompactCoachExport } from './coachSerializer';

export { coachMetrics, createCoachMetrics } from './coachMetrics';
export type { CoachInternalMetrics, CoachMetricsTracker } from './coachMetrics';

export { coachProfiler, createCoachProfiler } from './coachProfiler';
export type { MethodProfileStat, CoachProfilerInstance } from './coachProfiler';

export {
  validateRecommendation,
  validatePredictions,
  validateHabits,
  validateTrends,
  validateRisks,
  validateTimelineEvent,
  validateCoachOutput,
} from './coachValidator';
export type { ValidationResult, ValidationReport } from './coachValidator';

export {
  COACH_INFRASTRUCTURE,
  PRIORITY_BASE_SCORES,
  PRIORITY_SORT_ORDER,
  RANKING_WEIGHTS,
  PREDICTION_COEFFICIENTS,
  RISK_THRESHOLDS,
  RULE_THRESHOLDS,
  GRADE_THRESHOLDS,
  GRADE_COLORS,
  CATEGORY_EMOJIS,
} from './coachConstants';

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

// QA & Testing Suite (Phase 3.9.7)
export {
  ALL_COACH_TEST_CASES,
  NEW_USER_SCENARIO,
  HEAVY_PRODUCTIVITY_SCENARIO,
  HEAVY_SPENDING_SCENARIO,
  EXCELLENT_HABITS_SCENARIO,
  POOR_HABITS_SCENARIO,
  BUDGET_EXHAUSTED_SCENARIO,
  BURNOUT_SCENARIO,
  LOST_STREAK_SCENARIO,
  PERFECT_CONSISTENCY_SCENARIO,
  NO_ACTIVITY_SCENARIO,
  CoachAssertionError,
  assertValidRecommendations,
  assertValidPredictions,
  assertValidTimeline,
  assertValidHabits,
  assertValidEarlyRisks,
  assertValidCoachOutput,
  evaluateCoachQuality,
  runCoachRegressionSuite,
  runCoachBenchmarks,
  generateCoachDiagnostics,
} from './testing';
export type {
  CoachTestCase,
  CoachQualityReport,
  RegressionTestResult,
  BenchmarkStat,
  CoachBenchmarkReport,
  CoachDiagnosticReport,
} from './testing';

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
