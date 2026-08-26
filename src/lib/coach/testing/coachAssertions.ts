/**
 * Coach QA Suite — Assertion Helpers (Phase 3.9.7)
 *
 * Provides strict, deterministic assertion functions that validate every layer
 * of generated coach data: structure, bounds, sorting, explainability, and sanity.
 *
 * Designed for testing suites and automated verification. Throws descriptive errors on failure.
 *
 * @module coach/testing/coachAssertions
 */

import type {
  CoachOutput,
  CoachRecommendation,
  CoachPredictions,
  CoachRiskItem,
  CoachHabitAnalysis,
  CoachBehaviourTrends,
  CoachEarlyRiskReport,
  CoachTimelineEvent,
  DailyBrief,
  EveningReview,
  WeeklyReview,
  MonthlyReview,
} from '../coachTypes';

export class CoachAssertionError extends Error {
  constructor(message: string, public readonly context?: unknown) {
    super(`[CoachAssertionError] ${message}`);
    this.name = 'CoachAssertionError';
  }
}

/**
 * Asserts that recommendations are non-null, valid, and sorted by rankingScore descending.
 */
export function assertValidRecommendations(recs: readonly CoachRecommendation[]): void {
  if (!Array.isArray(recs)) {
    throw new CoachAssertionError('Recommendations must be an array.');
  }

  let prevScore = Infinity;
  recs.forEach((r, idx) => {
    if (!r.id || typeof r.id !== 'string') {
      throw new CoachAssertionError(`Recommendation at index ${idx} has invalid id: ${r.id}`);
    }
    if (!r.title || typeof r.title !== 'string') {
      throw new CoachAssertionError(`Recommendation "${r.id}" has invalid title.`);
    }
    if (!r.action || typeof r.action !== 'string') {
      throw new CoachAssertionError(`Recommendation "${r.id}" has invalid action.`);
    }

    // Verify explainability
    if (r.explainability) {
      if (!r.explainability.why || typeof r.explainability.why !== 'string') {
        throw new CoachAssertionError(`Recommendation "${r.id}" explainability missing "why".`);
      }
      if (!Array.isArray(r.explainability.triggerMetrics)) {
        throw new CoachAssertionError(`Recommendation "${r.id}" triggerMetrics must be an array.`);
      }
    }

    // Verify ranking score ordering
    const currentScore = r.rankingScore ?? 0;
    if (currentScore > prevScore) {
      throw new CoachAssertionError(
        `Recommendations are not properly sorted by rankingScore descending: rec #${idx} (${currentScore}) > rec #${idx - 1} (${prevScore})`
      );
    }
    prevScore = currentScore;
  });
}

/**
 * Asserts that predictions are within sane numerical bounds.
 */
export function assertValidPredictions(preds: CoachPredictions): void {
  if (!preds || typeof preds !== 'object') {
    throw new CoachAssertionError('Predictions must be a non-null object.');
  }

  if (preds.expectedMonthlyFocusMinutes < 0) {
    throw new CoachAssertionError(`Negative expectedMonthlyFocusMinutes: ${preds.expectedMonthlyFocusMinutes}`);
  }
  if (preds.expectedMonthlySpending < 0) {
    throw new CoachAssertionError(`Negative expectedMonthlySpending: ${preds.expectedMonthlySpending}`);
  }
  if (preds.expectedDailyProgress < 0 || preds.expectedDailyProgress > 100) {
    throw new CoachAssertionError(`expectedDailyProgress out of bounds [0, 100]: ${preds.expectedDailyProgress}`);
  }
  if (preds.expectedProductivityScore < 0 || preds.expectedProductivityScore > 100) {
    throw new CoachAssertionError(`expectedProductivityScore out of bounds [0, 100]: ${preds.expectedProductivityScore}`);
  }
  if (preds.expectedFinancialScore < 0 || preds.expectedFinancialScore > 100) {
    throw new CoachAssertionError(`expectedFinancialScore out of bounds [0, 100]: ${preds.expectedFinancialScore}`);
  }

  const validConfidence = ['high', 'medium', 'low'];
  if (!validConfidence.includes(preds.confidence)) {
    throw new CoachAssertionError(`Invalid prediction confidence: ${preds.confidence}`);
  }
}

/**
 * Asserts that timeline events are valid and sorted chronologically descending.
 */
export function assertValidTimeline(timeline: readonly CoachTimelineEvent[]): void {
  if (!Array.isArray(timeline)) {
    throw new CoachAssertionError('Timeline must be an array.');
  }

  let prevTimestamp = '9999-99-99';
  timeline.forEach((evt, idx) => {
    if (!evt.id || !evt.title || !evt.timestamp) {
      throw new CoachAssertionError(`Timeline event at index ${idx} is missing required fields.`);
    }
    if (evt.timestamp > prevTimestamp) {
      throw new CoachAssertionError(
        `Timeline is not sorted descending chronologically: event #${idx} (${evt.timestamp}) is newer than event #${idx - 1} (${prevTimestamp})`
      );
    }
    prevTimestamp = evt.timestamp;
  });
}

/**
 * Asserts that habits analysis is structurally complete and values are in bounds.
 */
export function assertValidHabits(habits: CoachHabitAnalysis): void {
  if (!habits || typeof habits !== 'object') {
    throw new CoachAssertionError('Habits analysis must be a non-null object.');
  }

  if (habits.allWeekdays.length !== 7) {
    throw new CoachAssertionError(`Expected 7 weekdays in allWeekdays, received ${habits.allWeekdays.length}`);
  }
  if (habits.bestWeekday.dayIndex < 0 || habits.bestWeekday.dayIndex > 6) {
    throw new CoachAssertionError(`Invalid bestWeekday dayIndex: ${habits.bestWeekday.dayIndex}`);
  }
  if (habits.bestFocusHour.hour < 0 || habits.bestFocusHour.hour > 23) {
    throw new CoachAssertionError(`Invalid bestFocusHour hour: ${habits.bestFocusHour.hour}`);
  }
  if (habits.consistencyScore < 0 || habits.consistencyScore > 100) {
    throw new CoachAssertionError(`Consistency score out of bounds [0, 100]: ${habits.consistencyScore}`);
  }
}

/**
 * Asserts that early risk report contains all required dimensions.
 */
export function assertValidEarlyRisks(risks: CoachEarlyRiskReport): void {
  if (!risks || typeof risks !== 'object') {
    throw new CoachAssertionError('Early risk report must be a non-null object.');
  }

  if (risks.streakLossRisk.riskScore < 0 || risks.streakLossRisk.riskScore > 100) {
    throw new CoachAssertionError(`streakLossRisk score out of bounds: ${risks.streakLossRisk.riskScore}`);
  }
  if (risks.budgetExhaustionRisk.riskScore < 0 || risks.budgetExhaustionRisk.riskScore > 100) {
    throw new CoachAssertionError(`budgetExhaustionRisk score out of bounds: ${risks.budgetExhaustionRisk.riskScore}`);
  }
  if (risks.burnoutRisk.riskScore < 0 || risks.burnoutRisk.riskScore > 100) {
    throw new CoachAssertionError(`burnoutRisk score out of bounds: ${risks.burnoutRisk.riskScore}`);
  }
}

/**
 * Asserts complete validation of the entire CoachOutput.
 */
export function assertValidCoachOutput(output: CoachOutput): void {
  if (!output || typeof output !== 'object') {
    throw new CoachAssertionError('CoachOutput must be a non-null object.');
  }

  assertValidRecommendations(output.recommendations);
  assertValidPredictions(output.predictions);
  assertValidTimeline(output.timeline);
  assertValidHabits(output.habits);
  assertValidEarlyRisks(output.earlyRisks);

  if (!output.dailyBrief || !output.dailyBrief.greeting) {
    throw new CoachAssertionError('Daily brief is missing or invalid.');
  }
  if (!output.eveningReview || typeof output.eveningReview.dayScore !== 'number') {
    throw new CoachAssertionError('Evening review is missing or invalid.');
  }
  if (!output.weeklyReview || typeof output.weeklyReview.weekScore !== 'number') {
    throw new CoachAssertionError('Weekly review is missing or invalid.');
  }
  if (!output.monthlyReview || typeof output.monthlyReview.monthScore !== 'number') {
    throw new CoachAssertionError('Monthly review is missing or invalid.');
  }
}
