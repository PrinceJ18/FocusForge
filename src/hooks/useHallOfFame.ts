import { useState, useEffect, useCallback } from 'react';
import { championService, HallOfFameEntry } from '../services/championService';

export function useHallOfFame(arenaId: string | null, periodType: 'weekly' | 'monthly') {
  const [latestChampion, setLatestChampion] = useState<HallOfFameEntry | null>(null);
  const [history, setHistory] = useState<HallOfFameEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!arenaId) {
      setLatestChampion(null);
      setHistory([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch Latest Champion
      const latest = await championService.getLatestChampion(arenaId, periodType);
      setLatestChampion(latest);

      // Fetch Page 1 of History
      const { data, hasMore: more } = await championService.getHallOfFame(arenaId, periodType, 1, 10);
      setHistory(data);
      setHasMore(more);
      setPage(1);
    } catch (err: any) {
      console.error('Error fetching hall of fame:', err);
      setError(err.message || 'Failed to load hall of fame');
    } finally {
      setLoading(false);
    }
  }, [arenaId, periodType]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const loadMore = async () => {
    if (!arenaId || !hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const { data, hasMore: more } = await championService.getHallOfFame(arenaId, periodType, nextPage, 10);
      
      setHistory(prev => [...prev, ...data]);
      setHasMore(more);
      setPage(nextPage);
    } catch (err: any) {
      console.error('Error loading more history:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    latestChampion,
    history,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh: fetchInitial
  };
}
