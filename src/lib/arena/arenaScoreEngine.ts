import { PeriodType } from '../../types/arena';

export interface ArenaMetricsInput {
  productivityScore: number;
  focusMinutes: number;
  tasksCompleted: number;
  dailyChallengePoints: number;
}

export interface ArenaScoreWeights {
  productivityWeight: number; // default 0.45
  focusMinutesWeight: number; // default 0.25
  tasksCompletedWeight: number; // default 0.20
  challengePointsWeight: number; // default 0.10
}

export interface ArenaScoreTargets {
  focusMinutesTarget: number;
  tasksCompletedTarget: number;
  challengePointsTarget: number;
}

export const DEFAULT_WEIGHTS: ArenaScoreWeights = {
  productivityWeight: 0.45,
  focusMinutesWeight: 0.25,
  tasksCompletedWeight: 0.20,
  challengePointsWeight: 0.10,
};

export const WEEKLY_TARGETS: ArenaScoreTargets = {
  focusMinutesTarget: 300, // 5 hours / week
  tasksCompletedTarget: 20, // 20 tasks / week
  challengePointsTarget: 100, // 100 pts / week
};

export const MONTHLY_TARGETS: ArenaScoreTargets = {
  focusMinutesTarget: 1200, // 20 hours / month
  tasksCompletedTarget: 80, // 80 tasks / month
  challengePointsTarget: 400, // 400 pts / month
};

// Clamp utility
export function clamp(min: number, max: number, value: number): number {
  if (isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

// Normalization utilities (return value between 0.0 and 1.0)
export function normalizeProductivityScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  return clamp(0, 1, score / 100);
}

export function normalizeFocusMinutes(minutes: number, target: number = 300): number {
  if (typeof minutes !== 'number' || isNaN(minutes) || target <= 0) return 0;
  return clamp(0, 1, minutes / target);
}

export function normalizeTasksCompleted(tasks: number, target: number = 20): number {
  if (typeof tasks !== 'number' || isNaN(tasks) || target <= 0) return 0;
  return clamp(0, 1, tasks / target);
}

export function normalizeChallengePoints(points: number, target: number = 100): number {
  if (typeof points !== 'number' || isNaN(points) || target <= 0) return 0;
  return clamp(0, 1, points / target);
}

/**
 * Calculates normalized Arena Score (0 to 100)
 * Formula:
 *  45% Productivity Score
 *  25% Focus Minutes
 *  20% Tasks Completed
 *  10% Daily Challenge Points
 */
export function calculateArenaScore(
  metrics: ArenaMetricsInput,
  periodType: PeriodType = 'weekly',
  customWeights?: Partial<ArenaScoreWeights>,
  customTargets?: Partial<ArenaScoreTargets>
): number {
  const weights: ArenaScoreWeights = { ...DEFAULT_WEIGHTS, ...customWeights };
  const targets: ArenaScoreTargets = {
    ...(periodType === 'monthly' ? MONTHLY_TARGETS : WEEKLY_TARGETS),
    ...customTargets,
  };

  const normProd = normalizeProductivityScore(metrics.productivityScore || 0);
  const normFocus = normalizeFocusMinutes(metrics.focusMinutes || 0, targets.focusMinutesTarget);
  const normTasks = normalizeTasksCompleted(metrics.tasksCompleted || 0, targets.tasksCompletedTarget);
  const normChallenge = normalizeChallengePoints(metrics.dailyChallengePoints || 0, targets.challengePointsTarget);

  const rawScore =
    normProd * weights.productivityWeight +
    normFocus * weights.focusMinutesWeight +
    normTasks * weights.tasksCompletedWeight +
    normChallenge * weights.challengePointsWeight;

  // Scale rawScore (0.0 to 1.0) to 0-100 range and round to nearest integer
  const finalScore = Math.round(clamp(0, 100, rawScore * 100));

  return finalScore;
}
