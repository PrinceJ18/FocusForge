import { ArenaScore } from '../../types/arena';
import { HallOfFameEntry } from '../../types/hallOfFame';

export interface ChampionResult {
  champion: ArenaScore | null;
  userId: string | null;
  score: number;
  winningStreak: number;
}

/**
 * Determines current champion from sorted leaderboard
 */
export function determineChampion(leaderboard: ArenaScore[]): ArenaScore | null {
  if (!leaderboard || leaderboard.length === 0) return null;
  return leaderboard[0];
}

/**
 * Calculates consecutive winning streak for a champion across historical Hall of Fame records
 */
export function calculateWinningStreak(
  championUserId: string | null | undefined,
  hallOfFameEntries: HallOfFameEntry[]
): number {
  if (!championUserId || !hallOfFameEntries || hallOfFameEntries.length === 0) {
    return championUserId ? 1 : 0;
  }

  // Sort Hall of Fame entries descending by period_start
  const sortedHistory = [...hallOfFameEntries].sort(
    (a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
  );

  let streak = 1; // Current period victory counts as 1

  for (const entry of sortedHistory) {
    if (entry.winner_user_id === championUserId) {
      streak += 1;
    } else {
      break; // Streak broken
    }
  }

  return streak;
}
