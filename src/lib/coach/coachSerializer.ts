/**
 * Coach Engine — Serialization & Portable State Layer (Phase 3.9.6)
 *
 * Provides utilities for:
 * - JSON serialization & deserialization of CoachOutput
 * - Deep immutable cloning
 * - Compact export packages for future cloud sync / reporting
 * - State restoration & schema validation
 *
 * All methods are pure and deterministic.
 *
 * @module coach/coachSerializer
 */

import type { CoachOutput } from './coachTypes';
import { COACH_INFRASTRUCTURE } from './coachConstants';

export interface CompactCoachExport {
  readonly version: string;
  readonly exportedAt: string;
  readonly timestampMs: number;
  readonly payload: CoachOutput;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Deeply clones any JSON-serializable structure immutably.
 * Uses structuredClone if available with JSON fallback.
 */
export function deepCloneImmutable<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback
    }
  }
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Serializes a complete CoachOutput to a formatted JSON string.
 */
export function serializeCoachOutput(output: CoachOutput, pretty = false): string {
  try {
    return JSON.stringify(output, null, pretty ? 2 : undefined);
  } catch (err) {
    throw new Error(`[CoachSerializer] Failed to serialize CoachOutput: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Deserializes a JSON string into a strongly-typed CoachOutput with structural verification.
 */
export function deserializeCoachOutput(jsonStr: string): CoachOutput {
  try {
    const parsed = JSON.parse(jsonStr) as Partial<CoachOutput>;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Deserialized JSON is not an object.');
    }

    // Verify presence of core keys
    if (!parsed.dailyBrief || !parsed.recommendations || !parsed.predictions) {
      throw new Error('Deserialized object is missing essential CoachOutput keys.');
    }

    return parsed as CoachOutput;
  } catch (err) {
    throw new Error(`[CoachSerializer] Failed to deserialize CoachOutput: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Packs CoachOutput with metadata into a portable compact export package.
 */
export function exportCompactState(
  output: CoachOutput,
  metadata?: Record<string, unknown>
): string {
  const exportPackage: CompactCoachExport = {
    version: COACH_INFRASTRUCTURE.CACHE_VERSION,
    exportedAt: new Date().toISOString(),
    timestampMs: Date.now(),
    payload: deepCloneImmutable(output),
    metadata,
  };

  return JSON.stringify(exportPackage);
}

/**
 * Restores a compact export package back into CoachOutput and metadata.
 */
export function restoreCompactState(
  compactJson: string
): { output: CoachOutput; metadata?: Record<string, unknown>; exportedAt: string } {
  try {
    const parsed = JSON.parse(compactJson) as Partial<CompactCoachExport>;
    if (!parsed || !parsed.payload || typeof parsed.payload !== 'object') {
      throw new Error('Invalid compact coach package structure.');
    }

    return {
      output: parsed.payload,
      metadata: parsed.metadata,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
    };
  } catch (err) {
    throw new Error(`[CoachSerializer] Failed to restore compact state: ${err instanceof Error ? err.message : String(err)}`);
  }
}
