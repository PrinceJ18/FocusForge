/**
 * Coach QA Suite — Performance Benchmarking Suite (Phase 3.9.7)
 *
 * Measures sub-millisecond execution benchmarks for:
 * - Engine complete output generation (Cold vs Warm / Cached)
 * - Cache retrieval & hashing throughput
 * - Scheduler dirty-checking performance
 * - Output validation overhead
 * - Snapshot history storage and query speed
 * - Repository lookup latency
 *
 * @module coach/testing/coachBenchmarks
 */

import { HEAVY_PRODUCTIVITY_SCENARIO } from './coachTestCases';
import { createCoachEngine } from '../coachEngine';
import { createCoachCache } from '../coachCache';
import { createCoachScheduler } from '../coachScheduler';
import { createCoachHistory } from '../coachHistory';
import { createCoachRepository } from '../coachRepository';
import { validateCoachOutput } from '../coachValidator';

export interface BenchmarkStat {
  readonly name: string;
  readonly iterations: number;
  readonly totalTimeMs: number;
  readonly avgTimeMs: number;
  readonly minTimeMs: number;
  readonly maxTimeMs: number;
  readonly opsPerSec: number;
}

export interface CoachBenchmarkReport {
  readonly totalDurationMs: number;
  readonly benchmarks: readonly BenchmarkStat[];
  readonly summary: string;
}

/**
 * Runs a performance benchmark function across N iterations.
 */
function benchmarkOperation(name: string, iterations: number, fn: () => void): BenchmarkStat {
  const times: number[] = [];
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const opStart = performance.now();
    fn();
    times.push(performance.now() - opStart);
  }

  const total = performance.now() - start;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = total / iterations;
  const opsPerSec = Math.round((iterations / (total / 1000)));

  return {
    name,
    iterations,
    totalTimeMs: Math.round(total * 100) / 100,
    avgTimeMs: Math.round(avg * 1000) / 1000,
    minTimeMs: Math.round(min * 1000) / 1000,
    maxTimeMs: Math.round(max * 1000) / 1000,
    opsPerSec,
  };
}

/**
 * Executes the complete AI Coach performance benchmarking suite.
 */
export function runCoachBenchmarks(): CoachBenchmarkReport {
  const suiteStart = performance.now();
  const benchmarks: BenchmarkStat[] = [];
  const testInput = HEAVY_PRODUCTIVITY_SCENARIO.input;

  // 1. Cold Engine Generation (Instantiate & compute from scratch)
  benchmarks.push(
    benchmarkOperation('Cold Engine Generation (Full Output)', 25, () => {
      const engine = createCoachEngine(testInput);
      engine.generateCompleteOutput();
    })
  );

  // 2. Warm / Cached Retrieval
  const warmEngine = createCoachEngine(testInput);
  warmEngine.generateCompleteOutput(); // Prime cache
  benchmarks.push(
    benchmarkOperation('Warm Engine Retrieval (Cached Slices)', 200, () => {
      warmEngine.generateRecommendations();
      warmEngine.generatePredictions();
      warmEngine.generateEarlyRisks();
    })
  );

  // 3. Cache Hashing & Key Lookup
  const cache = createCoachCache();
  benchmarks.push(
    benchmarkOperation('Cache Key Hashing & Lookup', 500, () => {
      const key = cache.generateKey('benchmark', testInput);
      cache.set(key, { data: true });
      cache.get(key);
    })
  );

  // 4. Scheduler Dirty Checking
  const scheduler = createCoachScheduler();
  scheduler.markComputed(testInput);
  benchmarks.push(
    benchmarkOperation('Scheduler Context Signature & Dirty Check', 500, () => {
      scheduler.needsRefresh(testInput);
    })
  );

  // 5. Output Validation Overhead
  const sampleOutput = warmEngine.generateCompleteOutput();
  benchmarks.push(
    benchmarkOperation('Structural Output Validation', 100, () => {
      validateCoachOutput(sampleOutput);
    })
  );

  // 6. History Snapshot Ingestion & Limit Query
  const history = createCoachHistory();
  benchmarks.push(
    benchmarkOperation('History Snapshot Add & Query', 100, () => {
      history.addSnapshot(sampleOutput);
      history.getLatest();
      history.limit(10);
    })
  );

  // 7. Repository Slice Lookup
  const repository = createCoachRepository();
  repository.setLatestOutput(sampleOutput);
  benchmarks.push(
    benchmarkOperation('Repository Slice Direct Access', 500, () => {
      repository.getLatestRecommendations();
      repository.getLatestPredictions();
      repository.getLatestDailyBrief();
    })
  );

  const totalDuration = performance.now() - suiteStart;

  const coldGenStat = benchmarks.find(b => b.name.startsWith('Cold Engine'));
  const warmStat = benchmarks.find(b => b.name.startsWith('Warm Engine'));

  const summary = `Benchmark complete in ${Math.round(totalDuration)}ms. Cold generation avg: ${coldGenStat?.avgTimeMs}ms, Warm cached retrieval avg: ${warmStat?.avgTimeMs}ms (${warmStat?.opsPerSec} ops/sec).`;

  return {
    totalDurationMs: Math.round(totalDuration * 100) / 100,
    benchmarks,
    summary,
  };
}
