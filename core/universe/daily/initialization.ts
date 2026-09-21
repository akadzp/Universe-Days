/**
 * Phase 5: Period Initialization.
 * Initializes a new period or continues from a previous period without inventing data.
 */

import { UniverseClock } from '../../temporal/clock.ts';
import { TimePoint } from '../../temporal/time-point.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { DailyUniverseStatus, UniversePeriod, createUniversePeriod } from './period.ts';
import { PeriodLifecycleManager, PeriodLifecycleEvent } from './lifecycle.ts';
import { CarryoverManager, CarryoverBatchResult } from './carryover.ts';
import { ContinuityItem } from '../continuity/continuity-model.ts';
import { UniverseEvent } from './event.ts';
import { UniverseConsequence } from './consequence.ts';
import { UniverseProcess } from './process.ts';
import { UnresolvedCondition } from './unresolved.ts';
import { FutureInformation } from './decision-action.ts';
import { PeriodTraceRecorder } from './trace.ts';

export type PeriodInitializationMode = 'FIRST_PERIOD' | 'NORMAL_CONTINUATION';

export interface InitializePeriodParams {
  startTime: TimePoint;
  endTime?: TimePoint;
  previousPeriodRef?: string;
  sequenceNumber?: number;
  universeScope?: string;
  previousContinuityItems?: ContinuityItem[];
  previousUnresolvedConditions?: UnresolvedCondition[];
  previousProcesses?: UniverseProcess[];
  previousFutureInfo?: FutureInformation[];
  initialEvents?: UniverseEvent[];
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
  carryoverResult?: CarryoverBatchResult;
}

export class PeriodInitializer {
  /**
   * Initializes a Daily Universe period.
   * Strictly distinguishes FIRST_PERIOD from NORMAL_CONTINUATION.
   * Invariants: never invents previous state, characters, stories, or events.
   */
  public static initialize(params: InitializePeriodParams): Result<UniversePeriodContext, { code: EngineErrorCode; message: string }> {
    const isFirstPeriod = !params.previousPeriodRef;
    const mode: PeriodInitializationMode = isFirstPeriod ? 'FIRST_PERIOD' : 'NORMAL_CONTINUATION';

    // 1. Resolve Universe Clock from target start time
    const clockRes = UniverseClock.create(params.startTime);
    if (!clockRes.success || !clockRes.data) {
      const msg = `Failed to resolve target Universe Time: ${clockRes.message ?? clockRes.error}`;
      return failure(
        { code: EngineErrorCode.PERIOD_INITIALIZATION_FAILED, message: msg },
        msg
      );
    }
    const clock = clockRes.data;

    // 2. Create base UniversePeriod
    const period = createUniversePeriod({
      startTime: params.startTime,
      endTime: params.endTime,
      previousPeriodRef: params.previousPeriodRef,
      sequenceNumber: params.sequenceNumber,
      universeScope: params.universeScope,
      isFirstPeriod
    });

    const lifecycle = new PeriodLifecycleManager(period.status);
    const traces = new PeriodTraceRecorder();

    // 3. Start initialization lifecycle
    const initTransition = lifecycle.transition(PeriodLifecycleEvent.START_INIT, {
      periodId: period.periodId
    });
    if (!initTransition.success) {
      const msg = initTransition.error?.message ?? 'Failed to start initialization';
      return failure(
        { code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE, message: msg },
        msg
      );
    }
    period.status = lifecycle.getStatus();
    period.initializationState = 'IN_PROGRESS';

    traces.record({
      operation: 'START_INITIALIZATION',
      periodId: period.periodId,
      universeTime: period.startTime.toCanonical(),
      previousState: DailyUniverseStatus.UNINITIALIZED,
      transition: PeriodLifecycleEvent.START_INIT,
      result: 'IN_PROGRESS',
      affectedReferences: [period.periodId],
      validationResult: { valid: true }
    });

    // 4. Carryover continuity references
    let carryoverRes: CarryoverBatchResult | undefined;
    let continuityItems: ContinuityItem[] = [];

    if (mode === 'NORMAL_CONTINUATION') {
      const prevItems = params.previousContinuityItems ?? [];
      carryoverRes = CarryoverManager.processCarryover(prevItems, params.startTime);

      if (!carryoverRes.allowed) {
        // Block lifecycle if carryover is blocked
        lifecycle.transition(PeriodLifecycleEvent.BLOCK, {
          periodId: period.periodId,
          reason: carryoverRes.blockedReasons.join('; ')
        });
        period.status = lifecycle.getStatus();
        period.initializationState = 'FAILED';

        traces.record({
          operation: 'CARRYOVER_BLOCKED',
          periodId: period.periodId,
          universeTime: period.startTime.toCanonical(),
          previousState: DailyUniverseStatus.INITIALIZING,
          transition: PeriodLifecycleEvent.BLOCK,
          result: 'BLOCKED',
          affectedReferences: prevItems.map(i => i.identity.continuityId),
          validationResult: { valid: false, errors: carryoverRes.blockedReasons }
        });

        const msg = `Period initialization blocked by carryover: ${carryoverRes.blockedReasons.join('; ')}`;
        return failure(
          { code: EngineErrorCode.PERIOD_BLOCKED, message: msg },
          msg
        );
      }

      continuityItems = carryoverRes.items
        .filter(i => i.severity === 'VALID')
        .map(i => i.continuityItem);
    } else {
      // First period: no carryover, do not invent history!
      continuityItems = params.previousContinuityItems ?? [];
    }

    // 5. Carry forward unresolved conditions (no automatic reset/deletion)
    const unresolvedConditions: UnresolvedCondition[] = (params.previousUnresolvedConditions ?? []).map(u => ({
      ...u
    }));

    // 6. Carry forward active processes (preserve process identity across period boundaries)
    const processes: UniverseProcess[] = (params.previousProcesses ?? []).map(p => ({
      ...p
    }));

    // 7. Carry forward future information (remains non-actualized)
    const futureInfo: FutureInformation[] = (params.previousFutureInfo ?? []).map(f => ({
      ...f
    }));

    // 8. Complete initialization lifecycle
    const completeRes = lifecycle.transition(PeriodLifecycleEvent.COMPLETE_INIT, {
      periodId: period.periodId
    });
    if (!completeRes.success) {
      const msg = completeRes.error?.message ?? 'Failed to complete initialization';
      return failure(
        { code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE, message: msg },
        msg
      );
    }
    period.status = lifecycle.getStatus();
    period.initializationState = 'INITIALIZED';

    traces.record({
      operation: 'COMPLETE_INITIALIZATION',
      periodId: period.periodId,
      universeTime: period.startTime.toCanonical(),
      previousState: DailyUniverseStatus.INITIALIZING,
      transition: PeriodLifecycleEvent.COMPLETE_INIT,
      result: 'INITIALIZED',
      affectedReferences: [period.periodId],
      validationResult: { valid: true }
    });

    return success({
      period,
      initializationMode: mode,
      lifecycle,
      clock,
      traces,
      continuityItems,
      unresolvedConditions,
      processes,
      futureInfo,
      events: params.initialEvents ?? [],
      consequences: [],
      carryoverResult: carryoverRes
    });
  }
}
