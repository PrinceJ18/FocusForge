/**
 * Coach Engine — Internal Performance Metrics & Telemetry (Phase 3.9.6)
 *
 * Tracks internal performance and data volume statistics:
 * - Execution duration (last & average ms)
 * - Cache hits, misses, and hit rate
 * - Counts of generated recommendations, risks, predictions, timeline events
 * - Number of history snapshots retained
 *
 * Internal telemetry only — zero UI coupling.
 *
 * @module coach/coachMetrics
 */

export interface CoachInternalMetrics {
  readonly totalExecutions: number;
  readonly lastExecutionDurationMs: number;
  readonly averageExecutionDurationMs: number;
  readonly minExecutionDurationMs: number;
  readonly maxExecutionDurationMs: number;
  readonly totalExecutionDurationMs: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly cacheHitRatePct: number;
  readonly lastRecommendationCount: number;
  readonly lastRiskCount: number;
  readonly lastTimelineEventCount: number;
  readonly historySnapshotsCount: number;
  readonly lastRecordedAt: string | null;
}

export interface CoachMetricsTracker {
  recordExecution: (durationMs: number, counts?: { recs?: number; risks?: number; timeline?: number }) => void;
  recordCacheHit: () => void;
  recordCacheMiss: () => void;
  updateHistorySize: (size: number) => void;
  getMetrics: () => CoachInternalMetrics;
  reset: () => void;
}

/**
 * Creates an in-memory performance metrics tracker.
 */
export function createCoachMetrics(): CoachMetricsTracker {
  let totalExecutions = 0;
  let lastExecutionDurationMs = 0;
  let totalExecutionDurationMs = 0;
  let minExecutionDurationMs = Infinity;
  let maxExecutionDurationMs = 0;

  let cacheHits = 0;
  let cacheMisses = 0;

  let lastRecommendationCount = 0;
  let lastRiskCount = 0;
  let lastTimelineEventCount = 0;
  let historySnapshotsCount = 0;
  let lastRecordedAt: string | null = null;

  function recordExecution(durationMs: number, counts?: { recs?: number; risks?: number; timeline?: number }): void {
    totalExecutions++;
    lastExecutionDurationMs = Math.round(durationMs * 100) / 100;
    totalExecutionDurationMs += durationMs;

    if (durationMs < minExecutionDurationMs) minExecutionDurationMs = Math.round(durationMs * 100) / 100;
    if (durationMs > maxExecutionDurationMs) maxExecutionDurationMs = Math.round(durationMs * 100) / 100;

    if (counts) {
      if (counts.recs !== undefined) lastRecommendationCount = counts.recs;
      if (counts.risks !== undefined) lastRiskCount = counts.risks;
      if (counts.timeline !== undefined) lastTimelineEventCount = counts.timeline;
    }

    lastRecordedAt = new Date().toISOString();
  }

  function recordCacheHit(): void {
    cacheHits++;
  }

  function recordCacheMiss(): void {
    cacheMisses++;
  }

  function updateHistorySize(size: number): void {
    historySnapshotsCount = size;
  }

  function getMetrics(): CoachInternalMetrics {
    const totalCacheRequests = cacheHits + cacheMisses;
    const cacheHitRatePct = totalCacheRequests > 0 ? Math.round((cacheHits / totalCacheRequests) * 100) : 0;
    const avgDuration = totalExecutions > 0 ? Math.round((totalExecutionDurationMs / totalExecutions) * 100) / 100 : 0;

    return {
      totalExecutions,
      lastExecutionDurationMs,
      averageExecutionDurationMs: avgDuration,
      minExecutionDurationMs: minExecutionDurationMs === Infinity ? 0 : minExecutionDurationMs,
      maxExecutionDurationMs,
      totalExecutionDurationMs: Math.round(totalExecutionDurationMs * 100) / 100,
      cacheHits,
      cacheMisses,
      cacheHitRatePct,
      lastRecommendationCount,
      lastRiskCount,
      lastTimelineEventCount,
      historySnapshotsCount,
      lastRecordedAt,
    };
  }

  function reset(): void {
    totalExecutions = 0;
    lastExecutionDurationMs = 0;
    totalExecutionDurationMs = 0;
    minExecutionDurationMs = Infinity;
    maxExecutionDurationMs = 0;
    cacheHits = 0;
    cacheMisses = 0;
    lastRecommendationCount = 0;
    lastRiskCount = 0;
    lastTimelineEventCount = 0;
    historySnapshotsCount = 0;
    lastRecordedAt = null;
  }

  return {
    recordExecution,
    recordCacheHit,
    recordCacheMiss,
    updateHistorySize,
    getMetrics,
    reset,
  };
}

/**
 * Global singleton metrics tracker.
 */
export const coachMetrics = createCoachMetrics();
