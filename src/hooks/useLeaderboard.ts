import { useState, useEffect, useCallback } from 'react';
import { leaderboardService } from '../services/leaderboardService';
import { ArenaScore, PeriodType } from '../types/arena';
import { useStore } from '../store/useStore';

export function useLeaderboard(
  arenaId: string | undefined,
  periodType: PeriodType = 'weekly',
  periodStart: string
) {
  const { user } = useStore();
  const [leaderboard, setLeaderboard] = useState<ArenaScore[]>([]);
  const [userScore, setUserScore] = useState<ArenaScore | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!arenaId || !periodStart) {
      setLeaderboard([]);
      setUserScore(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const scores = await leaderboardService.getLeaderboard(arenaId, periodType, periodStart);
      setLeaderboard(scores);

      if (user) {
        const uScore = await leaderboardService.getUserArenaScore(user.id, arenaId, periodType, periodStart);
        setUserScore(uScore);
      }
    } catch (err: any) {
      console.error('useLeaderboard error:', err);
      setError(err.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, [arenaId, periodType, periodStart, user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    userScore,
    loading,
    error,
    refresh: fetchLeaderboard,
  };
}
