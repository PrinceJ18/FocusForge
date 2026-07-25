import { useState, useEffect, useCallback } from 'react';
import { activityService } from '../services/activityService';
import { ArenaActivity } from '../types/activity';

export function useActivityFeed(limit: number = 30) {
  const [activities, setActivities] = useState<ArenaActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await activityService.getPublicActivityFeed(limit);
      setActivities(data);
    } catch (err: any) {
      console.error('useActivityFeed error:', err);
      setError(err.message || 'Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities,
  };
}
