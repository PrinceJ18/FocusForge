/**
 * Coach Engine — In-Memory High-Performance Cache Layer (Phase 3.9.6)
 *
 * Provides a fast, deterministic, in-memory caching engine with:
 * - TTL-based entry expiration
 * - Schema versioning support
 * - Hash-based deterministic key generation
 * - Telemetry & hit/miss statistics
 * - Zero persistence / zero localStorage dependency
 *
 * @module coach/coachCache
 */

import { COACH_INFRASTRUCTURE } from './coachConstants';

export interface CacheEntry<T> {
  readonly value: T;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly version: string;
}

export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly size: number;
  readonly hitRate: number; // 0.0 to 1.0
}

export interface CoachCacheInstance {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, value: T, ttlMs?: number) => void;
  has: (key: string) => boolean;
  invalidate: (key: string) => boolean;
  invalidateAll: () => void;
  generateKey: (namespace: string, payload: unknown) => string;
  size: () => number;
  getStats: () => CacheStats;
  resetStats: () => void;
}

/**
 * Creates a standalone in-memory cache instance.
 */
export function createCoachCache(defaultTtlMs = COACH_INFRASTRUCTURE.DEFAULT_CACHE_TTL_MS): CoachCacheInstance {
  const store = new Map<string, CacheEntry<unknown>>();
  let hits = 0;
  let misses = 0;
  const version = COACH_INFRASTRUCTURE.CACHE_VERSION;

  function generateKey(namespace: string, payload: unknown): string {
    let payloadStr = '';
    try {
      if (payload === null || payload === undefined) {
        payloadStr = 'empty';
      } else if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') {
        payloadStr = String(payload);
      } else {
        payloadStr = JSON.stringify(payload);
      }
    } catch {
      payloadStr = 'non_serializable';
    }

    // Fast simple 32-bit FNV-1a hash
    let hash = 2166136261;
    for (let i = 0; i < payloadStr.length; i++) {
      hash ^= payloadStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return `coach_v${version}:${namespace}:${(hash >>> 0).toString(36)}`;
  }

  function get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) {
      misses++;
      return null;
    }

    const now = Date.now();
    // Check expiration or version mismatch
    if (entry.expiresAt <= now || entry.version !== version) {
      store.delete(key);
      misses++;
      return null;
    }

    hits++;
    return entry.value as T;
  }

  function set<T>(key: string, value: T, ttlMs = defaultTtlMs): void {
    const now = Date.now();
    store.set(key, {
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
      version,
    });
  }

  function has(key: string): boolean {
    return get(key) !== null;
  }

  function invalidate(key: string): boolean {
    return store.delete(key);
  }

  function invalidateAll(): void {
    store.clear();
  }

  function size(): number {
    return store.size;
  }

  function getStats(): CacheStats {
    const total = hits + misses;
    return {
      hits,
      misses,
      size: store.size,
      hitRate: total > 0 ? Math.round((hits / total) * 100) / 100 : 0,
    };
  }

  function resetStats(): void {
    hits = 0;
    misses = 0;
  }

  return {
    get,
    set,
    has,
    invalidate,
    invalidateAll,
    generateKey,
    size,
    getStats,
    resetStats,
  };
}

/**
 * Global singleton in-memory coach cache.
 */
export const coachCache = createCoachCache();
