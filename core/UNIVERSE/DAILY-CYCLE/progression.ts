/**
 * Phase 5: Daily Progression Loop & Atomicity.
 * Progresses the period deterministically:
 * Time advancement (explicit only) -> continuity transitions -> events -> processes -> consequences -> unresolved -> trace.
 */

import type { UniversePeriodContext } from '../../UNIVERSE/DAILY-CYCLE/initialization.ts';
import { DailyUniverseStatus } from '../../UNIVERSE/DAILY-CYCLE/period.ts';
import { PeriodLifecycleEvent } from '../../UNIVERSE/DAILY-CYCLE/lifecycle.ts';
import { UniverseEventStatus } from '../../UNIVERSE/DAILY-CYCLE/event.ts';
import { UniverseProcessStatus, ProcessRegistry } from '../../UNIVERSE/DAILY-CYCLE/process.ts';
import { ContinuityValidator } from '../../UNIVERSE/CONTINUITY/validator.ts';
import { Transition } from '../../UNIVERSE/CONTINUITY/transition.ts';
import { ContinuityItem, ContinuityStatus } from '../../UNIVERSE/CONTINUITY/continuity-model.ts';
import { Duration } from '../../RUNTIME/TEMPORAL/duration.ts';
import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { EventRegistry } from '../../UNIVERSE/DAILY-CYCLE/event.ts';
import { UnresolvedConditionRegistry } from '../../UNIVERSE/DAILY-CYCLE/unresolved.ts';
import { ConsequenceMediator } from '../../UNIVERSE/DAILY-CYCLE/consequence-mediator.ts';

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

    // 3. Process Event readiness and explicit trigger requests through lifecycle authority.
    let eventsEvaluated = 0;
    let eventsOccurred = 0;
    let consequencesTriggered = 0;

    const eventRegistry = new EventRegistry(ctx.events);
    const satisfiedDependencies = new Set<string>(ctx.events.filter(e => e.status === UniverseEventStatus.OCCURRED).map(e => e.eventId));
    const stateFlags = new Map<string, unknown>();

    for (const event of ctx.events) {
      if (event.status !== UniverseEventStatus.PENDING) continue;
      eventsEvaluated++;
      const ready = eventRegistry.evaluateReadiness(event.eventId, {
        currentUniverseTime: currentClockTime,
        satisfiedDependencies,
        stateFlags
      });
      if (!ready.success || !ready.data) {
        return failure({ code: EngineErrorCode.INVALID_EVENT_TRANSITION, message: ready.message ?? `Could not evaluate Event '${event.eventId}'.` }, ready.message);
      }
    }

    for (const eventId of input.triggerEventIds ?? []) {
      const ev = eventRegistry.get(eventId);
      if (!ev) {
        const msg = `Event to trigger not found: ${eventId}`;
        return failure({ code: EngineErrorCode.INVALID_EVENT_TRANSITION, message: msg }, msg);
      }
      const occurred = eventRegistry.markOccurred(eventId);
      if (!occurred.success || !occurred.data) {
        const msg = occurred.message ?? `Event '${eventId}' could not become OCCURRED.`;
        return failure({ code: EngineErrorCode.INVALID_EVENT_TRANSITION, message: msg }, msg);
      }
      ctx.events.splice(ctx.events.findIndex(e => e.eventId === eventId), 1, occurred.data);
      satisfiedDependencies.add(eventId);
      eventsOccurred++;

      traces.record({
        operation: 'EVENT_OCCURRED',
        periodId: period.periodId,
        universeTime: currentClockTime.toCanonical(),
        previousState: ev.status,
        transition: 'OCCUR',
        result: 'OCCURRED',
        affectedReferences: [eventId],
        validationResult: { valid: true }
      });
    }

    // 4. Progress Processes through ProcessRegistry rather than raw status replacement.
    const processRegistry = new ProcessRegistry(ctx.processes);
    for (const req of input.interruptProcessIds ?? []) {
      const res = processRegistry.interrupt(req.processId, req.reason);
      if (!res.success || !res.data) {
        return failure({ code: EngineErrorCode.INVALID_PROCESS_TRANSITION, message: res.message ?? `Cannot interrupt process '${req.processId}'.` }, res.message);
      }
    }
    for (const procId of input.completeProcessIds ?? []) {
      const res = processRegistry.complete(procId, `Explicit completion request at ${currentClockTime.toCanonical()}`);
      if (!res.success || !res.data) {
        return failure({ code: EngineErrorCode.INVALID_PROCESS_TRANSITION, message: res.message ?? `Cannot complete process '${procId}'.` }, res.message);
      }
    }
    ctx.processes.splice(0, ctx.processes.length, ...processRegistry.getAll());

    // 5. Resolve unresolved conditions through their lifecycle registry.
    const unresolvedRegistry = new UnresolvedConditionRegistry(ctx.unresolvedConditions);
    for (const req of input.resolveUnresolvedIds ?? []) {
      const res = unresolvedRegistry.resolve(req.unresolvedId, req.resolutionRef);
      if (!res.success || !res.data) {
        return failure({ code: EngineErrorCode.UNRESOLVED_CONDITION_ERROR, message: res.message ?? `Cannot resolve '${req.unresolvedId}'.` }, res.message);
      }
    }
    ctx.unresolvedConditions.splice(0, ctx.unresolvedConditions.length, ...unresolvedRegistry.getAll());

    // 6. Central consequence mediation. It may trigger lifecycle and emit proposals,
    // but it never mutates a foreign Canon domain itself.
    const mediation = ConsequenceMediator.mediate(ctx.events, ctx.consequences, currentClockTime.toCanonical());
    if (!mediation.success || !mediation.data) {
      return failure({ code: EngineErrorCode.INVALID_CONDITION, message: mediation.message ?? 'Consequence mediation failed.' }, mediation.message);
    }
    consequencesTriggered = mediation.data.triggered;
    ctx.consequences.splice(0, ctx.consequences.length, ...mediation.data.consequences);
    ctx.metadata = {
      ...ctx.metadata,
      consequenceProposals: mediation.data.proposals
    };

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
