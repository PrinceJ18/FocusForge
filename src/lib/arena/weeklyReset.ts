import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { supabase } from '../supabase';
import { leaderboardService } from '../../services/leaderboardService';
import { hallOfFameService } from '../../services/hallOfFameService';

export interface PeriodRange {
  periodStart: string;
  periodEnd: string;
}

/**
 * Returns formatted weekly period range (Monday to Sunday)
 */
export function getWeeklyPeriodRange(date: Date = new Date()): PeriodRange {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  const sunday = endOfWeek(date, { weekStartsOn: 1 });

  return {
    periodStart: format(monday, 'yyyy-MM-dd'),
    periodEnd: format(sunday, 'yyyy-MM-dd'),
  };
}

/**
 * Returns formatted period range for previous week
 */
export function getPreviousWeeklyPeriodRange(date: Date = new Date()): PeriodRange {
  const prevWeekDate = subWeeks(date, 1);
  return getWeeklyPeriodRange(prevWeekDate);
}

export interface WeeklyResetResult {
  arenaId: string;
  previousPeriod: PeriodRange;
  winnerUserId: string | null;
  winnerScore: number;
  recordedHallOfFame: boolean;
}

/**
 * Executes weekly reset pipeline for an arena:
 * 1. Identifies top participant from previous week
 * 2. Archives champion into hall_of_fame
 * 3. Prepares current week leaderboard snapshot
 */
export async function processWeeklyReset(arenaId: string): Promise<WeeklyResetResult> {
  const prevPeriod = getPreviousWeeklyPeriodRange();

  // Fetch previous week's leaderboard
  const prevLeaderboard = await leaderboardService.getLeaderboard(
    arenaId,
    'weekly',
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
      period_type: 'weekly',
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
