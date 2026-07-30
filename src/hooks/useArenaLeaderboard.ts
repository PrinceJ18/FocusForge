import { useState, useEffect, useCallback } from 'react';
import { arenaService, LeaderboardEntry } from '../services/arenaService';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

export function useArenaLeaderboard(arenaId: string | null, periodType: 'weekly' | 'monthly') {
  const { user } = useStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!arenaId) {
      setLeaderboard([]);
      setCurrentUserRank(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const data = periodType === 'weekly' 
        ? await arenaService.getWeeklyLeaderboard(arenaId)
        : await arenaService.getMonthlyLeaderboard(arenaId);

      setLeaderboard(data);
      
      if (user) {
        setCurrentUserRank(arenaService.getCurrentUserRank(user.id, data));
      }
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [arenaId, periodType, user]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Realtime subscription
  useEffect(() => {
    if (!arenaId) return;

    const channel = supabase
      .channel(`arena_leaderboard_${arenaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arena_scores', filter: `arena_id=eq.${arenaId}` },
        () => {
          fetchLeaderboard();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arena_members', filter: `arena_id=eq.${arenaId}` },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [arenaId, fetchLeaderboard]);

  return {
    leaderboard,
    currentUserRank,
    loading,
    error,
    refresh: fetchLeaderboard
  };
}
