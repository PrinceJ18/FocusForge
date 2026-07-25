import { useState, useEffect, useCallback } from 'react';
import { friendService } from '../services/friendService';
import { FriendWithProfile } from '../types/friend';
import { useStore } from '../store/useStore';

export function useFriends() {
  const { user } = useStore();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await friendService.getFriends(user.id);
      setFriends(data);
    } catch (err: any) {
      console.error('useFriends error:', err);
      setError(err.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const removeFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await friendService.removeFriend(user.id, friendId);
      await fetchFriends();
    } catch (err: any) {
      console.error('removeFriend error:', err);
      setError(err.message || 'Failed to remove friend');
      throw err;
    }
  };

  return {
    friends,
    loading,
    error,
    refresh: fetchFriends,
    removeFriend,
  };
}
