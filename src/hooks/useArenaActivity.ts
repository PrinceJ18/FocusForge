import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { activityService, ArenaActivity } from '../services/activityService';
import { notificationService } from '../services/notificationService';

export function useArenaActivity(arenaId: string | null) {
  const [activities, setActivities] = useState<ArenaActivity[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchInitial = useCallback(async () => {
    if (!arenaId) {
      setActivities([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, hasMore: more } = await activityService.getActivityFeed(arenaId, 1, 20);
      setActivities(data);
      setHasMore(more);
      setPage(1);

      // We don't trigger notifications on initial bulk load to prevent spam
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [arenaId]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Realtime subscription
  useEffect(() => {
    if (!arenaId) return;

    const channel = supabase
      .channel(`arena_activity_${arenaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'arena_activity', filter: `arena_id=eq.${arenaId}` },
        async (payload) => {
          // Fetch the full enriched record for the new activity (with profile join)
          const { data, error } = await supabase
            .from('arena_activity')
            .select('*, profile:profiles(display_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            const newActivity = data as ArenaActivity;
            
            // Add to feed
            setActivities(prev => {
              // Prevent duplicates
              if (prev.some(a => a.id === newActivity.id)) return prev;
              return [newActivity, ...prev];
            });

            // Process for notifications/celebrations
            notificationService.processIncomingActivities([newActivity]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [arenaId]);

  const loadMore = async () => {
    if (!arenaId || !hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const { data, hasMore: more } = await activityService.getActivityFeed(arenaId, nextPage, 20);
      
      setActivities(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newUniques = data.filter(a => !existingIds.has(a.id));
        return [...prev, ...newUniques];
      });
      setHasMore(more);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more activities:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    activities,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh: fetchInitial
  };
}
