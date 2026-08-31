import { useSyncExternalStore, useEffect, useRef } from 'react';
import { useStore, loadUserData } from '../store/useStore';

// ============================================================
// useOnlineStatus — Lightweight offline detection hook
// ============================================================
// Uses the browser's navigator.onLine + online/offline events.
// When connection returns after being offline, triggers a
// lightweight data refresh via loadUserData().
//
// Uses useSyncExternalStore for tear-free reads of the
// browser's online state — the recommended React 18 pattern
// for subscribing to external browser APIs.
//
// No polling. No intervals. Event-driven only.
// ============================================================

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  // During SSR, assume online
  return true;
}

/**
 * Returns `true` when the browser has network connectivity.
 *
 * When connection is restored after being offline, automatically
 * re-syncs user data from Supabase (if authenticated).
 */
export function useOnlineStatus(): boolean {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const wasOffline = useRef(false);
  const user = useStore(s => s.user);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    // Connection restored — re-sync if we were previously offline
    if (wasOffline.current && user?.id) {
      wasOffline.current = false;
      loadUserData(user.id).catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[useOnlineStatus] Re-sync after reconnect failed:', err);
        }
      });
    }
  }, [isOnline, user?.id]);

  return isOnline;
}
