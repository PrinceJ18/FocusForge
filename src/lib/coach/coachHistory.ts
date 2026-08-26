/**
 * Coach Engine — In-Memory Snapshot History (Phase 3.9.6)
 *
 * Maintains a rolling in-memory history of generated intelligence snapshots:
 * - Rolling window up to MAX_HISTORY_SNAPSHOTS (default 50)
 * - Enables comparing previous vs latest intelligence states
 * - In-memory only — no persistence / no store mutations
 *
 * @module coach/coachHistory
 */

import type { CoachOutput } from './coachTypes';
import { COACH_INFRASTRUCTURE } from './coachConstants';
import { deepCloneImmutable } from './coachSerializer';

export interface CoachHistorySnapshot {
  readonly id: string;
  readonly timestamp: string; // ISO string
  readonly timestampMs: number;
  readonly dateStr: string; // yyyy-MM-dd
  readonly contextHash: string;
  readonly output: CoachOutput;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface CoachHistoryInstance {
  addSnapshot: (output: CoachOutput, contextHash?: string, metadata?: Record<string, unknown>) => CoachHistorySnapshot;
  getLatest: () => CoachHistorySnapshot | null;
  getPrevious: () => CoachHistorySnapshot | null;
  getHistory: () => readonly CoachHistorySnapshot[];
  getBetweenDates: (startDateStr: string, endDateStr: string) => readonly CoachHistorySnapshot[];
  limit: (count: number) => readonly CoachHistorySnapshot[];
  clear: () => void;
  size: () => number;
}

/**
 * Creates an in-memory snapshot history instance.
 */
export function createCoachHistory(maxSnapshots = COACH_INFRASTRUCTURE.MAX_HISTORY_SNAPSHOTS): CoachHistoryInstance {
  const snapshots: CoachHistorySnapshot[] = [];

  function addSnapshot(
    output: CoachOutput,
    contextHash = 'unknown',
    metadata?: Record<string, unknown>
  ): CoachHistorySnapshot {
    const now = new Date();
    const timestamp = now.toISOString();
    const timestampMs = now.getTime();
    const dateStr = timestamp.slice(0, 10);

    const snapshot: CoachHistorySnapshot = {
      id: `snapshot_${timestampMs}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      timestampMs,
      dateStr,
      contextHash,
      output: deepCloneImmutable(output),
      metadata: metadata ? deepCloneImmutable(metadata) : undefined,
    };

    snapshots.unshift(snapshot); // Newest at index 0

    // Trim older snapshots exceeding max limit
    if (snapshots.length > maxSnapshots) {
      snapshots.length = maxSnapshots;
    }

    return snapshot;
  }

  function getLatest(): CoachHistorySnapshot | null {
    return snapshots[0] || null;
  }

  function getPrevious(): CoachHistorySnapshot | null {
    return snapshots[1] || null;
  }

  function getHistory(): readonly CoachHistorySnapshot[] {
    return snapshots;
  }

  function getBetweenDates(startDateStr: string, endDateStr: string): readonly CoachHistorySnapshot[] {
    return snapshots.filter(s => s.dateStr >= startDateStr && s.dateStr <= endDateStr);
  }

  function limit(count: number): readonly CoachHistorySnapshot[] {
    return snapshots.slice(0, Math.max(0, count));
  }

  function clear(): void {
    snapshots.length = 0;
  }

  function size(): number {
    return snapshots.length;
  }

  return {
    addSnapshot,
    getLatest,
    getPrevious,
    getHistory,
    getBetweenDates,
    limit,
    clear,
    size,
  };
}

/**
 * Global singleton coach history.
 */
export const coachHistory = createCoachHistory();
