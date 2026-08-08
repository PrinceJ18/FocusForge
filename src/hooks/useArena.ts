import { useState, useEffect, useCallback } from 'react';
import { arenaService } from '../services/arenaService';
import { Arena } from '../types/arena';
import { useStore } from '../store/useStore';

export function useArena() {
  const { user } = useStore();
  const [defaultArena, setDefaultArena] = useState<Arena | null>(null);
  const [userArenas, setUserArenas] = useState<Arena[]>([]);
  const [isMemberOfDefault, setIsMemberOfDefault] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArenaInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (user) {
        const { supabase } = await import('../lib/supabase');
        const { data } = await supabase
          .from('arena_members')
          .select('arena_id, arenas(*)')
          .eq('user_id', user.id)
          .is('left_at', null)
          .limit(1)
          .maybeSingle();

        if (data && data.arenas) {
          setDefaultArena(data.arenas as any);
          setIsMemberOfDefault(true);
          setUserArenas([data.arenas as any]);
        } else {
          setDefaultArena(null);
          setIsMemberOfDefault(false);
          setUserArenas([]);
        }
      }
    } catch (err: any) {
      console.error('useArena error:', err);
      setError(err.message || 'Failed to load arena details');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchArenaInfo();
  }, [fetchArenaInfo]);

  const joinDefaultArena = async () => {
    if (!user || !defaultArena) return;
    try {
      setLoading(true);
      await arenaService.joinArena(defaultArena.id, user.id);
      await fetchArenaInfo();
    } catch (err: any) {
      console.error('joinDefaultArena error:', err);
      setError(err.message || 'Failed to join arena');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    defaultArena,
    userArenas,
    isMemberOfDefault,
    loading,
    error,
    refresh: fetchArenaInfo,
    joinDefaultArena,
  };
}
