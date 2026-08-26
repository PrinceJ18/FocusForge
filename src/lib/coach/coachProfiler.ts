/**
 * Coach Engine — Internal Execution Profiler (Phase 3.9.6)
 *
 * Measures sub-millisecond execution timing of individual generation methods,
 * identifies hot paths, and tracks cache efficiency.
 *
 * Designed for internal telemetry and testing — zero console spam.
 *
 * @module coach/coachProfiler
 */

export interface MethodProfileStat {
  readonly methodName: string;
  readonly callCount: number;
  readonly totalDurationMs: number;
  readonly avgDurationMs: number;
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
  readonly lastDurationMs: number;
}

export interface CoachProfilerInstance {
  profileMethod: <T>(name: string, fn: () => T) => T;
  getSummary: () => Record<string, MethodProfileStat>;
  getMethodStat: (name: string) => MethodProfileStat | null;
  reset: () => void;
}

/**
 * Creates an in-memory method profiler.
 */
export function createCoachProfiler(): CoachProfilerInstance {
  const stats = new Map<
    string,
    {
      callCount: number;
      totalDurationMs: number;
      minDurationMs: number;
      maxDurationMs: number;
      lastDurationMs: number;
    }
  >();

  function profileMethod<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      const existing = stats.get(name);
      if (!existing) {
        stats.set(name, {
          callCount: 1,
          totalDurationMs: duration,
          minDurationMs: duration,
          maxDurationMs: duration,
          lastDurationMs: duration,
        });
      } else {
        existing.callCount++;
        existing.totalDurationMs += duration;
        existing.lastDurationMs = duration;
        if (duration < existing.minDurationMs) existing.minDurationMs = duration;
        if (duration > existing.maxDurationMs) existing.maxDurationMs = duration;
      }
    }
  }

  function getSummary(): Record<string, MethodProfileStat> {
    const summary: Record<string, MethodProfileStat> = {};
    stats.forEach((val, key) => {
      summary[key] = {
        methodName: key,
        callCount: val.callCount,
        totalDurationMs: Math.round(val.totalDurationMs * 100) / 100,
        avgDurationMs: Math.round((val.totalDurationMs / val.callCount) * 100) / 100,
        minDurationMs: Math.round(val.minDurationMs * 100) / 100,
        maxDurationMs: Math.round(val.maxDurationMs * 100) / 100,
        lastDurationMs: Math.round(val.lastDurationMs * 100) / 100,
      };
    });
    return summary;
  }

  function getMethodStat(name: string): MethodProfileStat | null {
    const s = stats.get(name);
    if (!s) return null;
    return {
      methodName: name,
      callCount: s.callCount,
      totalDurationMs: Math.round(s.totalDurationMs * 100) / 100,
      avgDurationMs: Math.round((s.totalDurationMs / s.callCount) * 100) / 100,
      minDurationMs: Math.round(s.minDurationMs * 100) / 100,
      maxDurationMs: Math.round(s.maxDurationMs * 100) / 100,
      lastDurationMs: Math.round(s.lastDurationMs * 100) / 100,
    };
  }

  function reset(): void {
    stats.clear();
  }

  return {
    profileMethod,
    getSummary,
    getMethodStat,
    reset,
  };
}

/**
 * Global singleton profiler.
 */
export const coachProfiler = createCoachProfiler();
