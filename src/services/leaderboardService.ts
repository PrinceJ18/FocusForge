import { supabase } from '../lib/supabase';
import { ArenaScore, PeriodType } from '../types/arena';

export const leaderboardService = {
  async getLeaderboard(
    arenaId: string,
    periodType: PeriodType,
    periodStart: string,
    limit: number = 50
  ): Promise<ArenaScore[]> {
    const { data, error } = await supabase
      .from('arena_scores')
      .select('*')
      .eq('arena_id', arenaId)
      .eq('period_type', periodType)
      .eq('period_start', periodStart)
      .order('arena_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching arena leaderboard:', error);
      throw error;
    }

    return (data || []).map((item, index) => ({
      ...(item as ArenaScore),
      rank: index + 1,
    }));
  },

  async getUserArenaScore(
    userId: string,
    arenaId: string,
    periodType: PeriodType,
    periodStart: string
  ): Promise<ArenaScore | null> {
    const { data, error } = await supabase
      .from('arena_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('arena_id', arenaId)
      .eq('period_type', periodType)
      .eq('period_start', periodStart)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user arena score:', error);
      throw error;
    }
    return data as ArenaScore | null;
  },

  async recordOrUpdateArenaScore(
    scoreData: Omit<ArenaScore, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ArenaScore> {
    const { data, error } = await supabase
      .from('arena_scores')
      .upsert(
        {
          ...scoreData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,arena_id,period_type,period_start' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating arena score:', error);
      throw error;
    }
    return data as ArenaScore;
  },
};
