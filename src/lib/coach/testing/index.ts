/**
 * Coach QA Suite — Public Testing & QA API (Phase 3.9.7)
 *
 * Barrel re-export for the testing and validation suite.
 *
 * @module coach/testing
 */

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
} from './coachTestCases';
export type { CoachTestCase } from './coachTestCases';

export {
  CoachAssertionError,
  assertValidRecommendations,
  assertValidPredictions,
  assertValidTimeline,
  assertValidHabits,
  assertValidEarlyRisks,
  assertValidCoachOutput,
} from './coachAssertions';

export { evaluateCoachQuality } from './coachQuality';
export type { CoachQualityReport } from './coachQuality';

export { runCoachRegressionSuite } from './coachRegression';
export type { RegressionTestResult } from './coachRegression';

export { runCoachBenchmarks } from './coachBenchmarks';
export type { BenchmarkStat, CoachBenchmarkReport } from './coachBenchmarks';

export { generateCoachDiagnostics } from './coachDiagnostics';
export type { CoachDiagnosticReport } from './coachDiagnostics';
