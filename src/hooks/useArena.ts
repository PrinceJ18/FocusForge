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

      // const arena = await arenaService.getDefaultArena();
      // setDefaultArena(arena);

      // if (user && arena) {
      //   const userJoinedArenas = await arenaService.getUserArenas(user.id);
      //   setUserArenas(userJoinedArenas);
      //   setIsMemberOfDefault(userJoinedArenas.some((a) => a.id === arena.id));
      // }
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
