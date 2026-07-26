import { clamp } from './arenaScoreEngine';

/**
 * Calculates top percentile (e.g. Top 5%, Top 12%, Top 48%)
 * Safely handles edge cases:
 * - 0 or 1 participant -> Top 1%
 * - 2 participants -> Rank 1 is Top 50%, Rank 2 is Top 100%
 * - N participants -> clamp(1, 100, Math.round(((rank) / totalParticipants) * 100))
 */
export function calculatePercentile(rank: number | null | undefined, totalParticipants: number): number {
  if (!rank || isNaN(rank) || rank <= 0) return 100;
  if (!totalParticipants || totalParticipants <= 0) return 100;

  if (totalParticipants === 1) {
    return 1; // Single participant is #1 (Top 1%)
  }

  if (totalParticipants === 2) {
    return rank === 1 ? 50 : 100;
  }

  const rawPercentile = Math.round((rank / totalParticipants) * 100);
  return clamp(1, 100, rawPercentile);
}
