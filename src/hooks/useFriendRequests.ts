import { useState, useEffect, useCallback } from 'react';
import { friendService } from '../services/friendService';
import { FriendRequest } from '../types/friend';
import { useStore } from '../store/useStore';

export function useFriendRequests() {
  const { user } = useStore();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { incoming, outgoing } = await friendService.getFriendRequests(user.id);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (err: any) {
      console.error('useFriendRequests error:', err);
      setError(err.message || 'Failed to fetch friend requests');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const sendRequest = async (receiverId: string) => {
    if (!user) return;
    try {
      await friendService.sendFriendRequest(user.id, receiverId);
      await fetchRequests();
    } catch (err: any) {
      console.error('sendRequest error:', err);
      setError(err.message || 'Failed to send request');
      throw err;
    }
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await friendService.respondToFriendRequest(requestId, status);
      await fetchRequests();
    } catch (err: any) {
      console.error('respondToRequest error:', err);
      setError(err.message || 'Failed to respond to request');
      throw err;
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await friendService.cancelFriendRequest(requestId);
      await fetchRequests();
    } catch (err: any) {
      console.error('cancelRequest error:', err);
      setError(err.message || 'Failed to cancel request');
      throw err;
    }
  };

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    refresh: fetchRequests,
    sendRequest,
    respondToRequest,
    cancelRequest,
  };
}
