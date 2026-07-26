import { ArenaScore } from '../../types/arena';
import { RankMovement } from './leaderboardEngine';

export interface RankImprovementResult {
  movement: RankMovement;
  delta: number;
}

/**
 * Calculates distance (points needed) to overtake the participant directly above
 */
export function calculateDistanceToNextRank(
  currentScore: number,
  currentRank: number,
  leaderboard: ArenaScore[]
): number {
  if (!leaderboard || leaderboard.length === 0) return 0;
  if (currentRank <= 1) return 0; // Already #1 or invalid rank

  // Find participant at rank above
  const targetRankIndex = currentRank - 2; // 0-indexed index of rank above
  if (targetRankIndex < 0 || targetRankIndex >= leaderboard.length) return 0;

  const prevScore = leaderboard[targetRankIndex].arena_score || 0;
  const gap = prevScore - currentScore;

  return Math.max(1, gap + 1); // Need at least 1 point more than participant above
}

/**
 * Calculates rank improvement comparing previous rank vs current rank
 */
export function calculateRankImprovement(
  previousRank: number | null | undefined,
  currentRank: number
): RankImprovementResult {
  if (previousRank == null || isNaN(previousRank)) {
    return { movement: 'same', delta: 0 };
  }

  if (currentRank < previousRank) {
    return { movement: 'up', delta: previousRank - currentRank };
  } else if (currentRank > previousRank) {
    return { movement: 'down', delta: currentRank - previousRank };
  }

  return { movement: 'same', delta: 0 };
}
