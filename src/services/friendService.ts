import { supabase } from '../lib/supabase';
import { FriendRequest, FriendWithProfile } from '../types/friend';

export const friendService = {
  async sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
    if (senderId === receiverId) {
      throw new Error('Cannot send friend request to yourself');
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .upsert(
        {
          sender_id: senderId,
          receiver_id: receiverId,
          status: 'pending',
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
        { onConflict: 'sender_id,receiver_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
    return data as FriendRequest;
  },

  async respondToFriendRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<FriendRequest> {
    const { data: request, error: fetchErr } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !request) {
      throw new Error('Friend request not found');
    }

    const { data: updatedRequest, error: updateErr } = await supabase
      .from('friend_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateErr) {
      console.error('Error updating friend request:', updateErr);
      throw updateErr;
    }

    if (status === 'accepted') {
      const now = new Date().toISOString();
      // Create or un-soft-delete bi-directional mutual friendship records
      await supabase.from('friends').upsert([
        { user_id: request.sender_id, friend_id: request.receiver_id, created_at: now, deleted_at: null },
        { user_id: request.receiver_id, friend_id: request.sender_id, created_at: now, deleted_at: null },
      ], { onConflict: 'user_id,friend_id' });
    }

    return updatedRequest as FriendRequest;
  },

  async cancelFriendRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('friend_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error cancelling friend request:', error);
      throw error;
    }
  },

  async getFriendRequests(userId: string): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
    const { data: incoming, error: inErr } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .is('deleted_at', null);

    const { data: outgoing, error: outErr } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .is('deleted_at', null);

    const err = inErr || outErr;
    if (err) {
      if (err.code === 'PGRST205' || err.code === '42P01') {
        console.warn('friend_requests table not present in schema cache, returning empty requests.');
        return { incoming: [], outgoing: [] };
      }
      console.error('Error fetching friend requests:', err);
      throw err;
    }

    return {
      incoming: (incoming || []) as FriendRequest[],
      outgoing: (outgoing || []) as FriendRequest[],
    };
  },

  async getFriends(userId: string): Promise<FriendWithProfile[]> {
    const { data, error } = await supabase
      .from('friends')
      .select('*, profiles:friend_id(display_name, avatar_url, level, xp)')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('friends table not present in schema cache, returning empty friends list.');
        return [];
      }
      console.error('Error fetching friends:', error);
      throw error;
    }

    return (data || []).map((f: any) => ({
      id: f.id,
      user_id: f.user_id,
      friend_id: f.friend_id,
      created_at: f.created_at,
      deleted_at: f.deleted_at,
      profile: f.profiles ? {
        display_name: f.profiles.display_name,
        avatar_url: f.profiles.avatar_url,
        level: f.profiles.level,
        xp: f.profiles.xp,
      } : undefined,
    }));
  },

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const now = new Date().toISOString();
    // Soft delete both directional friendship rows
    const { error } = await supabase
      .from('friends')
      .update({ deleted_at: now })
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (error) {
      console.error('Error removing friend (soft delete):', error);
      throw error;
    }
  },

  async searchUsers(query: string, currentUserId: string): Promise<Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    friend_code: string | null;
    level?: number;
    xp?: number;
  }>> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      // 1. Fetch current friends and pending requests to exclude them
      const [friendsRes, requestsRes] = await Promise.all([
        supabase.from('friends').select('friend_id').eq('user_id', currentUserId).is('deleted_at', null),
        supabase.from('friend_requests').select('sender_id, receiver_id').eq('status', 'pending').or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      ]);

      const excludedIds = new Set<string>([currentUserId]);
      
      if (friendsRes.data) {
        friendsRes.data.forEach(f => excludedIds.add(f.friend_id));
      }
      
      if (requestsRes.data) {
        requestsRes.data.forEach(r => {
          excludedIds.add(r.sender_id);
          excludedIds.add(r.receiver_id);
        });
      }

      // 2. Perform search
      const isFriendCodeFormat = /^[a-zA-Z0-9]{7}$/.test(cleanQuery);

      let queryBuilder = supabase
        .from('profiles')
        .select('id, display_name, avatar_url, friend_code, xp')
        .limit(30); // Fetch a bit more to account for exclusions

      if (isFriendCodeFormat) {
        // If it looks like a friend code, search BOTH exact friend_code OR partial display_name
        queryBuilder = queryBuilder.or(`friend_code.ilike.${cleanQuery},display_name.ilike.%${cleanQuery}%`);
      } else {
        // Otherwise, only search display_name
        queryBuilder = queryBuilder.ilike('display_name', `%${cleanQuery}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error searching users:', error);
        throw new Error('Unable to search right now. Please try again.');
      }

      // 3. Filter out excluded IDs and map results
      return (data || [])
        .filter((p: any) => !excludedIds.has(p.id))
        .slice(0, 20) // Ensure we only return max 20
        .map((p: any) => ({
          id: p.id,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          friend_code: p.friend_code,
          xp: p.xp || 0,
          level: Math.floor(Math.sqrt((p.xp || 0) / 100)) + 1,
        }));
    } catch (err) {
      console.error('Search error:', err);
      throw new Error('Unable to search right now. Please try again.');
    }
  },

  async getFriendCode(userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('profiles')
      .select('friend_code')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching friend code:', error);
      return '......';
    }

    return data?.friend_code || '......';
  },

  async getFriendProfilePreview(friendUserId: string): Promise<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    level: number;
    xp: number;
    streak: number;
    focusMinutesThisWeek: number;
    tasksCompletedThisWeek: number;
    arenaScore: number;
  }> {
    // 1. Fetch Profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, xp, streak')
      .eq('id', friendUserId)
      .maybeSingle();

    if (profErr || !profile) {
      throw new Error('Profile not found');
    }

    // Calculate level
    const xp = profile.xp || 0;
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const streak = profile.streak || 0;

    // 2. Fetch Focus Minutes This Week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const { data: sessions } = await supabase
      .from('focus_sessions')
      .select('minutes')
      .eq('user_id', friendUserId)
      .gte('session_date', startOfWeekStr);

    const focusMinutesThisWeek = (sessions || []).reduce((sum, s) => sum + (s.minutes || 0), 0);

    // 3. Fetch Tasks Completed This Week
    const { data: completions } = await supabase
      .from('task_completions')
      .select('id')
      .eq('user_id', friendUserId)
      .eq('completed', true)
      .gte('occurrence_date', startOfWeekStr);

    const tasksCompletedThisWeek = (completions || []).length;

    // 4. Fetch Arena Score from arena_scores
    const { data: arenaScoreData } = await supabase
      .from('arena_scores')
      .select('arena_score')
      .eq('user_id', friendUserId)
      .order('arena_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    const arenaScore = arenaScoreData?.arena_score ? Number(arenaScoreData.arena_score) : Math.round(xp * 1.2 + streak * 50);

    return {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      level,
      xp,
      streak,
      focusMinutesThisWeek,
      tasksCompletedThisWeek,
      arenaScore,
    };
  },
};
