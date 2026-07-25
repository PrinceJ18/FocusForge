import { supabase } from '../lib/supabase';
import { HallOfFameEntry } from '../types/hallOfFame';
import { PeriodType } from '../types/arena';

export const hallOfFameService = {
  async getHallOfFameEntries(
    arenaId: string,
    periodType?: PeriodType,
    limit: number = 20
  ): Promise<HallOfFameEntry[]> {
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
      console.error('Error fetching Hall of Fame entries:', error);
      throw error;
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
  },

  async recordHallOfFameWinner(
    entry: Omit<HallOfFameEntry, 'id' | 'created_at' | 'winner_profile'>
  ): Promise<HallOfFameEntry> {
    // If username/avatar snapshot not provided in entry, fetch from profile
    let winnerUsername = entry.winner_username;
    let winnerAvatarUrl = entry.winner_avatar_url;

    if (!winnerUsername || !winnerAvatarUrl) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', entry.winner_user_id)
        .maybeSingle();

      if (profile) {
        winnerUsername = winnerUsername || profile.display_name;
        winnerAvatarUrl = winnerAvatarUrl || profile.avatar_url;
      }
    }

    const { data, error } = await supabase
      .from('hall_of_fame')
      .upsert(
        {
          ...entry,
          winner_username: winnerUsername,
          winner_avatar_url: winnerAvatarUrl,
        },
        { onConflict: 'arena_id,period_type,period_start' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error recording Hall of Fame winner snapshot:', error);
      throw error;
    }

    return data as HallOfFameEntry;
  },
};
