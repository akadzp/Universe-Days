/**
 * Phase 5: Daily Progression Loop & Atomicity.
 * Progresses the period deterministically:
 * Time advancement (explicit only) -> continuity transitions -> events -> processes -> consequences -> unresolved -> trace.
 */

import { UniversePeriodContext } from './initialization.ts';
import { DailyUniverseStatus } from './period.ts';
import { PeriodLifecycleEvent } from './lifecycle.ts';
import { UniverseEventStatus } from './event.ts';
import { UniverseProcessStatus } from './process.ts';
import { ContinuityValidator } from '../continuity/validator.ts';
import { Transition } from '../continuity/transition.ts';
import { ContinuityItem, ContinuityStatus } from '../continuity/continuity-model.ts';
import { Duration } from '../../temporal/duration.ts';
import { TimePoint } from '../../temporal/time-point.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';

export interface ProgressionStepInput {
  advanceTimeBy?: Duration;
  continuityTransitions?: Transition[];
  triggerEventIds?: string[];
  interruptProcessIds?: { processId: string; reason: string }[];
  completeProcessIds?: string[];
  resolveUnresolvedIds?: { unresolvedId: string; resolutionRef: string }[];
}

export interface ProgressionStepResult {
  periodId: string;
  universeTime: string;
  eventsEvaluated: number;
  eventsOccurred: number;
  consequencesTriggered: number;
  activeProcesses: number;
  openUnresolved: number;
  continuityUpdated: number;
  timeAdvanced: boolean;
}

export class ProgressionEngine {
  /**
   * Executes a deterministic progression cycle on the period context.
   * Atomicity: validates inputs and ensures consistent application.
   */
  public static step(
    ctx: UniversePeriodContext,
    input: ProgressionStepInput = {}
  ): Result<ProgressionStepResult, { code: EngineErrorCode; message: string }> {
    const { period, clock, lifecycle, traces } = ctx;

    // Check period lifecycle state
    if (period.status === DailyUniverseStatus.INITIALIZED) {
      const startProgRes = lifecycle.transition(PeriodLifecycleEvent.START_PROGRESSION, {
        periodId: period.periodId
      });
      if (!startProgRes.success) {
        const msg = startProgRes.error?.message ?? 'Cannot start progression';
        return failure(
          { code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE, message: msg },
          msg
        );
      }
      period.status = lifecycle.getStatus();
      period.progressionState = 'PROGRESSING';
    } else if (period.status === DailyUniverseStatus.PROGRESSING) {
      lifecycle.transition(PeriodLifecycleEvent.STEP_PROGRESSION, {
        periodId: period.periodId
      });
    } else {
      const msg = `Cannot progress period in status ${period.status}`;
      return failure(
        { code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE, message: msg },
        msg
      );
    }

    // 1. Advance Universe Time ONLY if explicitly requested
    let timeAdvanced = false;
    if (input.advanceTimeBy) {
      const advRes = clock.advanceTime(input.advanceTimeBy);
      if (!advRes.success) {
        const msg = `Failed to advance Universe Time: ${advRes.message ?? advRes.error}`;
        return failure(
          { code: EngineErrorCode.TEMPORAL_CONFLICT, message: msg },
          msg
        );
      }
      period.currentUniverseTime = clock.readCurrentTime();
      timeAdvanced = true;

      traces.record({
        operation: 'ADVANCE_TIME',
        periodId: period.periodId,
        universeTime: period.currentUniverseTime.toCanonical(),
        previousState: period.status,
        result: 'SUCCESS',
        affectedReferences: [period.periodId],
        validationResult: { valid: true }
      });
    }

    const currentClockTime = clock.readCurrentTime();

    // 2. Apply validated continuity transitions atomically
    let continuityUpdated = 0;
    if (input.continuityTransitions && input.continuityTransitions.length > 0) {
      // Atomic pre-validation: validate all transitions before mutating
      for (const t of input.continuityTransitions) {
        const item = ctx.continuityItems.find(i => i.identity.continuityId === t.continuityId);
        if (!item) {
          const msg = `Continuity item ${t.continuityId} not found in period context`;
          return failure(
            { code: EngineErrorCode.MISSING_CURRENT_CONDITION, message: msg },
            msg
          );
        }
        const val = ContinuityValidator.validateTransition({ item, transition: t });
        if (!val.allowed) {
          const msg = `Atomic transition rejected for continuity ${t.continuityId}: ${val.findings.map(f => f.message).join('; ')}`;
          return failure(
            { code: EngineErrorCode.ATOMIC_TRANSITION_FAILED, message: msg },
            msg
          );
        }
      }

      // Apply
      for (const t of input.continuityTransitions) {
        const itemIndex = ctx.continuityItems.findIndex(i => i.identity.continuityId === t.continuityId);
        if (itemIndex >= 0) {
          const item = ctx.continuityItems[itemIndex];
          const val = ContinuityValidator.validateTransition({ item, transition: t });
          const updatedItem: ContinuityItem = {
            ...item,
            status: (val.resultingStatus as ContinuityStatus) ?? item.status,
            currentConditionRef: t.currentConditionRef ?? item.currentConditionRef,
            identity: {
              ...item.identity,
              version: typeof item.identity.version === 'number' ? item.identity.version + 1 : `${item.identity.version}.1`
            }
          };
          ctx.continuityItems[itemIndex] = updatedItem;
          continuityUpdated++;
        }
      }
    }

    // 3. Process Event readiness and explicit trigger requests
    let eventsEvaluated = 0;
    let eventsOccurred = 0;
    let consequencesTriggered = 0;

    // Evaluate pending events against current clock
    for (const event of ctx.events) {
      if (event.status === UniverseEventStatus.PENDING) {
        eventsEvaluated++;
        const parsed = TimePoint.parse(event.temporalReference);
        if (parsed.success && parsed.data) {
          // If event temporal target is reached or passed, mark ready
          if (parsed.data.toCanonical() <= currentClockTime.toCanonical()) {
            event.status = UniverseEventStatus.READY;
            for (const p of event.prerequisites) {
              if (p.type === 'TEMPORAL') {
                p.satisfied = true;
              }
            }
          }
        }
      }
    }

    // Explicitly trigger requested events
    if (input.triggerEventIds && input.triggerEventIds.length > 0) {
      for (const eventId of input.triggerEventIds) {
        const ev = ctx.events.find(e => e.eventId === eventId);
        if (!ev) {
          const msg = `Event to trigger not found: ${eventId}`;
          return failure(
            { code: EngineErrorCode.INVALID_EVENT_TRANSITION, message: msg },
            msg
          );
        }
        if (ev.status === UniverseEventStatus.CANCELLED || ev.status === UniverseEventStatus.FAILED) {
          const msg = `Cannot occur cancelled/failed event: ${eventId}`;
          return failure(
            { code: EngineErrorCode.INVALID_EVENT_TRANSITION, message: msg },
            msg
          );
        }
        for (const p of ev.prerequisites) {
          if (p.type === 'TEMPORAL') {
            const parsed = TimePoint.parse(ev.temporalReference);
            if (parsed.success && parsed.data && parsed.data.toCanonical() <= currentClockTime.toCanonical()) {
              p.satisfied = true;
            }
          }
        }
        ev.status = UniverseEventStatus.OCCURRED;
        eventsOccurred++;

        traces.record({
          operation: 'EVENT_OCCURRED',
          periodId: period.periodId,
          universeTime: currentClockTime.toCanonical(),
          previousState: 'READY',
          transition: 'OCCUR',
          result: 'OCCURRED',
          affectedReferences: [eventId],
          validationResult: { valid: true }
        });
      }
    }

    // 4. Progress active processes (interrupt, complete)
    if (input.interruptProcessIds) {
      for (const req of input.interruptProcessIds) {
        const proc = ctx.processes.find(p => p.processId === req.processId);
        if (proc && proc.currentStatus === UniverseProcessStatus.ACTIVE) {
          proc.currentStatus = UniverseProcessStatus.INTERRUPTED;
          proc.metadata = { ...proc.metadata, interruptReason: req.reason };
        }
      }
    }

    if (input.completeProcessIds) {
      for (const procId of input.completeProcessIds) {
        const proc = ctx.processes.find(p => p.processId === procId);
        if (proc && (proc.currentStatus === UniverseProcessStatus.ACTIVE || proc.currentStatus === UniverseProcessStatus.PAUSED)) {
          proc.currentStatus = UniverseProcessStatus.COMPLETED;
        }
      }
    }

    // 5. Explicitly resolve unresolved conditions
    if (input.resolveUnresolvedIds) {
      for (const req of input.resolveUnresolvedIds) {
        const unres = ctx.unresolvedConditions.find(u => u.unresolvedId === req.unresolvedId);
        if (unres && unres.lifecycleStatus !== 'CLOSED') {
          unres.lifecycleStatus = 'RESOLVED' as any;
          unres.resolutionReference = req.resolutionRef;
        }
      }
    }

    const activeProcesses = ctx.processes.filter(p => p.currentStatus === UniverseProcessStatus.ACTIVE).length;
    const openUnresolved = ctx.unresolvedConditions.filter(
      u => u.lifecycleStatus !== 'RESOLVED' && u.lifecycleStatus !== 'CLOSED'
    ).length;

    traces.record({
      operation: 'PROGRESSION_STEP',
      periodId: period.periodId,
      universeTime: currentClockTime.toCanonical(),
      previousState: DailyUniverseStatus.PROGRESSING,
      result: 'SUCCESS',
      affectedReferences: [period.periodId],
      validationResult: { valid: true },
      details: {
        eventsOccurred,
        continuityUpdated,
        activeProcesses,
        openUnresolved,
        timeAdvanced
      }
    });

    return success({
      periodId: period.periodId,
      universeTime: currentClockTime.toCanonical(),
      eventsEvaluated,
      eventsOccurred,
      consequencesTriggered,
      activeProcesses,
      openUnresolved,
      continuityUpdated,
      timeAdvanced
    });
  }
}
