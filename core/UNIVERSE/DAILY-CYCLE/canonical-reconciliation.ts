import { SystemID, makeDomainID, makeSystemID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { UniverseModel, UniverseModelFactory, UniversePeriodRecord } from '../CANON/universe.ts';
import { UniversePeriod } from './period.ts';
import type { UniversePeriodContext, FinalizationResult } from './contracts.ts';
import { UniverseEventStatus } from './event.ts';
import { reconcileProcess, PROCESS_SYSTEM_ACTOR } from '../CANON/process-authority.ts';
import { reconcileUnresolved, UNRESOLVED_SYSTEM_ACTOR } from '../CANON/unresolved-authority.ts';
import { CanonicalEventAuthority, EVENT_SYSTEM_ACTOR } from '../CANON/event-authority.ts';

export interface DailyCanonicalReconciliationOptions {
  readonly finalization?: FinalizationResult;
  readonly actor?: SystemID;
}

export class DailyCanonicalReconciliationService {
  public static reconcile(
    universe: UniverseModel,
    periodOrContext: UniversePeriod | UniversePeriodContext,
    options?: DailyCanonicalReconciliationOptions
  ): Result<UniverseModel> {
    const actor = options?.actor ?? makeSystemID('DAILY_UNIVERSE_SYSTEM');
    if (actor !== makeSystemID('DAILY_UNIVERSE_SYSTEM')) {
      return failure(`Daily reconciliation coordinator '${actor}' is not authorized to orchestrate Daily → Canon reconciliation.`, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
    }

    const period: UniversePeriod = 'period' in periodOrContext ? periodOrContext.period : periodOrContext;
    const ctx: UniversePeriodContext | undefined = 'period' in periodOrContext ? periodOrContext : undefined;
    const periodEndTime = period.endTime?.toCanonical() ?? period.currentUniverseTime.toCanonical();
    const periodEndDate = period.endTime?.date?.toCanonical() ?? period.currentUniverseTime.date?.toCanonical();
    if (!periodEndDate) return failure('Daily reconciliation requires a resolvable Universe date.', EngineErrorCode.INVALID_TIME_POINT);

    const updatedPeriods: Record<string, UniversePeriodRecord> = { ...(universe.periods ?? {}) };
    updatedPeriods[period.periodId] = Object.freeze({
      periodId: period.periodId,
      universeScope: period.universeScope,
      startTime: period.startTime.toCanonical(),
      endTime: periodEndTime,
      sequenceNumber: period.isFirstPeriod ? 1 : (universe.temporalContext.periodSequence ? universe.temporalContext.periodSequence + 1 : 1),
      status: period.status,
      previousPeriodRef: period.previousPeriodRef,
      isFirstPeriod: period.isFirstPeriod,
      openUnresolvedCount: options?.finalization?.openUnresolvedCount ?? ctx?.unresolvedConditions.filter(u => !['RESOLVED', 'CLOSED'].includes(u.lifecycleStatus)).length,
      activeProcessCount: options?.finalization?.activeProcessCount ?? ctx?.processes.filter(p => p.currentStatus === 'ACTIVE').length
    });

    let events = { ...(universe.events ?? {}) };
    let processes = { ...(universe.processes ?? {}) };
    let unresolvedConditions = { ...(universe.unresolvedConditions ?? {}) };
    const activeConditionRefs = new Set<string>();

    for (const unresolved of ctx?.unresolvedConditions ?? []) {
      if (!['RESOLVED', 'CLOSED'].includes(unresolved.lifecycleStatus)) activeConditionRefs.add(unresolved.unresolvedId);
      const existing = unresolvedConditions[unresolved.unresolvedId];
      if (!existing) {
        return failure(`Daily Unresolved '${unresolved.unresolvedId}' does not exist in Canon. Creation requires an explicit canonical-owner command.`, EngineErrorCode.MISSING_REQUIRED_CONTEXT);
      }
      const next = reconcileUnresolved(existing, unresolved.lifecycleStatus, unresolved.resolutionReference, UNRESOLVED_SYSTEM_ACTOR, periodEndTime);
      if (!next.success || !next.data) return failure(next.error ?? EngineErrorCode.UNRESOLVED_CONDITION_ERROR, next.message);
      unresolvedConditions[unresolved.unresolvedId] = next.data;
    }

    for (const process of ctx?.processes ?? []) {
      const existing = processes[process.processId];
      if (!existing) {
        return failure(`Daily Process '${process.processId}' does not exist in Canon. Creation requires an explicit canonical-owner command.`, EngineErrorCode.MISSING_REQUIRED_CONTEXT);
      }
      const next = reconcileProcess(existing, process.currentStatus, PROCESS_SYSTEM_ACTOR, periodEndTime);
      if (!next.success || !next.data) return failure(next.error ?? EngineErrorCode.INVALID_PROCESS_TRANSITION, next.message);
      processes[process.processId] = next.data;
    }

    for (const dailyEvent of ctx?.events ?? []) {
      const existing = events[dailyEvent.eventId];
      if (!existing) {
        if (dailyEvent.status === UniverseEventStatus.PENDING || dailyEvent.status === UniverseEventStatus.READY) continue;
        return failure(`Daily Event '${dailyEvent.eventId}' does not exist in Canon. Creation requires canonical event metadata and EVENT_SYSTEM authorization.`, EngineErrorCode.MISSING_REQUIRED_CONTEXT);
      }
      const transition = CanonicalEventAuthority.mapDailyStatus(dailyEvent.status);
      if (!transition) continue;
      const next = CanonicalEventAuthority.transition(existing, transition, EVENT_SYSTEM_ACTOR, periodEndTime);
      if (!next.success || !next.data) return failure(next.error ?? EngineErrorCode.INVALID_EVENT_TRANSITION, next.message);
      events[dailyEvent.eventId] = next.data;
    }

    const nextSeq = period.isFirstPeriod ? 1 : (universe.temporalContext.periodSequence ? universe.temporalContext.periodSequence + 1 : 1);
    const source = makeSystemID('DAILY_UNIVERSE_SYSTEM');

    return success(UniverseModelFactory.evolve(universe, {
      universeDate: periodEndDate,
      universeTime: periodEndTime,
      periodRef: period.periodId,
      previousPeriodRef: period.previousPeriodRef,
      periodSequence: nextSeq,
      periodLifecycleState: period.status,
      events,
      processes,
      unresolvedConditions,
      periods: updatedPeriods,
      continuityContext: {
        activeConditionRefs: Array.from(activeConditionRefs),
        activeChainRefs: universe.continuityContext.activeChainRefs
      },
      sourceSystem: source,
      effectiveTime: periodEndTime,
      changedFields: [
        'temporalContext',
        'periods',
        ...(ctx?.events?.length ? ['events'] : []),
        ...(ctx?.processes?.length ? ['processes'] : []),
        ...(ctx?.unresolvedConditions?.length ? ['unresolvedConditions'] : []),
        ...(activeConditionRefs.size ? ['continuityContext.activeConditionRefs'] : [])
      ],
      reason: `Daily period '${period.periodId}' reconciled into Canon`
    }));
  }
}
