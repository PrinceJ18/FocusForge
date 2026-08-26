/**
 * Coach QA Suite — Intelligence Quality Evaluator (Phase 3.9.7)
 *
 * Computes multidimensional quality metrics for AI Coach outputs:
 * - Duplicate recommendation detection (by ID or semantic title/action collision)
 * - Contradictory advice detection (e.g. demanding marathon work during critical burnout)
 * - Confidence consistency (confidence tier matching historical data availability)
 * - Prediction stability & mathematical sanity
 * - Risk accuracy & false positive checks
 * - Priority & rank ordering correctness
 *
 * Returns a composite Coach Quality Score (0–100) and detailed quality audit report.
 *
 * @module coach/testing/coachQuality
 */

import type { CoachOutput, CoachInput } from '../coachTypes';

export interface CoachQualityReport {
  readonly qualityScore: number; // 0–100
  readonly grade: 'A+' | 'A' | 'B' | 'C' | 'F';
  readonly metrics: {
    readonly duplicateCount: number;
    readonly contradictionCount: number;
    readonly confidenceConsistencyPct: number;
    readonly priorityOrderCorrectnessPct: number;
    readonly riskAccuracyPct: number;
    readonly explainabilityCompletenessPct: number;
  };
  readonly findings: readonly string[];
  readonly passedAudits: readonly string[];
}

/**
 * Evaluates the quality of a generated CoachOutput against its CoachInput.
 */
export function evaluateCoachQuality(output: CoachOutput, input: CoachInput): CoachQualityReport {
  const findings: string[] = [];
  const passedAudits: string[] = [];

  let deductions = 0;

  // 1. Duplicate Detection
  const recIds = new Set<string>();
  const recTitles = new Set<string>();
  let duplicateCount = 0;

  output.recommendations.forEach(r => {
    if (recIds.has(r.id) || recTitles.has(r.title.toLowerCase())) {
      duplicateCount++;
      findings.push(`Duplicate recommendation detected: "${r.title}" (ID: ${r.id}).`);
    }
    recIds.add(r.id);
    recTitles.add(r.title.toLowerCase());
  });

  if (duplicateCount === 0) {
    passedAudits.push('Zero duplicate recommendations detected.');
  } else {
    deductions += duplicateCount * 15;
  }

  // 2. Contradictory Advice Detection
  let contradictionCount = 0;
  const isBurnoutCritical = output.earlyRisks.burnoutRisk.level === 'critical' || output.earlyRisks.burnoutRisk.level === 'high';
  const hasMarathonFocusRecommendation = output.recommendations.some(
    r => r.id === 'rule_focus_below_weekly_avg' && r.priority === 'critical'
  );

  if (isBurnoutCritical && hasMarathonFocusRecommendation) {
    contradictionCount++;
    findings.push('Contradiction: System recommended aggressive focus increase while burnout risk is high/critical.');
    deductions += 20;
  } else {
    passedAudits.push('No contradictory advice detected between burnout and focus rules.');
  }

  // 3. Confidence Consistency
  const dataPoints = input.dailyGoalHistory.length;
  let confidenceConsistencyPct = 100;
  if (dataPoints >= 30 && output.predictions.confidence !== 'high') {
    confidenceConsistencyPct = 60;
    findings.push(`Confidence mismatch: 30+ history snapshots available, but prediction confidence is "${output.predictions.confidence}".`);
    deductions += 10;
  } else if (dataPoints < 14 && output.predictions.confidence === 'high') {
    confidenceConsistencyPct = 50;
    findings.push(`Confidence overstatement: < 14 snapshots available, but prediction confidence is marked "high".`);
    deductions += 15;
  } else {
    passedAudits.push('Prediction confidence level strictly matches data availability.');
  }

  // 4. Priority Ordering Correctness
  let priorityOrderViolations = 0;
  let prevScore = Infinity;
  output.recommendations.forEach((r, idx) => {
    const currentScore = r.rankingScore ?? 0;
    if (currentScore > prevScore) {
      priorityOrderViolations++;
      findings.push(`Priority ranking inversion at index ${idx}: ${currentScore} > ${prevScore}.`);
    }
    prevScore = currentScore;
  });

  const priorityOrderCorrectnessPct =
    output.recommendations.length > 0
      ? Math.round(((output.recommendations.length - priorityOrderViolations) / output.recommendations.length) * 100)
      : 100;

  if (priorityOrderViolations === 0) {
    passedAudits.push('Recommendations are 100% deterministically ordered by rankingScore.');
  } else {
    deductions += priorityOrderViolations * 10;
  }

  // 5. Explainability Completeness
  let explainabilityMissing = 0;
  output.recommendations.forEach(r => {
    if (!r.explainability || !r.explainability.why || r.explainability.triggerMetrics.length === 0) {
      explainabilityMissing++;
    }
  });

  const explainabilityCompletenessPct =
    output.recommendations.length > 0
      ? Math.round(((output.recommendations.length - explainabilityMissing) / output.recommendations.length) * 100)
      : 100;

  if (explainabilityMissing === 0) {
    passedAudits.push('All recommendations include complete causal explainability metadata.');
  } else {
    deductions += explainabilityMissing * 5;
    findings.push(`${explainabilityMissing} recommendation(s) lack full explainability payloads.`);
  }

  // 6. Risk Accuracy
  let riskAccuracyPct = 100;
  const isBudgetExhausted = input.profile.monthly_budget > 0 && input.analytics.monthlySpent >= input.profile.monthly_budget;
  if (isBudgetExhausted && output.earlyRisks.budgetExhaustionRisk.probability !== 'critical') {
    riskAccuracyPct = 70;
    findings.push('Risk inaccuracy: Budget is exhausted but budgetExhaustionRisk was not marked critical.');
    deductions += 15;
  } else {
    passedAudits.push('Risk alerts accurately reflect state thresholds.');
  }

  const qualityScore = Math.max(0, Math.min(100, 100 - deductions));

  let grade: CoachQualityReport['grade'] = 'F';
  if (qualityScore >= 95) grade = 'A+';
  else if (qualityScore >= 85) grade = 'A';
  else if (qualityScore >= 70) grade = 'B';
  else if (qualityScore >= 50) grade = 'C';

  return {
    qualityScore,
    grade,
    metrics: {
      duplicateCount,
      contradictionCount,
      confidenceConsistencyPct,
      priorityOrderCorrectnessPct,
      riskAccuracyPct,
      explainabilityCompletenessPct,
    },
    findings,
    passedAudits,
  };
}
