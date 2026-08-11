export type PeriodType = 'weekly' | 'monthly';

export interface HallOfFameEntry {
  id: string;
  arena_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  winner_user_id: string;
  winner_username?: string | null;
  winner_avatar_url?: string | null;
  arena_score: number;
  created_at: string;
  winner_profile?: {
    display_name?: string | null;
    avatar_url?: string | null;
  };
}
