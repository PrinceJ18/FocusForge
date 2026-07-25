import { supabase } from '../lib/supabase';
import { ArenaActivity, ActivityType, ActivityMetadata } from '../types/activity';

const ALLOWED_METADATA_KEYS = new Set([
  'level',
  'badge_name',
  'badge_icon',
  'streak_days',
  'score_achieved',
  'arena_score',
  'challenge_points',
  'rank',
  'period',
]);

function sanitizeActivityMetadata(metadata: ActivityMetadata): ActivityMetadata {
  const sanitized: ActivityMetadata = {};
  if (!metadata || typeof metadata !== 'object') return sanitized;

  if (typeof metadata.level === 'number') sanitized.level = metadata.level;
  if (typeof metadata.badge_name === 'string') sanitized.badge_name = metadata.badge_name;
  if (typeof metadata.badge_icon === 'string') sanitized.badge_icon = metadata.badge_icon;
  if (typeof metadata.streak_days === 'number') sanitized.streak_days = metadata.streak_days;
  if (typeof metadata.score_achieved === 'number') sanitized.score_achieved = metadata.score_achieved;
  if (typeof metadata.arena_score === 'number') sanitized.arena_score = metadata.arena_score;
  if (typeof metadata.challenge_points === 'number') sanitized.challenge_points = metadata.challenge_points;
  if (typeof metadata.rank === 'number') sanitized.rank = metadata.rank;
  if (typeof metadata.period === 'string') sanitized.period = metadata.period;

  return sanitized;
}

export const activityService = {
  async getPublicActivityFeed(limit: number = 30): Promise<ArenaActivity[]> {
    const { data, error } = await supabase
      .from('arena_activity')
      .select('*, profiles:user_id(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching public arena activity feed:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      activity_type: item.activity_type as ActivityType,
      metadata: item.metadata || {},
      created_at: item.created_at,
      user_profile: item.profiles ? {
        display_name: item.profiles.display_name,
        avatar_url: item.profiles.avatar_url,
      } : undefined,
    }));
  },

  async logArenaActivity(
    userId: string,
    activityType: ActivityType,
    metadata: ActivityMetadata = {}
  ): Promise<ArenaActivity> {
    const cleanMetadata = sanitizeActivityMetadata(metadata);

    const { data, error } = await supabase
      .from('arena_activity')
      .insert({
        user_id: userId,
        activity_type: activityType,
        metadata: cleanMetadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging arena activity:', error);
      throw error;
    }

    return data as ArenaActivity;
  },
};
