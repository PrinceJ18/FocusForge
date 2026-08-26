/**
 * Coach QA Suite — Deterministic Regression Suite (Phase 3.9.7)
 *
 * Validates that identical inputs ALWAYS produce byte-for-byte identical outputs
 * across repeated execution runs. Confirms zero randomness, zero temporal leakage,
 * and 100% deterministic purity.
 *
 * @module coach/testing/coachRegression
 */

import { ALL_COACH_TEST_CASES, type CoachTestCase } from './coachTestCases';
import { createCoachEngine } from '../coachEngine';
import { serializeCoachOutput } from '../coachSerializer';
import { assertValidCoachOutput } from './coachAssertions';

export interface RegressionTestResult {
  readonly allPassed: boolean;
  readonly totalScenarios: number;
  readonly passedScenarios: number;
  readonly failedScenarios: number;
  readonly scenarioResults: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly passed: boolean;
    readonly deterministic: boolean;
    readonly error?: string;
  }>;
  readonly totalDurationMs: number;
}

/**
 * Runs regression testing across all 10 test scenarios.
 * Executes each scenario multiple times to prove 100% output idempotency.
 *
 * @param iterationsPerScenario - Number of consecutive executions per scenario (default: 3)
 */
export function runCoachRegressionSuite(iterationsPerScenario = 3): RegressionTestResult {
  const start = performance.now();
  const scenarioResults: Array<{
    id: string;
    name: string;
    passed: boolean;
    deterministic: boolean;
    error?: string;
  }> = [];

  let passedCount = 0;

  for (const testCase of ALL_COACH_TEST_CASES) {
    let scenarioPassed = true;
    let deterministic = true;
    let errorMsg: string | undefined;

    let baselineSerialized = '';

    try {
      for (let i = 0; i < iterationsPerScenario; i++) {
        const engine = createCoachEngine(testCase.input);
        const output = engine.generateCompleteOutput();

        // 1. Assert structural and semantic integrity
        assertValidCoachOutput(output);

        const currentSerialized = serializeCoachOutput(output);

        // 2. Assert idempotency / zero non-determinism
        if (i === 0) {
          baselineSerialized = currentSerialized;
        } else if (currentSerialized !== baselineSerialized) {
          deterministic = false;
          throw new Error(`Non-deterministic output detected between run #0 and run #${i} for scenario "${testCase.name}".`);
        }
      }
    } catch (err) {
      scenarioPassed = false;
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    if (scenarioPassed && deterministic) {
      passedCount++;
    }

    scenarioResults.push({
      id: testCase.id,
      name: testCase.name,
      passed: scenarioPassed,
      deterministic,
      error: errorMsg,
    });
  }

  const duration = performance.now() - start;

  return {
    allPassed: passedCount === ALL_COACH_TEST_CASES.length,
    totalScenarios: ALL_COACH_TEST_CASES.length,
    passedScenarios: passedCount,
    failedScenarios: ALL_COACH_TEST_CASES.length - passedCount,
    scenarioResults,
    totalDurationMs: Math.round(duration * 100) / 100,
  };
}
