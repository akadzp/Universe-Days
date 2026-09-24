/**
 * Phase 5: Period Initialization.
 * Initializes a new period or continues from a previous period without inventing data.
 */

import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { Result } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { ContinuityItem } from '../../UNIVERSE/CONTINUITY/continuity-model.ts';
import { UniverseEvent } from '../../UNIVERSE/DAILY-CYCLE/event.ts';
import { UniverseProcess } from '../../UNIVERSE/DAILY-CYCLE/process.ts';
import { UnresolvedCondition } from '../../UNIVERSE/DAILY-CYCLE/unresolved.ts';
import { FutureInformation } from '../../UNIVERSE/DAILY-CYCLE/decision-action.ts';
import type { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';
import type { UniversePeriodContext, PeriodInitializationMode } from './contracts.ts';
import { initializePeriodCore } from './period-initializer-core.ts';
import { DailyUniverseContinuation } from './continuation.ts';

export type { UniversePeriodContext, PeriodInitializationMode };

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

export class PeriodInitializer {
  /**
   * Initializes a Daily Universe period. Universe-backed continuation is
   * delegated to the continuation authority; the pure period initializer is
   * kept dependency-free so the Daily-Cycle graph remains acyclic.
   */
  public static initialize(params: InitializePeriodParams): Result<UniversePeriodContext, { code: EngineErrorCode; message: string }> {
    if (params.universe) {
      return DailyUniverseContinuation.initializeAuthoritativePeriod(params.universe, params);
    }
    return initializePeriodCore(params);
  }
}
