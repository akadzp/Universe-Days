/**
 * Phase 10: Production Run Repository
 *
 * Keeps production artifacts behind a repository boundary.
 * The implementation is intentionally in-memory for this phase.
 */

import { DailyProductionRun } from './types.ts';
import { Result, success, failure } from '../types/result.ts';

export interface ProductionRunRepository {
  get(runId: string): Result<DailyProductionRun | null>;
  save<TOutput = unknown>(run: DailyProductionRun<TOutput>): Result<boolean>;
  list(universeId?: string): Result<DailyProductionRun[]>;
  clear(): void;
}

export class InMemoryProductionRunRepository implements ProductionRunRepository {
  private readonly runs = new Map<string, DailyProductionRun>();

  public get(runId: string): Result<DailyProductionRun | null> {
    return success(this.runs.get(runId) ?? null);
  }

  public save<TOutput = unknown>(run: DailyProductionRun<TOutput>): Result<boolean> {
    if (!run?.runId) {
      return failure('INVALID_PRODUCTION_RUN', 'Production run must have a runId.');
    }

    const existing = this.runs.get(run.runId);
    if (existing) {
      return failure(
        'DUPLICATE_PRODUCTION_RUN',
        `Production run "${run.runId}" already exists.`
      );
    }

    this.runs.set(run.runId, structuredClone(run));
    return success(true);
  }

  public list(universeId?: string): Result<DailyProductionRun[]> {
    const values = Array.from(this.runs.values());
    const filtered = universeId
      ? values.filter(run => run.universeId === universeId)
      : values;

    return success(structuredClone(filtered));
  }

  public clear(): void {
    this.runs.clear();
  }
}
