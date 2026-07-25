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

    if (inErr || outErr) {
      console.error('Error fetching friend requests:', inErr || outErr);
      throw inErr || outErr;
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
};
