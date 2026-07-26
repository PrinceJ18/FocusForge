export type PeriodType = 'weekly' | 'monthly';
export type ArenaVisibility = 'private' | 'invite_only' | 'public';

export interface Arena {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_default: boolean;
  visibility: ArenaVisibility;
  created_by?: string | null;
  created_at: string;
}

export interface ArenaMember {
  id: string;
  arena_id: string;
  user_id: string;
  joined_at: string;
  active: boolean;
  deleted_at?: string | null;
}

export interface ArenaScore {
  id: string;
  user_id: string;
  arena_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  arena_score: number;
  rank?: number | null;
  focus_minutes: number;
  tasks_completed: number;
  productivity_score_snapshot: number;
  daily_challenge_points: number;
  created_at: string;
  updated_at: string;
  user_profile?: {
    display_name?: string | null;
    avatar_url?: string | null;
    streak?: number;
    xp?: number;
  };
}
