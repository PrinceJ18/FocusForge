import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { leaderboardService } from '../../services/leaderboardService';
import { hallOfFameService } from '../../services/hallOfFameService';
import { PeriodRange } from './weeklyReset';

/**
 * Returns formatted monthly period range (1st to last day of month)
 */
export function getMonthlyPeriodRange(date: Date = new Date()): PeriodRange {
  const firstDay = startOfMonth(date);
  const lastDay = endOfMonth(date);

  return {
    periodStart: format(firstDay, 'yyyy-MM-dd'),
    periodEnd: format(lastDay, 'yyyy-MM-dd'),
  };
}

/**
 * Returns formatted period range for previous month
 */
export function getPreviousMonthlyPeriodRange(date: Date = new Date()): PeriodRange {
  const prevMonthDate = subMonths(date, 1);
  return getMonthlyPeriodRange(prevMonthDate);
}

export interface MonthlyResetResult {
  arenaId: string;
  previousPeriod: PeriodRange;
  winnerUserId: string | null;
  winnerScore: number;
  recordedHallOfFame: boolean;
}

/**
 * Executes monthly reset pipeline for an arena:
 * 1. Identifies top participant from previous month
 * 2. Archives champion into hall_of_fame
 * 3. Prepares current month league snapshot
 */
export async function processMonthlyReset(arenaId: string): Promise<MonthlyResetResult> {
  const prevPeriod = getPreviousMonthlyPeriodRange();

  // Fetch previous month's leaderboard
  const prevLeaderboard = await leaderboardService.getLeaderboard(
    arenaId,
    'monthly',
    prevPeriod.periodStart
  );

  let winnerUserId: string | null = null;
  let winnerScore = 0;
  let recordedHallOfFame = false;

  if (prevLeaderboard && prevLeaderboard.length > 0) {
    const champion = prevLeaderboard[0];
    winnerUserId = champion.user_id;
    winnerScore = champion.arena_score;

    // Record champion into Hall of Fame
    await hallOfFameService.recordHallOfFameWinner({
      arena_id: arenaId,
      period_type: 'monthly',
      period_start: prevPeriod.periodStart,
      period_end: prevPeriod.periodEnd,
      winner_user_id: champion.user_id,
      winner_username: champion.user_profile?.display_name || null,
      winner_avatar_url: champion.user_profile?.avatar_url || null,
      arena_score: champion.arena_score,
    });

    recordedHallOfFame = true;
  }

  return {
    arenaId,
    previousPeriod: prevPeriod,
    winnerUserId,
    winnerScore,
    recordedHallOfFame,
  };
}
