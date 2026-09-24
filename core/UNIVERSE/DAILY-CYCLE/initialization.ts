/**
 * Phase 5: Period Initialization.
 * Initializes a new period or continues from a previous period without inventing data.
 */

import { UniverseClock } from '../../RUNTIME/TEMPORAL/clock.ts';
import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { UniversePeriod, createUniversePeriod } from '../../UNIVERSE/DAILY-CYCLE/period.ts';
import { PeriodLifecycleManager } from '../../UNIVERSE/DAILY-CYCLE/lifecycle.ts';
import { initializePeriodCore } from './period-initializer-core.ts';
import type { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';
import type { UniversePeriodContext, PeriodInitializationMode } from './contracts.ts';
import { DailyUniverseContinuation } from './continuation.ts';

export interface InitializePeriodParams {
  startTime?: TimePoint;
  endTime?: TimePoint;
  previousPeriodRef?: string;
  sequenceNumber?: number;
  universeScope?: string;
  previousContinuityItems?: ContinuityItem[];
  previousUnresolvedConditions?: UnresolvedCondition[];
  previousProcesses?: UniverseProcess[];
  previousFutureInfo?: FutureInformation[];
  initialEvents?: UniverseEvent[];
  universe?: UniverseModel;
  isFirstPeriod?: boolean;
}

export interface UniversePeriodContext {
  period: UniversePeriod;
  initializationMode: PeriodInitializationMode;
  lifecycle: PeriodLifecycleManager;
  clock: UniverseClock;
  traces: PeriodTraceRecorder;
  continuityItems: ContinuityItem[];
  unresolvedConditions: UnresolvedCondition[];
  processes: UniverseProcess[];
  futureInfo: FutureInformation[];
  events: UniverseEvent[];
  consequences: UniverseConsequence[];
  metadata: Record<string, unknown>;
  carryoverResult?: CarryoverBatchResult;
}

export class PeriodInitializer {
  /**
   * Initializes a Daily Universe period. Universe-backed continuation is
   * delegated to the continuation authority; the pure period initializer is
   * kept dependency-free so the Daily-Cycle graph remains acyclic.
   */
  public static initialize(params: InitializePeriodParams): Result<UniversePeriodContext, { code: EngineErrorCode; message: string }> {
    if (params.