import { supabase } from '../lib/supabase';
import { startOfWeek, startOfMonth, format } from 'date-fns';

export interface Arena {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  visibility: 'private' | 'friends_only';
  created_at: string;
  updated_at: string;
}

export interface ArenaMember {
  id: string;
  arena_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
}

export interface ArenaScore {
  id: string;
  arena_id: string;
  user_id: string;
  focus_points: number;
  task_points: number;
  challenge_points: number;
  streak_bonus: number;
  total_score: number;
  last_calculated_at: string;
  period_type: 'weekly' | 'monthly';
  period_start: string;
}

export interface LeaderboardEntry extends ArenaScore {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    level: number;
  };
}

export const arenaService = {
  async createArena(
    userId: string,
    name: string,
    description: string | null,
    visibility: 'private' | 'friends_only' = 'friends_only'
  ): Promise<Arena> {
    // 1. Create Arena
    const { data: arena, error: arenaErr } = await supabase
      .from('arenas')
      .insert({
        name,
        description,
        owner_id: userId,
        visibility
      })
      .select()
      .single();

    if (arenaErr || !arena) {
      console.error('Error creating arena:', arenaErr);
      throw new Error('Failed to create arena');
    }

    // 2. Fetch friends to auto-join
    const { data: friends, error: friendsErr } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    const memberIds = new Set<string>([userId]);
    if (!friendsErr && friends) {
      friends.forEach((f: any) => {
        memberIds.add(f.user_id);
        memberIds.add(f.friend_id);
      });
    }

    // 3. Insert members
    const membersToInsert = Array.from(memberIds).map(id => ({
      arena_id: arena.id,
      user_id: id,
    }));

    const { error: membersErr } = await supabase
      .from('arena_members')
      .insert(membersToInsert);

    if (membersErr) {
      console.error('Error auto-adding friends to arena:', membersErr);
    }

    return arena as Arena;
  },

  async getArena(arenaId: string): Promise<Arena | null> {
    const { data, error } = await supabase
      .from('arenas')
      .select('*')
      .eq('id', arenaId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching arena:', error);
      throw error;
    }
    return data as Arena | null;
  },

  async getArenaMembers(arenaId: string): Promise<ArenaMember[]> {
    const { data, error } = await supabase
      .from('arena_members')
      .select('*')
      .eq('arena_id', arenaId)
      .is('left_at', null);

    if (error) {
      console.error('Error fetching arena members:', error);
      throw error;
    }
    return (data || []) as ArenaMember[];
  },

  async joinArena(arenaId: string, userId: string): Promise<ArenaMember> {
    const { data, error } = await supabase
      .from('arena_members')
      .upsert(
        {
          arena_id: arenaId,
          user_id: userId,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        { onConflict: 'arena_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error joining arena:', error);
      throw error;
    }
    return data as ArenaMember;
  },

  async leaveArena(arenaId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('arena_members')
      .update({ left_at: new Date().toISOString() })
      .eq('arena_id', arenaId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error leaving arena:', error);
      throw error;
    }
  },

  calculateArenaScore(metrics: {
    focusMinutes: number;
    tasksCompleted: number;
    dailyChallengesCompleted: number;
    streak: number;
  }) {
    return {
      focus_points: metrics.focusMinutes * 1,
      task_points: metrics.tasksCompleted * 25,
      challenge_points: metrics.dailyChallengesCompleted * 40,
      streak_bonus: metrics.streak * 5,
    };
  },

  async refreshArenaScores(arenaId: string): Promise<void> {
    const members = await this.getArenaMembers(arenaId);
    if (!members.length) return;

    const today = new Date();
    const weeklyStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthlyStart = format(startOfMonth(today), 'yyyy-MM-dd');

    const scoresToUpsert: Partial<ArenaScore>[] = [];

    // For foundation demonstration, upserting initial values for both periods
    members.forEach(m => {
      const points = this.calculateArenaScore({
        focusMinutes: 0,
        tasksCompleted: 0,
        dailyChallengesCompleted: 0,
        streak: 0,
      });

      const baseScore = {
        arena_id: arenaId,
        user_id: m.user_id,
        focus_points: points.focus_points,
        task_points: points.task_points,
        challenge_points: points.challenge_points,
        streak_bonus: points.streak_bonus,
        last_calculated_at: new Date().toISOString(),
      };

      scoresToUpsert.push({ ...baseScore, period_type: 'weekly', period_start: weeklyStart });
      scoresToUpsert.push({ ...baseScore, period_type: 'monthly', period_start: monthlyStart });
    });

    const { error } = await supabase
      .from('arena_scores')
      .upsert(scoresToUpsert, { onConflict: 'arena_id,user_id,period_type,period_start' });

    if (error) {
      console.error('Error refreshing arena scores:', error);
      throw error;
    }
  },

  async getWeeklyLeaderboard(arenaId: string): Promise<LeaderboardEntry[]> {
    const today = new Date();
    const weeklyStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return this.getLeaderboard(arenaId, 'weekly', weeklyStart);
  },

  async getMonthlyLeaderboard(arenaId: string): Promise<LeaderboardEntry[]> {
    const today = new Date();
    const monthlyStart = format(startOfMonth(today), 'yyyy-MM-dd');
    return this.getLeaderboard(arenaId, 'monthly', monthlyStart);
  },

  async getLeaderboard(arenaId: string, periodType: 'weekly' | 'monthly', periodStart: string): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('arena_scores')
      .select(`
        *,
        profile:profiles(display_name, avatar_url, level)
      `)
      .eq('arena_id', arenaId)
      .eq('period_type', periodType)
      .eq('period_start', periodStart)
      .order('total_score', { ascending: false })
      .order('focus_points', { ascending: false })
      .order('task_points', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }

    // Tie-breaker 3: joined_at ASC. We fetch members to perform this final tie-break
    // PostgREST doesn't support complex JOIN ordering natively without RPC, so we do minor sort in memory
    const members = await this.getArenaMembers(arenaId);
    const joinMap = new Map(members.map(m => [m.user_id, new Date(m.joined_at).getTime()]));

    const sortedData = (data as any[]).sort((a, b) => {
      if (a.total_score !== b.total_score) return b.total_score - a.total_score;
      if (a.focus_points !== b.focus_points) return b.focus_points - a.focus_points;
      if (a.task_points !== b.task_points) return b.task_points - a.task_points;
      
      const timeA = joinMap.get(a.user_id) || Number.MAX_SAFE_INTEGER;
      const timeB = joinMap.get(b.user_id) || Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });

    return sortedData as LeaderboardEntry[];
  },

  getCurrentUserRank(userId: string, leaderboard: LeaderboardEntry[]): number | null {
    const index = leaderboard.findIndex(entry => entry.user_id === userId);
    if (index === -1) return null;
    return index + 1;
  }
};
