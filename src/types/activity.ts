export type ActivityType = 'level_up' | 'personal_best' | 'daily_challenge' | 'streak' | 'badge';

export interface ActivityMetadata {
  level?: number;
  badge_name?: string;
  badge_icon?: string;
  streak_days?: number;
  score_achieved?: number;
  arena_score?: number;
  challenge_points?: number;
  rank?: number;
  period?: string;
}

export interface ArenaActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  metadata: ActivityMetadata;
  created_at: string;
  user_profile?: {
    display_name?: string | null;
    avatar_url?: string | null;
  };
}
