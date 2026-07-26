import { supabase } from '../lib/supabase';
import { ArenaScore, PeriodType } from '../types/arena';
import { buildLeaderboard, calculateArenaScore, ArenaMetricsInput } from '../lib/arena';

export const leaderboardService = {
  async getLeaderboard(
    arenaId: string,
    periodType: PeriodType,
    periodStart: string,
    limit: number = 50
  ): Promise<ArenaScore[]> {
    try {
      const { data, error } = await supabase
        .from('arena_scores')
        .select('*, profiles:user_id(display_name, avatar_url, streak, xp)')
        .eq('arena_id', arenaId)
        .eq('period_type', periodType)
        .eq('period_start', periodStart)
        .limit(limit);

      if (error) {
        if (import.meta.env.DEV) {
          console.warn('public.arena_scores query notice:', error.message);
        }
        return [];
      }

      const rawScores: ArenaScore[] = (data || []).map((item: any) => ({
        ...(item as ArenaScore),
        user_profile: item.profiles ? {
          display_name: item.profiles.display_name,
          avatar_url: item.profiles.avatar_url,
          streak: item.profiles.streak,
          xp: item.profiles.xp,
        } : undefined,
      }));

      // Use single source of truth Leaderboard Engine for sorting & rank calculation
      return buildLeaderboard(rawScores);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('Leaderboard query exception:', err);
      }
      return [];
    }
  },

  async getUserArenaScore(
    userId: string,
    arenaId: string,
    periodType: PeriodType,
    periodStart: string
  ): Promise<ArenaScore | null> {
    try {
      const { data, error } = await supabase
        .from('arena_scores')
        .select('*, profiles:user_id(display_name, avatar_url, streak, xp)')
        .eq('user_id', userId)
        .eq('arena_id', arenaId)
        .eq('period_type', periodType)
        .eq('period_start', periodStart)
        .maybeSingle();

      if (error) {
        if (import.meta.env.DEV) {
          console.warn('getUserArenaScore notice:', error.message);
        }
        return null;
      }
      if (!data) return null;

      return {
        ...(data as ArenaScore),
        user_profile: data.profiles ? {
          display_name: data.profiles.display_name,
          avatar_url: data.profiles.avatar_url,
          streak: data.profiles.streak,
          xp: data.profiles.xp,
        } : undefined,
      };
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('User arena score exception:', err);
      }
      return null;
    }
  },

  async updateArenaScore(
    userId: string,
    arenaId: string,
    periodType: PeriodType,
    periodStart: string,
    periodEnd: string,
    metrics: ArenaMetricsInput
  ): Promise<ArenaScore | null> {
    const finalScore = calculateArenaScore(metrics);

    try {
      const { data, error } = await supabase
        .from('arena_scores')
        .upsert(
          {
            user_id: userId,
            arena_id: arenaId,
            period_type: periodType,
            period_start: periodStart,
            period_end: periodEnd,
            arena_score: finalScore,
            focus_minutes: metrics.focusMinutes,
            tasks_completed: metrics.tasksCompleted,
            productivity_score_snapshot: metrics.productivityScore,
            daily_challenge_points: metrics.dailyChallengePoints,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,arena_id,period_type,period_start' }
        )
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.warn('updateArenaScore notice:', error.message);
        }
        return null;
      }

      return data as ArenaScore;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('Update arena score exception:', err);
      }
      return null;
    }
  },
};
