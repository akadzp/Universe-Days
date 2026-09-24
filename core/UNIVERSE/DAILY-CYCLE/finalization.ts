/**
 * Phase 5: Period Finalization.
 * Finalizes the active period and prepares NextPeriodContext without erasing state or resetting time.
 */

import type { UniversePeriodContext, FinalizationResult } from './contracts.ts';
export type { FinalizationResult };
import { DailyUniverseStatus } from '../../UNIVERSE/DAILY-CYCLE/period.ts';
import { PeriodLifecycleEvent } from '../../UNIVERSE/DAILY-CYCLE/lifecycle.ts';
import { NextPeriodContext, createNextPeriodContext } from '../../UNIVERSE/DAILY-CYCLE/next-period.ts';
import { DailyUniverseGate } from '../../UNIVERSE/DAILY-CYCLE/gate.ts';
import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { Duration } from '../../RUNTIME/TEMPORAL/duration.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export interface FinalizePeriodOptions {
  nextPeriodStartTime?: TimePoint;
  advancePeriodDuration?: Duration;
}



export class PeriodFinalizer {
  /**
   * Finalizes the current period and produces the NextPeriodContext.
   * Invariants:
   * - Does NOT erase state
   * - Does NOT complete active processes
   * - Does NOT delete or auto-resolve unresolved conditions
   * - Does NOT reset Universe Time
   * - Does NOT generate story or page
   */
  public static finalize(
    ctx: UniversePeriodContext,
    options?: FinalizePeriodOptions
  ): Result<FinalizationResult, { code: EngineErrorCode; message: string }> {
    const { period, lifecycle, traces, clock } = ctx;

    // 1. Move lifecycle to FINALIZING
    const startFinalRes = lifecycle.transition(PeriodLifecycleEvent.START_FINALIZATION, {
      periodId: period.periodId
    });
    if (!startFinalRes.success) {
      const msg = `Failed to transition period to FINALIZING: ${startFinalRes.error?.message}`;
      return failure(
        { code: EngineErrorCode.PERIOD_FINALIZATION_FAILED, message: msg },
        msg
      );
    }
    period.status = lifecycle.getStatus();
    period.finalizationState = 'FINALIZING';

    // 2. Run DailyUniverseGate check
    const gateRes = DailyUniverseGate.evaluate(period, ctx);
    if (!gateRes.passed) {
      lifecycle.transition(PeriodLifecycleEvent.BLOCK, {
        periodId: period.periodId,
        reason: 'Gate validation failed during finalization'
      });
      period.status = lifecycle.getStatus();
      period.finalizationState = 'REJECTED';

      traces.record({
        operation: 'FINALIZATION_GATE_REJECTED',
        periodId: period.periodId,
        universeTime: clock.readCurrentTime().toCanonical(),
        previousState: DailyUniverseStatus.FINALIZING,
        transition: PeriodLifecycleEvent.BLOCK,
        result: 'BLOCKED',
        affectedReferences: [period.periodId],
        validationResult: { valid: false, errors: gateRes.findings.map(f => f.message) }
      });

      const msg = `Period finalization blocked by gate: ${gateRes.findings.map(f => f.message).join('; ')}`;
      return failure(
        { code: EngineErrorCode.PERIOD_FINALIZATION_FAILED, message: msg },
        msg
      );
    }

    // 3. Determine next period start time
    let nextStartTime: TimePoint;
    if (options?.nextPeriodStartTime) {
      nextStartTime = options.nextPeriodStartTime;
    } else if (period.endTime) {
      nextStartTime = period.endTime;
    } else if (options?.advancePeriodDuration) {
      nextStartTime = clock.readCurrentTime().advance(options.advancePeriodDuration);
    } else {
      // Default: advance 1 day from start time
      const dur = Duration.create({ days: 1 }).data!;
      nextStartTime = clock.readCurrentTime().advance(dur);
    }

    if (!period.endTime) {
      period.endTime = nextStartTime;
    }

    // 4. Build NextPeriodContext preserving active processes, unresolved conditions, future info
    const nextPeriodCtx = createNextPeriodContext({
      sourcePeriodId: period.periodId,
      nextTemporalReference: nextStartTime,
      continuityReferences: ctx.continuityItems,
      activeProcesses: ctx.processes,
      unresolvedConditions: ctx.unresolvedConditions,
      futureInformation: ctx.futureInfo,
      pendingEvents: ctx.events.filter(e => e.status === 'PENDING' || e.status === 'READY')
    });

    // 5. Complete Finalization
    const completeFinalRes = lifecycle.transition(PeriodLifecycleEvent.COMPLETE_FINALIZATION, {
      periodId: period.periodId
    });
    if (!completeFinalRes.success) {
      const msg = `Failed to transition period to FINALIZED: ${completeFinalRes.error?.message}`;
      return failure(
        { code: EngineErrorCode.PERIOD_FINALIZATION_FAILED, message: msg },
        msg
      );
    }
    period.status = lifecycle.getStatus();
    period.finalizationState = 'FINALIZED';

    const openUnresolvedCount = ctx.unresolvedConditions.filter(
      u => u.lifecycleStatus !== 'RESOLVED' && u.lifecycleStatus !== 'CLOSED'
    ).length;
    const activeProcessCount = ctx.processes.filter(p => p.currentStatus === 'ACTIVE').length;

    traces.record({
      operation: 'COMPLETE_FINALIZATION',
      periodId: period.periodId,
      universeTime: clock.readCurrentTime().toCanonical(),
      previousState: DailyUniverseStatus.FINALIZING,
      transition: PeriodLifecycleEvent.COMPLETE_FINALIZATION,
      result: 'FINALIZED',
      affectedReferences: [period.periodId],
      validationResult: { valid: true },
      details: {
        nextStartTime: nextStartTime.toCanonical(),
        openUnresolvedCount,
        activeProcessCount
      }
    });

    return success({
      periodId: period.periodId,
      finalStatus: period.status,
      nextPeriodContext: nextPeriodCtx,
      openUnresolvedCount,
      activeProcessCount
    });
  }
}
