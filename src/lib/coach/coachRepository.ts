/**
 * Coach Engine — Central In-Memory Intelligence Repository (Phase 3.9.6)
 *
 * Serves as the central in-memory store for all computed coach outputs:
 * - Caches the latest complete intelligence state
 * - Provides fast slice-level accessors for recommendations, predictions, risks, habits, trends, and timeline
 * - Zero persistence / zero localStorage / zero Supabase dependency
 * - Pure in-memory operational state
 *
 * @module coach/coachRepository
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
  AchievementsSummary,
} from './coachTypes';
import { deepCloneImmutable } from './coachSerializer';

export interface CoachRepositoryInstance {
  getLatestOutput: () => CoachOutput | null;
  setLatestOutput: (output: CoachOutput) => void;
  getLatestRecommendations: () => readonly CoachRecommendation[];
  getLatestPredictions: () => CoachPredictions | null;
  getLatestRiskAssessment: () => readonly CoachRiskItem[];
  getLatestHabits: () => CoachHabitAnalysis | null;
  getLatestTrends: () => CoachBehaviourTrends | null;
  getLatestEarlyRisks: () => CoachEarlyRiskReport | null;
  getLatestTimeline: () => readonly CoachTimelineEvent[];
  getLatestDailyBrief: () => DailyBrief | null;
  getLatestEveningReview: () => EveningReview | null;
  getLatestWeeklyReview: () => WeeklyReview | null;
  getLatestMonthlyReview: () => MonthlyReview | null;
  getLatestAchievementsSummary: () => AchievementsSummary | null;
  hasData: () => boolean;
  getLastUpdatedTimestamp: () => number | null;
  clear: () => void;
}

/**
 * Creates an in-memory intelligence repository instance.
 */
export function createCoachRepository(): CoachRepositoryInstance {
  let latestOutput: CoachOutput | null = null;
  let lastUpdatedMs: number | null = null;

  function setLatestOutput(output: CoachOutput): void {
    latestOutput = deepCloneImmutable(output);
    lastUpdatedMs = Date.now();
  }

  function getLatestOutput(): CoachOutput | null {
    return latestOutput;
  }

  function getLatestRecommendations(): readonly CoachRecommendation[] {
    return latestOutput?.recommendations || [];
  }

  function getLatestPredictions(): CoachPredictions | null {
    return latestOutput?.predictions || null;
  }

  function getLatestRiskAssessment(): readonly CoachRiskItem[] {
    return latestOutput?.risks || [];
  }

  function getLatestHabits(): CoachHabitAnalysis | null {
    return latestOutput?.habits || null;
  }

  function getLatestTrends(): CoachBehaviourTrends | null {
    return latestOutput?.behaviourTrends || null;
  }

  function getLatestEarlyRisks(): CoachEarlyRiskReport | null {
    return latestOutput?.earlyRisks || null;
  }

  function getLatestTimeline(): readonly CoachTimelineEvent[] {
    return latestOutput?.timeline || [];
  }

  function getLatestDailyBrief(): DailyBrief | null {
    return latestOutput?.dailyBrief || null;
  }

  function getLatestEveningReview(): EveningReview | null {
    return latestOutput?.eveningReview || null;
  }

  function getLatestWeeklyReview(): WeeklyReview | null {
    return latestOutput?.weeklyReview || null;
  }

  function getLatestMonthlyReview(): MonthlyReview | null {
    return latestOutput?.monthlyReview || null;
  }

  function getLatestAchievementsSummary(): AchievementsSummary | null {
    return latestOutput?.achievementsSummary || null;
  }

  function hasData(): boolean {
    return latestOutput !== null;
  }

  function getLastUpdatedTimestamp(): number | null {
    return lastUpdatedMs;
  }

  function clear(): void {
    latestOutput = null;
    lastUpdatedMs = null;
  }

  return {
    getLatestOutput,
    setLatestOutput,
    getLatestRecommendations,
    getLatestPredictions,
    getLatestRiskAssessment,
    getLatestHabits,
    getLatestTrends,
    getLatestEarlyRisks,
    getLatestTimeline,
    getLatestDailyBrief,
    getLatestEveningReview,
    getLatestWeeklyReview,
    getLatestMonthlyReview,
    getLatestAchievementsSummary,
    hasData,
    getLastUpdatedTimestamp,
    clear,
  };
}

/**
 * Global singleton coach repository.
 */
export const coachRepository = createCoachRepository();
