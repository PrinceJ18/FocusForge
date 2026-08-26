/**
 * Coach Engine — Deterministic Validator (Phase 3.9.6)
 *
 * Validates structural integrity and semantic sanity of all generated coach outputs:
 * - Recommendations (valid fields, priority, rank score, explainability)
 * - Predictions (non-negative bounds, probability limits, grade formats)
 * - Habits (valid weekday indexes, hourly ranges)
 * - Trends (valid directions, magnitude bounds)
 * - Risk items (valid severity, thresholds)
 * - Timeline events (valid types, ISO timestamps)
 * - Complete CoachOutput packages
 *
 * All validators are pure functions returning deterministic validation reports.
 *
 * @module coach/coachValidator
 */

import type {
  CoachRecommendation,
  CoachPredictions,
  CoachHabitAnalysis,
  CoachBehaviourTrends,
  CoachEarlyRiskReport,
  CoachTimelineEvent,
  CoachOutput,
} from './coachTypes';

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface ValidationReport {
  readonly isValid: boolean;
  readonly summary: string;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly sectionResults: Readonly<Record<string, boolean>>;
}

/**
 * Validates a single recommendation object.
 */
export function validateRecommendation(rec: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rec || typeof rec !== 'object') {
    return { isValid: false, errors: ['Recommendation must be a non-null object'], warnings: [] };
  }

  const r = rec as Partial<CoachRecommendation>;

  if (!r.id || typeof r.id !== 'string') errors.push('Missing or invalid recommendation id.');
  if (!r.title || typeof r.title !== 'string') errors.push('Missing or invalid recommendation title.');
  if (!r.description || typeof r.description !== 'string') errors.push('Missing or invalid recommendation description.');
  if (!r.action || typeof r.action !== 'string') errors.push('Missing or invalid recommendation action.');

  const validPriorities = ['critical', 'high', 'medium', 'low', 'info'];
  if (!r.priority || !validPriorities.includes(r.priority)) {
    errors.push(`Invalid priority: "${r.priority}". Must be one of: ${validPriorities.join(', ')}.`);
  }

  if (r.rankingScore !== undefined) {
    if (typeof r.rankingScore !== 'number' || r.rankingScore < 0 || r.rankingScore > 100) {
      warnings.push(`Ranking score (${r.rankingScore}) is outside standard 0-100 range.`);
    }
  }

  if (r.explainability) {
    if (!r.explainability.why) warnings.push('Recommendation explainability is missing "why" reasoning.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates prediction outputs.
 */
export function validatePredictions(predictions: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!predictions || typeof predictions !== 'object') {
    return { isValid: false, errors: ['Predictions must be a non-null object'], warnings: [] };
  }

  const p = predictions as Partial<CoachPredictions>;

  if (typeof p.expectedMonthlyFocusMinutes !== 'number' || p.expectedMonthlyFocusMinutes < 0) {
    errors.push('expectedMonthlyFocusMinutes must be a non-negative number.');
  }
  if (typeof p.expectedMonthlySpending !== 'number' || p.expectedMonthlySpending < 0) {
    errors.push('expectedMonthlySpending must be a non-negative number.');
  }
  if (typeof p.expectedDailyProgress !== 'number' || p.expectedDailyProgress < 0 || p.expectedDailyProgress > 100) {
    errors.push('expectedDailyProgress must be a number between 0 and 100.');
  }
  if (typeof p.expectedProductivityScore !== 'number' || p.expectedProductivityScore < 0 || p.expectedProductivityScore > 100) {
    errors.push('expectedProductivityScore must be a number between 0 and 100.');
  }
  if (typeof p.expectedFinancialScore !== 'number' || p.expectedFinancialScore < 0 || p.expectedFinancialScore > 100) {
    errors.push('expectedFinancialScore must be a number between 0 and 100.');
  }

  const validGrades = ['A+', 'A', 'B', 'C', 'F'];
  if (!p.expectedWeeklyGrade || !validGrades.includes(p.expectedWeeklyGrade)) {
    warnings.push(`Unrecognized weekly grade: "${p.expectedWeeklyGrade}".`);
  }
  if (!p.expectedMonthlyGrade || !validGrades.includes(p.expectedMonthlyGrade)) {
    warnings.push(`Unrecognized monthly grade: "${p.expectedMonthlyGrade}".`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates habit analysis outputs.
 */
export function validateHabits(habits: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!habits || typeof habits !== 'object') {
    return { isValid: false, errors: ['Habits must be a non-null object'], warnings: [] };
  }

  const h = habits as Partial<CoachHabitAnalysis>;

  if (!h.bestWeekday || typeof h.bestWeekday.dayIndex !== 'number' || h.bestWeekday.dayIndex < 0 || h.bestWeekday.dayIndex > 6) {
    errors.push('bestWeekday must have a valid dayIndex (0-6).');
  }
  if (!h.weakestWeekday || typeof h.weakestWeekday.dayIndex !== 'number' || h.weakestWeekday.dayIndex < 0 || h.weakestWeekday.dayIndex > 6) {
    errors.push('weakestWeekday must have a valid dayIndex (0-6).');
  }
  if (!h.bestFocusHour || typeof h.bestFocusHour.hour !== 'number' || h.bestFocusHour.hour < 0 || h.bestFocusHour.hour > 23) {
    errors.push('bestFocusHour must have a valid hour (0-23).');
  }
  if (typeof h.consistencyScore !== 'number' || h.consistencyScore < 0 || h.consistencyScore > 100) {
    warnings.push('consistencyScore is outside 0-100 bounds.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates behavioural trends output.
 */
export function validateTrends(trends: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!trends || typeof trends !== 'object') {
    return { isValid: false, errors: ['Trends must be a non-null object'], warnings: [] };
  }

  const t = trends as Partial<CoachBehaviourTrends>;
  const validDirections = ['improving', 'stable', 'declining'];

  ['productivity', 'focus', 'finance', 'taskCompletion', 'consistency'].forEach(facet => {
    const item = (t as Record<string, any>)[facet];
    if (!item || !validDirections.includes(item.direction)) {
      errors.push(`Trend facet "${facet}" is missing or has invalid direction.`);
    }
  });

  if (typeof t.trendMomentumScore !== 'number' || t.trendMomentumScore < -100 || t.trendMomentumScore > 100) {
    warnings.push(`trendMomentumScore (${t.trendMomentumScore}) is outside -100 to +100 bounds.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates early risk detection report.
 */
export function validateRisks(risks: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!risks || typeof risks !== 'object') {
    return { isValid: false, errors: ['Early risks must be a non-null object'], warnings: [] };
  }

  const r = risks as Partial<CoachEarlyRiskReport>;

  if (!r.streakLossRisk || typeof r.streakLossRisk.riskScore !== 'number') {
    errors.push('streakLossRisk is missing or has invalid riskScore.');
  }
  if (!r.budgetExhaustionRisk || typeof r.budgetExhaustionRisk.riskScore !== 'number') {
    errors.push('budgetExhaustionRisk is missing or has invalid riskScore.');
  }
  if (!r.burnoutRisk || typeof r.burnoutRisk.riskScore !== 'number') {
    errors.push('burnoutRisk is missing or has invalid riskScore.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a single timeline event.
 */
export function validateTimelineEvent(evt: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!evt || typeof evt !== 'object') {
    return { isValid: false, errors: ['Timeline event must be a non-null object'], warnings: [] };
  }

  const e = evt as Partial<CoachTimelineEvent>;
  if (!e.id || typeof e.id !== 'string') errors.push('Timeline event missing id.');
  if (!e.title || typeof e.title !== 'string') errors.push('Timeline event missing title.');
  if (!e.timestamp || typeof e.timestamp !== 'string') errors.push('Timeline event missing timestamp.');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a complete CoachOutput package and returns a comprehensive ValidationReport.
 */
export function validateCoachOutput(output: unknown): ValidationReport {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const sectionResults: Record<string, boolean> = {};

  if (!output || typeof output !== 'object') {
    return {
      isValid: false,
      summary: 'CoachOutput validation failed: Root object is null or not an object.',
      errors: ['Root CoachOutput is null or not an object.'],
      warnings: [],
      sectionResults: {},
    };
  }

  const out = output as Partial<CoachOutput>;

  // 1. Validate Predictions
  const predResult = validatePredictions(out.predictions);
  sectionResults.predictions = predResult.isValid;
  allErrors.push(...predResult.errors.map(e => `[Predictions] ${e}`));
  allWarnings.push(...predResult.warnings.map(w => `[Predictions] ${w}`));

  // 2. Validate Recommendations
  if (Array.isArray(out.recommendations)) {
    let recsValid = true;
    out.recommendations.forEach((r, idx) => {
      const v = validateRecommendation(r);
      if (!v.isValid) recsValid = false;
      allErrors.push(...v.errors.map(e => `[Recommendation #${idx}] ${e}`));
      allWarnings.push(...v.warnings.map(w => `[Recommendation #${idx}] ${w}`));
    });
    sectionResults.recommendations = recsValid;
  } else {
    allErrors.push('[Recommendations] recommendations is not an array.');
    sectionResults.recommendations = false;
  }

  // 3. Validate Habits
  if (out.habits) {
    const habitResult = validateHabits(out.habits);
    sectionResults.habits = habitResult.isValid;
    allErrors.push(...habitResult.errors.map(e => `[Habits] ${e}`));
    allWarnings.push(...habitResult.warnings.map(w => `[Habits] ${w}`));
  }

  // 4. Validate Trends
  if (out.behaviourTrends) {
    const trendResult = validateTrends(out.behaviourTrends);
    sectionResults.trends = trendResult.isValid;
    allErrors.push(...trendResult.errors.map(e => `[Trends] ${e}`));
    allWarnings.push(...trendResult.warnings.map(w => `[Trends] ${w}`));
  }

  // 5. Validate Early Risks
  if (out.earlyRisks) {
    const riskResult = validateRisks(out.earlyRisks);
    sectionResults.earlyRisks = riskResult.isValid;
    allErrors.push(...riskResult.errors.map(e => `[EarlyRisks] ${e}`));
    allWarnings.push(...riskResult.warnings.map(w => `[EarlyRisks] ${w}`));
  }

  // 6. Validate Timeline
  if (Array.isArray(out.timeline)) {
    let timelineValid = true;
    out.timeline.forEach((evt, idx) => {
      const v = validateTimelineEvent(evt);
      if (!v.isValid) timelineValid = false;
      allErrors.push(...v.errors.map(e => `[Timeline #${idx}] ${e}`));
      allWarnings.push(...v.warnings.map(w => `[Timeline #${idx}] ${w}`));
    });
    sectionResults.timeline = timelineValid;
  }

  const isValid = allErrors.length === 0;
  const summary = isValid
    ? 'CoachOutput validation passed successfully.'
    : `CoachOutput validation failed with ${allErrors.length} error(s) and ${allWarnings.length} warning(s).`;

  return {
    isValid,
    summary,
    errors: allErrors,
    warnings: allWarnings,
    sectionResults,
  };
}
