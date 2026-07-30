import { supabase } from '../lib/supabase';
import { arenaService } from './arenaService';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

export interface HallOfFameEntry {
  id: string;
  arena_id: string;
  period_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  champion_user_id: string;
  display_name_snapshot: string | null;
  avatar_url_snapshot: string | null;
  level_snapshot: number;
  total_score: number;
  focus_points: number;
  task_points: number;
  challenge_points: number;
  streak_bonus: number;
  member_count: number;
  created_at: string;
}

export const championService = {
  async calculateWeeklyChampion(arenaId: string) {
    const today = new Date();
    const periodStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const periodEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    await this.archiveChampion(arenaId, 'weekly', periodStart, periodEnd);
  },

  async calculateMonthlyChampion(arenaId: string) {
    const today = new Date();
    const periodStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const periodEnd = format(endOfMonth(today), 'yyyy-MM-dd');
    await this.archiveChampion(arenaId, 'monthly', periodStart, periodEnd);
  },

  async archiveChampion(arenaId: string, periodType: 'weekly' | 'monthly', periodStart: string, periodEnd: string) {
    try {
      // 1. Fetch the exact leaderboard to identify Rank 1
      const leaderboard = await arenaService.getLeaderboard(arenaId, periodType, periodStart);
      
      if (!leaderboard || leaderboard.length === 0) return; // No one to archive
      
      const champion = leaderboard[0];

      // 2. Fetch member count
      const members = await arenaService.getArenaMembers(arenaId);
      const memberCount = members.length;

      // 3. Upsert / Insert on conflict do nothing
      // We do a direct insert because the UNIQUE constraint on (arena_id, period_type, period_start)
      // will fail if it already exists, ensuring idempotency.
      const { error } = await supabase
        .from('hall_of_fame')
        .insert({
          arena_id: arenaId,
          period_type: periodType,
          period_start: periodStart,
          period_end: periodEnd,
          champion_user_id: champion.user_id,
          display_name_snapshot: champion.profile.display_name,
          avatar_url_snapshot: champion.profile.avatar_url,
          level_snapshot: champion.profile.level,
          total_score: champion.total_score,
          focus_points: champion.focus_points,
          task_points: champion.task_points,
          challenge_points: champion.challenge_points,
          streak_bonus: champion.streak_bonus,
          member_count: memberCount
        });

      if (error && error.code !== '23505') { // Ignore unique violation (23505 = duplicate)
        console.error('Error archiving champion:', error);
      }
    } catch (err) {
      console.error('Failed to calculate and archive champion', err);
    }
  },

  async getLatestChampion(arenaId: string, periodType: 'weekly' | 'monthly'): Promise<HallOfFameEntry | null> {
    const { data, error } = await supabase
      .from('hall_of_fame')
      .select('*')
      .eq('arena_id', arenaId)
      .eq('period_type', periodType)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest champion:', error);
      return null;
    }
    return data as HallOfFameEntry | null;
  },

  async getHallOfFame(
    arenaId: string, 
    periodType: 'weekly' | 'monthly', 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ data: HallOfFameEntry[], hasMore: boolean }> {
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit - 1;

    const { data, error, count } = await supabase
      .from('hall_of_fame')
      .select('*', { count: 'exact' })
      .eq('arena_id', arenaId)
      .eq('period_type', periodType)
      .order('period_start', { ascending: false })
      .range(startIdx, endIdx);

    if (error) {
      console.error('Error fetching hall of fame:', error);
      return { data: [], hasMore: false };
    }

    const hasMore = count ? startIdx + limit < count : false;
    return { data: (data || []) as HallOfFameEntry[], hasMore };
  }
};
