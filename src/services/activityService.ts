import { supabase } from '../lib/supabase';

export type ActivityType = 
  | 'focus_session_completed'
  | 'task_completed'
  | 'daily_challenge_completed'
  | 'level_up'
  | 'arena_created'
  | 'friend_joined'
  | 'member_removed'
  | 'member_left'
  | 'owner_transferred'
  | 'arena_score_updated'
  | 'weekly_champion'
  | 'monthly_champion'
  | 'streak_milestone';

export interface ArenaActivity {
  id: string;
  arena_id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const activityService = {
  async logActivity(
    arenaId: string,
    userId: string,
    type: ActivityType,
    title: string,
    description: string | null = null,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (metadata?.dedupe_key) {
      const { data: existing } = await supabase
        .from('arena_activity')
        .select('id')
        .eq('arena_id', arenaId)
        .eq('user_id', userId)
        .eq('activity_type', type)
        .contains('metadata', { dedupe_key: metadata.dedupe_key })
        .maybeSingle();

      if (existing) return;
    }

    const { error } = await supabase
      .from('arena_activity')
      .insert({
        arena_id: arenaId,
        user_id: userId,
        activity_type: type,
        title,
        description,
        metadata,
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  },

  async getActivityFeed(
    arenaId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: ArenaActivity[], hasMore: boolean }> {
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit - 1;

    const { data: activities, error, count } = await supabase
      .from('arena_activity')
      .select('*', { count: 'exact' })
      .eq('arena_id', arenaId)
      .order('created_at', { ascending: false })
      .range(startIdx, endIdx);

    if (error) {
      console.error('Error fetching activity feed:', error);
      return { data: [], hasMore: false };
    }

    const userIds = Array.from(new Set((activities || []).map(a => a.user_id)));
    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      (profiles || []).forEach(p => profileMap.set(p.id, p));
    }

    const enriched = (activities || []).map(a => ({
      ...a,
      profile: profileMap.get(a.user_id) || { display_name: null, avatar_url: null }
    }));

    const hasMore = count ? startIdx + limit < count : false;
    return { data: enriched as ArenaActivity[], hasMore };
  },

  async getRecentActivities(arenaId: string, limit: number = 10): Promise<ArenaActivity[]> {
    const { data } = await this.getActivityFeed(arenaId, 1, limit);
    return data;
  },

  async deleteOldActivities(arenaId: string): Promise<void> {
    // Keep only the latest 500 records per arena
    try {
      const { data: latestIds, error: fetchErr } = await supabase
        .from('arena_activity')
        .select('id')
        .eq('arena_id', arenaId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (fetchErr || !latestIds || latestIds.length < 500) return;

      const idsToKeep = latestIds.map(row => row.id);

      const { error: deleteErr } = await supabase
        .from('arena_activity')
        .delete()
        .eq('arena_id', arenaId)
        .not('id', 'in', `(${idsToKeep.join(',')})`);

      if (deleteErr) {
        console.error('Error pruning old activities:', deleteErr);
      }
    } catch (err) {
      console.error('Failed to prune old activities', err);
    }
  }
};
