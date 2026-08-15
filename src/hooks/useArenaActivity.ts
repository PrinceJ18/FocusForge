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

  // Realtime subscription with exponential backoff
  useEffect(() => {
    if (!arenaId) return;

    let retryTimeout: ReturnType<typeof setTimeout>;
    let retryCount = 0;
    const maxRetries = 5;
    const baseDelay = 1000;
    
    let channel: any = null;

    const setupSubscription = () => {
      channel = supabase
        .channel(`arena_activity_${arenaId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'arena_activity', filter: `arena_id=eq.${arenaId}` },
          async (payload) => {
            const { data: actData, error: actErr } = await supabase
              .from('arena_activity')
              .select('*')
              .eq('id', payload.new.id)
              .single();

            if (!actErr && actData) {
              let profileData = null;
              if (actData.user_id) {
                const { data: prof } = await supabase
                  .from('profiles')
                  .select('display_name, avatar_url')
                  .eq('id', actData.user_id)
                  .maybeSingle();
                profileData = prof;
              }

              const newActivity: ArenaActivity = {
                ...actData,
                profile: profileData || { display_name: null, avatar_url: null },
              } as ArenaActivity;

              setActivities(prev => {
                if (prev.some(a => a.id === newActivity.id)) return prev;
                return [newActivity, ...prev];
              });
              notificationService.processIncomingActivities([newActivity]);
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0; // Reset on success
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            if (retryCount < maxRetries) {
              const delay = baseDelay * Math.pow(2, retryCount);
              console.warn(`Realtime disconnected. Retrying in ${delay}ms (Attempt ${retryCount + 1}/${maxRetries})`);
              retryTimeout = setTimeout(() => {
                retryCount++;
                setupSubscription();
              }, delay);
            } else {
              console.error('Realtime subscription failed after maximum retries.');
            }
          }
        });
    };

    setupSubscription();

    return () => {
      clearTimeout(retryTimeout);
      if (channel) {
        supabase.removeChannel(channel);
      }
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
