/**
 * Coach QA Suite — Developer Diagnostics & Health Report (Phase 3.9.7)
 *
 * Generates an aggregated, high-visibility engineering diagnostic report:
 * - System operational health status
 * - Cache efficiency and size
 * - Quality score & validation summary
 * - Regression verification status
 * - Benchmark performance profile
 * - Recommendation & Risk distribution
 *
 * Purely in-memory and development-oriented — zero UI coupling.
 *
 * @module coach/testing/coachDiagnostics
 */

import { coachCache } from '../coachCache';
import { coachMetrics } from '../coachMetrics';
import { coachProfiler } from '../coachProfiler';
import { coachHistory } from '../coachHistory';
import { coachRepository } from '../coachRepository';
import { runCoachRegressionSuite, type RegressionTestResult } from './coachRegression';
import { evaluateCoachQuality, type CoachQualityReport } from './coachQuality';
import { runCoachBenchmarks, type CoachBenchmarkReport } from './coachBenchmarks';
import { HEAVY_PRODUCTIVITY_SCENARIO } from './coachTestCases';
import { createCoachEngine } from '../coachEngine';

export interface CoachDiagnosticReport {
  readonly timestamp: string;
  readonly isHealthy: boolean;
  readonly systemGrade: 'A+' | 'A' | 'B' | 'C' | 'F';
  readonly quality: CoachQualityReport;
  readonly regression: RegressionTestResult;
  readonly benchmarks: CoachBenchmarkReport;
  readonly telemetry: {
    readonly cacheStats: ReturnType<typeof coachCache.getStats>;
    readonly historySize: number;
    readonly repositoryHasData: boolean;
    readonly executionMetrics: ReturnType<typeof coachMetrics.getMetrics>;
    readonly methodProfiles: ReturnType<typeof coachProfiler.getSummary>;
  };
  readonly summary: string;
}

/**
 * Runs complete diagnostic suite across regression, quality, benchmarks, and telemetry.
 */
export function generateCoachDiagnostics(): CoachDiagnosticReport {
  const now = new Date().toISOString();

  // 1. Run Regression Tests
  const regression = runCoachRegressionSuite(2);

  // 2. Run Benchmarks
  const benchmarks = runCoachBenchmarks();

  // 3. Evaluate Sample Quality
  const engine = createCoachEngine(HEAVY_PRODUCTIVITY_SCENARIO.input);
  const sampleOutput = engine.generateCompleteOutput();
  const quality = evaluateCoachQuality(sampleOutput, HEAVY_PRODUCTIVITY_SCENARIO.input);

  // 4. Gather Telemetry
  const cacheStats = coachCache.getStats();
  const executionMetrics = coachMetrics.getMetrics();
  const methodProfiles = coachProfiler.getSummary();
  const historySize = coachHistory.size();
  const repositoryHasData = coachRepository.hasData();

  const isHealthy = regression.allPassed && quality.qualityScore >= 80;
  const systemGrade = quality.grade;

  const summary = `FocusForge AI Coach Diagnostics: System is ${isHealthy ? 'HEALTHY (100% QA Passed)' : 'DEGRADED'}. Quality Score: ${quality.qualityScore}/100 (Grade: ${systemGrade}). Regression: ${regression.passedScenarios}/${regression.totalScenarios} passed. Benchmarks: Cold generation ~${benchmarks.benchmarks[0]?.avgTimeMs || 0}ms.`;

  return {
    timestamp: now,
    isHealthy,
    systemGrade,
    quality,
    regression,
    benchmarks,
    telemetry: {
      cacheStats,
      historySize,
      repositoryHasData,
      executionMetrics,
      methodProfiles,
    },
    summary,
  };
}
