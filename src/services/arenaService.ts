import { supabase } from '../lib/supabase';
import { startOfWeek, startOfMonth, format } from 'date-fns';
import { friendService } from './friendService';

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

/**
 * Helper: Check if user is already in an active arena.
 * Returns the arena_id if so, null otherwise.
 */
async function getActiveArenaId(userId: string): Promise<string | null> {
  const payload = { user_id: userId, left_at: null };
  const res = await supabase
    .from('arena_members')
    .select('arena_id')
    .eq('user_id', userId)
    .is('left_at', null)
    .limit(1)
    .maybeSingle();

  if (import.meta.env.DEV) {
    console.group('Arena Step: Check Active Arena');
    console.log({
      payload,
      data: res.data,
      error: res.error,
      code: res.error?.code,
      message: res.error?.message,
      details: res.error?.details,
      hint: res.error?.hint,
      status: res.status,
    });
    console.groupEnd();
  }

  return res.data?.arena_id ?? null;
}

export const arenaService = {
  async createArena(
    userId: string,
    name: string,
    description: string | null,
    visibility: 'private' | 'friends_only' = 'friends_only'
  ): Promise<Arena> {
    // Step 0: One Arena enforcement
    const existingArenaId = await getActiveArenaId(userId);
    if (existingArenaId) {
      throw new Error('You already belong to an active arena. Leave your current arena first.');
    }

    // Step 1 & 2: Create Arena & Select created arena
    const arenaPayload = {
      name,
      description,
      owner_id: userId,
      visibility,
    };

    const arenaRes = await supabase
      .from('arenas')
      .insert(arenaPayload)
      .select()
      .single();

    if (import.meta.env.DEV) {
      console.group('Arena Step 1 & 2: Create Arena & Select Created Arena');
      console.log({
        payload: arenaPayload,
        data: arenaRes.data,
        error: arenaRes.error,
        code: arenaRes.error?.code,
        message: arenaRes.error?.message,
        details: arenaRes.error?.details,
        hint: arenaRes.error?.hint,
        status: arenaRes.status,
      });
      console.groupEnd();
    }

    if (arenaRes.error || !arenaRes.data) {
      console.error('[ArenaService] Step 1/2 Failed (Create/Select Arena):', arenaRes.error);
      const detail = arenaRes.error?.message || 'Database insert rejected.';
      throw new Error(`Unable to create arena (Step 1: Create Arena - ${detail})`);
    }

    const arena = arenaRes.data as Arena;

    // Fetch accepted friends to auto-join (skip those already in an arena)
    let memberIds = new Set<string>([userId]);
    try {
      const friends = await friendService.getFriends(userId);
      for (const f of friends) {
        const friendId = f.user_id !== userId ? f.user_id : f.friend_id;
        const friendArena = await getActiveArenaId(friendId);
        if (!friendArena) {
          memberIds.add(friendId);
        }
      }
    } catch (err) {
      console.error('Error fetching friends for arena auto-join:', err);
    }

    // Step 3: Insert owner into arena_members (along with auto-joined friends)
    const membersToInsert = Array.from(memberIds).map(id => ({
      arena_id: arena.id,
      user_id: id,
    }));

    const membersRes = await supabase
      .from('arena_members')
      .insert(membersToInsert);

    if (import.meta.env.DEV) {
      console.group('Arena Step 3: Insert Owner & Members into arena_members');
      console.log({
        payload: membersToInsert,
        data: membersRes.data,
        error: membersRes.error,
        code: membersRes.error?.code,
        message: membersRes.error?.message,
        details: membersRes.error?.details,
        hint: membersRes.error?.hint,
        status: membersRes.status,
      });
      console.groupEnd();
    }

    if (membersRes.error) {
      console.error('[ArenaService] Step 3 Failed (Insert arena_members):', membersRes.error);
      const detail = membersRes.error?.message || 'Member assignment rejected.';
      throw new Error(`Unable to create arena (Step 3: Insert Members - ${detail})`);
    }

    // Step 4: Insert weekly arena_scores
    const today = new Date();
    const weeklyStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthlyStart = format(startOfMonth(today), 'yyyy-MM-dd');

    const weeklyScoresToInsert = Array.from(memberIds).map(id => ({
      arena_id: arena.id,
      user_id: id,
      focus_points: 0,
      task_points: 0,
      challenge_points: 0,
      streak_bonus: 0,
      last_calculated_at: new Date().toISOString(),
      period_type: 'weekly' as const,
      period_start: weeklyStart,
    }));

    const weeklyScoresRes = await supabase
      .from('arena_scores')
      .insert(weeklyScoresToInsert);

    if (import.meta.env.DEV) {
      console.group('Arena Step 4: Insert Weekly arena_scores');
      console.log({
        payload: weeklyScoresToInsert,
        data: weeklyScoresRes.data,
        error: weeklyScoresRes.error,
        code: weeklyScoresRes.error?.code,
        message: weeklyScoresRes.error?.message,
        details: weeklyScoresRes.error?.details,
        hint: weeklyScoresRes.error?.hint,
        status: weeklyScoresRes.status,
      });
      console.groupEnd();
    }

    if (weeklyScoresRes.error) {
      console.error('[ArenaService] Step 4 Failed (Insert Weekly arena_scores):', weeklyScoresRes.error);
      const detail = weeklyScoresRes.error?.message || 'Weekly score initialization failed.';
      throw new Error(`Unable to create arena (Step 4: Weekly Scores - ${detail})`);
    }

    // Step 5: Insert monthly arena_scores
    const monthlyScoresToInsert = Array.from(memberIds).map(id => ({
      arena_id: arena.id,
      user_id: id,
      focus_points: 0,
      task_points: 0,
      challenge_points: 0,
      streak_bonus: 0,
      last_calculated_at: new Date().toISOString(),
      period_type: 'monthly' as const,
      period_start: monthlyStart,
    }));

    const monthlyScoresRes = await supabase
      .from('arena_scores')
      .insert(monthlyScoresToInsert);

    if (import.meta.env.DEV) {
      console.group('Arena Step 5: Insert Monthly arena_scores');
      console.log({
        payload: monthlyScoresToInsert,
        data: monthlyScoresRes.data,
        error: monthlyScoresRes.error,
        code: monthlyScoresRes.error?.code,
        message: monthlyScoresRes.error?.message,
        details: monthlyScoresRes.error?.details,
        hint: monthlyScoresRes.error?.hint,
        status: monthlyScoresRes.status,
      });
      console.groupEnd();
    }

    if (monthlyScoresRes.error) {
      console.error('[ArenaService] Step 5 Failed (Insert Monthly arena_scores):', monthlyScoresRes.error);
      const detail = monthlyScoresRes.error?.message || 'Monthly score initialization failed.';
      throw new Error(`Unable to create arena (Step 5: Monthly Scores - ${detail})`);
    }

    // Step 6: Insert arena_activity
    const activityPayload = {
      arena_id: arena.id,
      user_id: userId,
      activity_type: 'arena_created',
      title: 'Created this Arena',
      description: `${name} is now live!`,
      metadata: { dedupe_key: `arena_created_${arena.id}` },
    };

    const activityRes = await supabase
      .from('arena_activity')
      .insert(activityPayload);

    if (import.meta.env.DEV) {
      console.group('Arena Step 6: Insert arena_activity');
      console.log({
        payload: activityPayload,
        data: activityRes.data,
        error: activityRes.error,
        code: activityRes.error?.code,
        message: activityRes.error?.message,
        details: activityRes.error?.details,
        hint: activityRes.error?.hint,
        status: activityRes.status,
      });
      console.groupEnd();
    }

    if (activityRes.error) {
      // Non-fatal or fatal logging
      console.warn('[ArenaService] Step 6 Notice (Insert arena_activity):', activityRes.error);
    }

    // Step 7: Final Return
    if (import.meta.env.DEV) {
      console.group('Arena Step 7: Final Return');
      console.log({ arena });
      console.groupEnd();
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
      throw new Error('Unable to load arena details. Please try again.');
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
      throw new Error('Unable to load arena members. Please try again.');
    }
    return (data || []) as ArenaMember[];
  },

  async joinArena(arenaId: string, userId: string): Promise<ArenaMember> {
    // One Arena enforcement
    const existingArenaId = await getActiveArenaId(userId);
    if (existingArenaId && existingArenaId !== arenaId) {
      throw new Error('You already belong to an active arena. Leave your current arena first.');
    }

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
      throw new Error('Unable to join arena. Please try again.');
    }
    return data as ArenaMember;
  },

  async leaveArena(arenaId: string, userId: string): Promise<void> {
    // Prevent the owner from leaving without transferring ownership
    const arena = await this.getArena(arenaId);
    if (arena && arena.owner_id === userId) {
      throw new Error('Transfer ownership before leaving your arena.');
    }

    const { error } = await supabase
      .from('arena_members')
      .update({ left_at: new Date().toISOString() })
      .eq('arena_id', arenaId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error leaving arena:', error);
      throw new Error('Unable to leave arena. Please try again.');
    }
  },

  async removeMember(arenaId: string, ownerId: string, targetUserId: string): Promise<void> {
    // Validate caller is owner
    const arena = await this.getArena(arenaId);
    if (!arena || arena.owner_id !== ownerId) {
      throw new Error('Only the arena owner can remove members.');
    }
    if (targetUserId === ownerId) {
      throw new Error('You cannot remove yourself. Use "Leave Arena" instead.');
    }

    const { error } = await supabase
      .from('arena_members')
      .update({ left_at: new Date().toISOString() })
      .eq('arena_id', arenaId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error removing member:', error);
      throw new Error('Unable to remove member. Please try again.');
    }
  },

  async transferOwnership(arenaId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    // Validate current owner
    const arena = await this.getArena(arenaId);
    if (!arena || arena.owner_id !== currentOwnerId) {
      throw new Error('Only the current owner can transfer ownership.');
    }

    // Validate new owner is an active member
    const members = await this.getArenaMembers(arenaId);
    const isActiveMember = members.some(m => m.user_id === newOwnerId);
    if (!isActiveMember) {
      throw new Error('The new owner must be an active member of this arena.');
    }

    const { error } = await supabase
      .from('arenas')
      .update({ owner_id: newOwnerId })
      .eq('id', arenaId);

    if (error) {
      console.error('Error transferring ownership:', error);
      throw new Error('Unable to transfer ownership. Please try again.');
    }
  },

  async deleteArena(arenaId: string, ownerId: string): Promise<void> {
    // Validate caller is owner
    const arena = await this.getArena(arenaId);
    if (!arena || arena.owner_id !== ownerId) {
      throw new Error('Only the arena owner can delete this arena.');
    }

    const { error } = await supabase
      .from('arenas')
      .delete()
      .eq('id', arenaId);

    if (error) {
      console.error('Error deleting arena:', error);
      throw new Error('Unable to delete arena. Please try again.');
    }
  },

  async inviteFriends(arenaId: string, userIds: string[]): Promise<number> {
    if (!userIds.length) return 0;

    // 1. Get existing members to prevent duplicates
    const existingMembers = await this.getArenaMembers(arenaId);
    const existingSet = new Set(existingMembers.map(m => m.user_id));

    // 2. Filter out users already in this arena AND users already in another arena
    const eligibleIds: string[] = [];
    for (const id of userIds) {
      if (existingSet.has(id)) continue;
      const otherArena = await getActiveArenaId(id);
      if (!otherArena) {
        eligibleIds.push(id);
      }
    }
    if (!eligibleIds.length) return 0;

    // 3. Insert new arena_members
    const membersToInsert = eligibleIds.map(id => ({
      arena_id: arenaId,
      user_id: id,
    }));

    const { error: membersErr } = await supabase
      .from('arena_members')
      .insert(membersToInsert);

    if (membersErr) {
      console.error('Error inviting friends to arena:', membersErr);
      throw new Error('Unable to invite friends. Please try again.');
    }

    // 4. Initialize arena_scores for new members (weekly + monthly)
    const today = new Date();
    const weeklyStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthlyStart = format(startOfMonth(today), 'yyyy-MM-dd');

    const scoresToInsert = eligibleIds.flatMap(userId => [
      {
        arena_id: arenaId,
        user_id: userId,
        focus_points: 0,
        task_points: 0,
        challenge_points: 0,
        streak_bonus: 0,
        last_calculated_at: new Date().toISOString(),
        period_type: 'weekly' as const,
        period_start: weeklyStart,
      },
      {
        arena_id: arenaId,
        user_id: userId,
        focus_points: 0,
        task_points: 0,
        challenge_points: 0,
        streak_bonus: 0,
        last_calculated_at: new Date().toISOString(),
        period_type: 'monthly' as const,
        period_start: monthlyStart,
      },
    ]);

    const { error: scoresErr } = await supabase
      .from('arena_scores')
      .upsert(scoresToInsert, { onConflict: 'arena_id,user_id,period_type,period_start' });

    if (scoresErr) {
      console.error('Error initializing scores for invited friends:', scoresErr);
      // Non-fatal — members are already added
    }

    return eligibleIds.length;
  },


  calculateArenaScore(metrics: {
    productivityScore: number;
    focusMinutes: number;
    focusGoal: number;
    tasksCompleted: number;
    totalTasks: number;
    dailyChallengesCompleted: number;
  }) {
    // 45% Productivity Score (max 4500)
    const streak_bonus = Math.round((metrics.productivityScore / 100) * 4500);

    // 25% Focus (max 2500)
    const focusGoal = Math.max(1, metrics.focusGoal);
    const focusRatio = Math.min(1, metrics.focusMinutes / focusGoal);
    const focus_points = Math.round(focusRatio * 2500);

    // 20% Tasks (max 2000)
    const totalTasks = Math.max(1, metrics.totalTasks);
    const taskRatio = Math.min(1, metrics.tasksCompleted / totalTasks);
    const task_points = Math.round(taskRatio * 2000);

    // 10% Daily Challenge (max 1000, assuming 7 per week)
    const challengeRatio = Math.min(1, metrics.dailyChallengesCompleted / 7);
    const challenge_points = Math.round(challengeRatio * 1000);

    return {
      streak_bonus,
      focus_points,
      task_points,
      challenge_points,
    };
  },

  async refreshArenaScores(arenaId: string): Promise<void> {
    const members = await this.getArenaMembers(arenaId);
    if (!members.length) return;

    const today = new Date();
    const weeklyStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthlyStart = format(startOfMonth(today), 'yyyy-MM-dd');

    const scoresToUpsert: Partial<ArenaScore>[] = [];

    members.forEach(m => {
      const points = this.calculateArenaScore({
        productivityScore: 0,
        focusMinutes: 0,
        focusGoal: 120,
        tasksCompleted: 0,
        totalTasks: 1,
        dailyChallengesCompleted: 0,
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
      throw new Error('Unable to refresh scores. Please try again.');
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
    const { data: scores, error } = await supabase
      .from('arena_scores')
      .select('*')
      .eq('arena_id', arenaId)
      .eq('period_type', periodType)
      .eq('period_start', periodStart)
      .order('total_score', { ascending: false })
      .order('focus_points', { ascending: false })
      .order('task_points', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw new Error('Unable to load leaderboard. Please try again.');
    }

    const userIds = Array.from(new Set((scores || []).map(s => s.user_id)));
    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; level: number }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, level')
        .in('id', userIds);
      (profiles || []).forEach(p => profileMap.set(p.id, p));
    }

    const data = (scores || []).map(s => ({
      ...s,
      profile: profileMap.get(s.user_id) || { display_name: null, avatar_url: null, level: 1 }
    }));

    // Tie-breaker 3: joined_at ASC via in-memory sort
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
