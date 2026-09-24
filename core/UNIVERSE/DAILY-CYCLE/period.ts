/**
 * Phase 5: Daily Universe Period Model & Identity.
 * Implements deterministic period identity and core period structure.
 */

import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { TraceabilityMetadata } from '../../SHARED/common.ts';
import { makeRequestID, makeSystemID } from '../../SHARED/identifiers.ts';

export enum DailyUniverseStatus {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
  PROGRESSING = 'PROGRESSING',
  FINALIZING = 'FINALIZING',
  FINALIZED = 'FINALIZED',
  BLOCKED = 'BLOCKED',
  FAILED = 'FAILED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED'
}

export type PeriodInitializationState = 'PENDING' | 'IN_PROGRESS' | 'INITIALIZED' | 'FAILED';
export type PeriodProgressionState = 'IDLE' | 'PROGRESSING' | 'PAUSED' | 'COMPLETED' | 'BLOCKED';
export type PeriodFinalizationState = 'UNFINALIZED' | 'FINALIZING' | 'FINALIZED' | 'REJECTED';

export class PeriodIdentity {
  /**
   * Deterministically derives a unique Period ID from explicit period context.
   * Does NOT rely on execution time, random values, story title, or file name.
   */
  public static derive(
    startTime: TimePoint,
    sequenceNumber: number = 1,
    universeScope: string = 'UNIVERSE_DEFAULT'
  ): string {
    const canonicalTime = startTime.toCanonical().replace(/[:\-]/g, '');
    const paddedSeq = String(sequenceNumber).padStart(4, '0');
    return `PERIOD_${universeScope}_${canonicalTime}_S${paddedSeq}`;
  }
}

export interface UniversePeriod {
  periodId: string;
  universeScope: string;
  startTime: TimePoint;
  endTime?: TimePoint;
  currentUniverseTime: TimePoint;
  previousPeriodRef?: string;
  status: DailyUniverseStatus;
  initializationState: PeriodInitializationState;
  progressionState: PeriodProgressionState;
  finalizationState: PeriodFinalizationState;
  isFirstPeriod: boolean;
  traceability: TraceabilityMetadata;
}

export interface CreatePeriodParams {
  startTime: TimePoint;
  endTime?: TimePoint;
  previousPeriodRef?: string;
  sequenceNumber?: number;
  universeScope?: string;
  isFirstPeriod?: boolean;
}

/**
 * Creates a deterministic, valid UniversePeriod in UNINITIALIZED state.
 */
export function createUniversePeriod(params: CreatePeriodParams): UniversePeriod {
  const scope = params.universeScope ?? 'UNIVERSE_DEFAULT';
  const isFirst = params.isFirstPeriod ?? (params.previousPeriodRef === undefined || params.previousPeriodRef === null);
  const periodId = PeriodIdentity.derive(
    params.startTime,
    params.sequenceNumber ?? 1,
    scope
  );

  return {
    periodId,
    universeScope: scope,
    startTime: params.startTime,
    endTime: params.endTime,
    currentUniverseTime: params.startTime,
    previousPeriodRef: isFirst ? undefined : params.previousPeriodRef,
    status: DailyUniverseStatus.UNINITIALIZED,
    initializationState: 'PENDING',
    progressionState: 'IDLE',
    finalizationState: 'UNFINALIZED',
    isFirstPeriod: isFirst,
    traceability: {
      requestId: makeRequestID(`REQ_PERIOD_CREATE_${periodId}`),
      sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      timestamp: 0,
      version: '1.0.0'
    }
  };
}
