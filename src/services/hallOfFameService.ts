import { supabase } from '../lib/supabase';
import { HallOfFameEntry } from '../types/hallOfFame';
import { PeriodType } from '../types/arena';

export const hallOfFameService = {
  async getHallOfFameEntries(
    arenaId: string,
    periodType?: PeriodType,
    limit: number = 20
  ): Promise<HallOfFameEntry[]> {
    try {
      let query = supabase
        .from('hall_of_fame')
        .select('*, profiles:winner_user_id(display_name, avatar_url)')
        .eq('arena_id', arenaId)
        .order('period_start', { ascending: false })
        .limit(limit);

      if (periodType) {
        query = query.eq('period_type', periodType);
      }

      const { data, error } = await query;

      if (error) {
        if (import.meta.env.DEV) {
          console.warn('public.hall_of_fame query notice:', error.message);
        }
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        arena_id: item.arena_id,
        period_type: item.period_type,
        period_start: item.period_start,
        period_end: item.period_end,
        winner_user_id: item.winner_user_id,
        winner_username: item.winner_username || item.profiles?.display_name || 'Anonymous Winner',
        winner_avatar_url: item.winner_avatar_url || item.profiles?.avatar_url || null,
        arena_score: item.arena_score,
        created_at: item.created_at,
        winner_profile: item.profiles ? {
          display_name: item.profiles.display_name,
          avatar_url: item.profiles.avatar_url,
        } : undefined,
      }));
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('Hall of Fame query exception:', err);
      }
      return [];
    }
  },

  async recordHallOfFameWinner(
    entry: Omit<HallOfFameEntry, 'id' | 'created_at' | 'winner_profile'>
  ): Promise<HallOfFameEntry | null> {
    try {
      let winnerUsername = entry.winner_username;
      let winnerAvatarUrl = entry.winner_avatar_url;

      if (!winnerUsername || !winnerAvatarUrl) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', entry.winner_user_id)
          .maybeSingle();

        if (profile) {
          winnerUsername = winnerUsername || profile.display_name || 'Anonymous Winner';
          winnerAvatarUrl = winnerAvatarUrl || profile.avatar_url || null;
        }
      }

      const { data, error } = await supabase
        .from('hall_of_fame')
        .insert({
          arena_id: entry.arena_id,
          period_type: entry.period_type,
          period_start: entry.period_start,
          period_end: entry.period_end,
          winner_user_id: entry.winner_user_id,
          winner_username: winnerUsername || 'Anonymous Winner',
          winner_avatar_url: winnerAvatarUrl,
          arena_score: entry.arena_score,
        })
        .select()
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.warn('public.hall_of_fame insert notice:', error.message);
        }
        return null;
      }

      return data as HallOfFameEntry;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('Record Hall of Fame winner exception:', err);
      }
      return null;
    }
  },
};
