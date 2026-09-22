/**
 * Phase 5 / Phase 36: Authoritative Daily Universe Continuation
 *
 * Implements deterministic continuation of Daily Universe periods across boundaries.
 * Enforces authoritative predecessor discovery from UniverseModel without trusting
 * unilateral caller assertions or inventing synthetic history.
 */

import { TimePoint } from '../../temporal/time-point.ts';
import { Result, success, failure, blocked } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { makeDomainID, makeEntityID, makeSystemID, makeRequestID, EntityID } from '../../types/identifiers.ts';
import { TemporalStatus } from '../../types/temporal.ts';
import { UniverseModel, UniversePeriodRecord } from '../model/universe.ts';
import { AuthorityLevel, ModelValidationStatus } from '../model/types.ts';
import { createProvenanceMetadata } from '../model/provenance.ts';
import { RevisionHistoryManager } from '../model/history.ts';
import { ProcessEntity, ProcessStatus } from '../model/process.ts';
import { UnresolvedConditionEntity, UnresolvedConditionStatus } from '../model/unresolved.ts';
import { DailyUniverseStatus, PeriodIdentity, UniversePeriod } from './period.ts';
import { PeriodInitializer, UniversePeriodContext } from './initialization.ts';
import { ContinuityItem } from '../continuity/continuity-model.ts';
import { UniverseProcess, UniverseProcessStatus } from './process.ts';
import { UnresolvedCondition, UnresolvedStatus } from './unresolved.ts';
import { FutureInformation } from './decision-action.ts';
import { UniverseEvent } from './event.ts';
import { FinalizationResult } from './finalization.ts';

export type PredecessorDiscoveryStatus =
  | 'GENUINELY_NEW'
  | 'HAS_PREDECESSOR'
  | 'PREDECESSOR_BLOCKED'
  | 'PREDECESSOR_INVALID';

export interface PredecessorDiscoveryResult {
  readonly isFirstPeriod: boolean;
  readonly predecessorPeriodRef?: string;
  readonly predecessorRecord?: UniversePeriodRecord;
  readonly expectedSequenceNumber: number;
  readonly predecessorStartTime?: string;
  readonly predecessorEndTime?: string;
  readonly predecessorStatus?: string;
  readonly status: PredecessorDiscoveryStatus;
  readonly blockedReason?: string;
}

export interface AuthoritativeContinuationOptions {
  readonly startTime?: TimePoint;
  readonly endTime?: TimePoint;
  readonly universeScope?: string;
  readonly previousPeriodRef?: string;
  readonly sequenceNumber?: number;
  readonly isFirstPeriod?: boolean;
  readonly previousContinuityItems?: ContinuityItem[];
  readonly previousUnresolvedConditions?: UnresolvedCondition[];
  readonly previousProcesses?: UniverseProcess[];
  readonly previousFutureInfo?: FutureInformation[];
  readonly initialEvents?: UniverseEvent[];
}

export class DailyUniverseContinuation {
  private static readonly DAILY_UNIVERSE_SYSTEM_ACTOR = makeSystemID('DAILY_UNIVERSE_SYSTEM');

  /**
   * Discovers authoritative predecessor information directly from the authoritative Universe model.
   */
  public static discoverPredecessor(
    universe: UniverseModel,
    scope: string = 'UNIVERSE_DEFAULT'
  ): PredecessorDiscoveryResult {
    const currentPeriodRef = universe.temporalContext?.currentPeriodRef;
    const periodsMap = universe.periods ?? {};

    // 1. Genuinely new Universe: no currentPeriodRef and no period records
    if (!currentPeriodRef && Object.keys(periodsMap).length === 0) {
      return Object.freeze({
        isFirstPeriod: true,
        expectedSequenceNumber: 1,
        status: 'GENUINELY_NEW'
      });
    }

    // 2. Predecessor reference exists
    const predRef = currentPeriodRef ?? Object.keys(periodsMap)[Object.keys(periodsMap).length - 1];
    const predRecord: UniversePeriodRecord | undefined = periodsMap[predRef];

    const predStatus =
      predRecord?.status ??
      universe.temporalContext?.periodLifecycleState ??
      DailyUniverseStatus.FINALIZED;

    // Check if predecessor is blocked or failed
    if (predStatus === DailyUniverseStatus.BLOCKED || predStatus === 'BLOCKED') {
      return Object.freeze({
        isFirstPeriod: false,
        predecessorPeriodRef: predRef,
        predecessorRecord: predRecord,
        expectedSequenceNumber: (predRecord?.sequenceNumber ?? universe.temporalContext?.periodSequence ?? 1) + 1,
        predecessorStartTime: predRecord?.startTime,
        predecessorEndTime: predRecord?.endTime,
        predecessorStatus: predStatus,
        status: 'PREDECESSOR_BLOCKED',
        blockedReason: `Predecessor period '${predRef}' is in BLOCKED state. Continuation requires resolution.`
      });
    }

    if (predStatus === DailyUniverseStatus.FAILED || predStatus === 'FAILED') {
      return Object.freeze({
        isFirstPeriod: false,
        predecessorPeriodRef: predRef,
        predecessorRecord: predRecord,
        expectedSequenceNumber: (predRecord?.sequenceNumber ?? universe.temporalContext?.periodSequence ?? 1) + 1,
        predecessorStartTime: predRecord?.startTime,
        predecessorEndTime: predRecord?.endTime,
        predecessorStatus: predStatus,
        status: 'PREDECESSOR_BLOCKED',
        blockedReason: `Predecessor period '${predRef}' FAILED. Cannot continue from failed period without explicit resolution.`
      });
    }

    // Derive predecessor sequence number
    let predSeq = 1;
    if (predRecord && typeof predRecord.sequenceNumber === 'number' && predRecord.sequenceNumber >= 1) {
      predSeq = predRecord.sequenceNumber;
    } else if (typeof universe.temporalContext?.periodSequence === 'number' && universe.temporalContext.periodSequence >= 1) {
      predSeq = universe.temporalContext.periodSequence;
    } else {
      const match = predRef.match(/_S([0-9]{4})$/);
      if (match) {
        predSeq = parseInt(match[1], 10);
      }
    }

    return Object.freeze({
      isFirstPeriod: false,
      predecessorPeriodRef: predRef,
      predecessorRecord: predRecord,
      expectedSequenceNumber: predSeq + 1,
      predecessorStartTime: predRecord?.startTime ?? universe.temporalContext?.currentUniverseTime,
      predecessorEndTime: predRecord?.endTime,
      predecessorStatus: predStatus,
      status: 'HAS_PREDECESSOR'
    });
  }

  /**
   * Validates continuation parameters against the authoritative Universe state.
   */
  public static validateContinuation(
    universe: UniverseModel,
    discovery: PredecessorDiscoveryResult,
    options: AuthoritativeContinuationOptions
  ): Result<true, { code: EngineErrorCode; message: string }> {
    const scope = options.universeScope ?? 'UNIVERSE_DEFAULT';

    // 1. Caller cannot force FIRST_PERIOD on Universe with existing predecessor
    if (options.isFirstPeriod === true && discovery.status !== 'GENUINELY_NEW') {
      const msg = `Cannot force isFirstPeriod=true on Universe '${universe.universeId}' which already has authoritative period history ('${discovery.predecessorPeriodRef}').`;
      return failure({ code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE, message: msg }, msg);
    }

    // 2. Predecessor reference validation
    if (discovery.status === 'GENUINELY_NEW') {
      if (options.previousPeriodRef) {
        const msg = `Invalid predecessor: Universe '${universe.universeId}' has no prior period history, but caller specified previousPeriodRef '${options.previousPeriodRef}'.`;
        return failure({ code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE, message: msg }, msg);
      }
      if (options.sequenceNumber !== undefined && options.sequenceNumber !== 1) {
        const msg = `Invalid sequence: First period must have sequenceNumber 1, found ${options.sequenceNumber}.`;
        return failure({ code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE, message: msg }, msg);
      }
    } else {
      // HAS_PREDECESSOR or PREDECESSOR_BLOCKED
      if (discovery.status === 'PREDECESSOR_BLOCKED') {
        const msg = discovery.blockedReason ?? `Predecessor period '${discovery.predecessorPeriodRef}' does not allow continuation.`;
        return blocked({ code: EngineErrorCode.PERIOD_BLOCKED, message: msg }, msg);
      }

      if (options.previousPeriodRef) {
        const periodsMap = universe.periods ?? {};
        const isKnownPeriod =
          options.previousPeriodRef === discovery.predecessorPeriodRef ||
          Boolean(periodsMap[options.previousPeriodRef]);

        if (!isKnownPeriod) {
          const msg = `Invalid predecessor: previousPeriodRef '${options.previousPeriodRef}' was not found in authoritative Universe history. Expected '${discovery.predecessorPeriodRef}'.`;
          return failure({ code: EngineErrorCode.PERIOD_INITIALIZATION_FAILED, message: msg }, msg);
        }

        // Validate scope alignment
        const scopeMatch = options.previousPeriodRef.match(/^PERIOD_([A-Za-z0-9_]+)_/);
        if (scopeMatch && scopeMatch[1] !== scope) {
          const msg = `Wrong Universe scope: predecessor period '${options.previousPeriodRef}' belongs to scope '${scopeMatch[1]}', expected '${scope}'.`;
          return failure({ code: EngineErrorCode.PERIOD_INITIALIZATION_FAILED, message: msg }, msg);
        }
      }

      // 3. Sequence number contract enforcement
      if (options.sequenceNumber !== undefined && options.sequenceNumber !== discovery.expectedSequenceNumber) {
        const msg = `Invalid sequence: successor sequence '${options.sequenceNumber}' does not match expected sequence '${discovery.expectedSequenceNumber}' (predecessor sequence was ${discovery.expectedSequenceNumber - 1}).`;
        return failure({ code: EngineErrorCode.PERIOD_INITIALIZATION_FAILED, message: msg }, msg);
      }
    }

    // 4. Temporal progression validation
    if (options.startTime && discovery.predecessorStartTime) {
      const startMs = Date.parse(options.startTime.toCanonical());
      const predMs = Date.parse(discovery.predecessorStartTime);
      if (!isNaN(startMs) && !isNaN(predMs) && startMs < predMs) {
        const msg = `Invalid temporal progression: next period startTime '${options.startTime.toCanonical()}' precedes predecessor startTime '${discovery.predecessorStartTime}'.`;
        return failure({ code: EngineErrorCode.TEMPORAL_CONSTRAINT_VIOLATION, message: msg }, msg);
      }
    }

    // 5. Duplicate successor check
    if (options.startTime) {
      const candidateId = PeriodIdentity.derive(
        options.startTime,
        options.sequenceNumber ?? discovery.expectedSequenceNumber,
        scope
      );
      if (
        (universe.periods && universe.periods[candidateId]) ||
        universe.temporalContext?.currentPeriodRef === candidateId
      ) {
        const msg = `Duplicate successor: Period '${candidateId}' already exists in authoritative Universe history.`;
        return failure({ code: EngineErrorCode.PERIOD_INITIALIZATION_FAILED, message: msg }, msg);
      }
    }

    // 6. Dangling carryover references check against authoritative entities
    const knownEntityIds = new Set<string>();
    const knownLocationIds = new Set<string>();
    const nonLocationIds = new Set<string>();

    for (const id of Object.keys(universe.characters || {})) {
      knownEntityIds.add(id);
      nonLocationIds.add(id);
    }
    for (const id of Object.keys(universe.objects || {})) {
      knownEntityIds.add(id);
      nonLocationIds.add(id);
    }
    for (const id of Object.keys(universe.states || {})) {
      knownEntityIds.add(id);
      nonLocationIds.add(id);
    }
    for (const id of Object.keys(universe.locations || {})) {
      knownEntityIds.add(id);
      knownLocationIds.add(id);
    }

    // Validate location references in carryover processes
    for (const proc of options.previousProcesses ?? []) {
      const locRef = (proc.metadata as Record<string, unknown> | undefined)?.locationRef;
      if (typeof locRef === 'string' && locRef !== 'UNKNOWN') {
        if (nonLocationIds.has(locRef)) {
          const msg = `Invalid Location reference: Process '${proc.processId}' location reference '${locRef}' points to a non-location entity.`;
          return failure({ code: EngineErrorCode.INVALID_ENTITY_REFERENCE, message: msg }, msg);
        }
        if (!knownLocationIds.has(locRef)) {
          const msg = `Dangling Location reference: Process '${proc.processId}' location '${locRef}' not found in authoritative locations.`;
          return failure({ code: EngineErrorCode.INVALID_ENTITY_REFERENCE, message: msg }, msg);
        }
      }
    }

    // Validate continuity item entities
    for (const item of options.previousContinuityItems ?? []) {
      if (item.identity?.entityRef && !knownEntityIds.has(item.identity.entityRef)) {
        const msg = `Dangling carryover reference: Continuity item '${item.identity.continuityId}' entity '${item.identity.entityRef}' not found in authoritative Universe.`;
        return failure({ code: EngineErrorCode.INVALID_ENTITY_REFERENCE, message: msg }, msg);
      }
    }

    return success(true);
  }

  /**
   * Initializes a Daily Universe period using authoritative Universe predecessor state and carryovers.
   */
  public static initializeAuthoritativePeriod(
    universe: UniverseModel,
    options: AuthoritativeContinuationOptions = {}
  ): Result<UniversePeriodContext, { code: EngineErrorCode; message: string }> {
    const scope = options.universeScope ?? 'UNIVERSE_DEFAULT';

    // 1. Authoritative Predecessor Discovery
    const discovery = this.discoverPredecessor(universe, scope);

    // 2. Validate continuation
    const valRes = this.validateContinuation(universe, discovery, options);
    if (!valRes.success) {
      return failure(valRes.error!, valRes.message);
    }

    // 3. Resolve start time from authoritative temporal context if not explicitly provided
    let startTime = options.startTime;
    if (!startTime) {
      const rawTime = universe.temporalContext.currentUniverseTime || universe.temporalContext.currentUniverseDate;
      const parseRes = TimePoint.parse(rawTime);
      if (!parseRes.success || !parseRes.data) {
        const msg = `Could not parse authoritative Universe temporal context '${rawTime}' as TimePoint: ${parseRes.message}`;
        return failure({ code: EngineErrorCode.INVALID_TIME_POINT, message: msg }, msg);
      }
      startTime = parseRes.data;
    }

    // 4. Inherit unresolved conditions from UniverseModel (if not explicitly overridden)
    const inheritedUnresolved: UnresolvedCondition[] = [...(options.previousUnresolvedConditions ?? [])];
    const suppliedUnresIds = new Set(inheritedUnresolved.map(u => u.unresolvedId));

    for (const [id, entity] of Object.entries(universe.unresolvedConditions ?? {})) {
      if (suppliedUnresIds.has(id)) continue;
      if (entity.currentStatus !== 'RESOLVED' && entity.currentStatus !== 'ABANDONED') {
        inheritedUnresolved.push({
          unresolvedId: entity.conditionId,
          sourceReference: entity.ownerDomain,
          temporalReference: entity.temporalScope.effectiveFrom,
          reason: entity.description,
          ownerReference: entity.targetEntityRef,
          priority: 'MEDIUM',
          lifecycleStatus: entity.currentStatus === 'CARRYOVER' ? UnresolvedStatus.ACTIVE : UnresolvedStatus.UNRESOLVED,
          traceability: {
            requestId: makeRequestID('REQ_UNRES_CARRYOVER'),
            sourceSystem: entity.sourceSystem ?? this.DAILY_UNIVERSE_SYSTEM_ACTOR,
            timestamp: Date.now(),
            version: '1.0.0'
          }
        });
      }
    }

    // 5. Inherit active processes from UniverseModel (if not explicitly overridden)
    const inheritedProcesses: UniverseProcess[] = [...(options.previousProcesses ?? [])];
    const suppliedProcIds = new Set(inheritedProcesses.map(p => p.processId));

    for (const [id, entity] of Object.entries(universe.processes ?? {})) {
      if (suppliedProcIds.has(id)) continue;
      // Do not carry over completed or terminated processes
      if (entity.currentStatus !== 'COMPLETED' && entity.currentStatus !== 'TERMINATED') {
        let dailyStatus = UniverseProcessStatus.ACTIVE;
        if (entity.currentStatus === 'PAUSED') dailyStatus = UniverseProcessStatus.PAUSED;
        else if (entity.currentStatus === 'BLOCKED') dailyStatus = UniverseProcessStatus.SUSPENDED;

        inheritedProcesses.push({
          processId: entity.processId,
          startReference: entity.startTime,
          currentStatus: dailyStatus,
          dependencies: [...entity.dependencies],
          completionCriteria: entity.endCondition ? [entity.endCondition] : undefined,
          metadata: entity.locationRef ? { locationRef: entity.locationRef } : undefined,
          traceability: {
            requestId: makeRequestID('REQ_PROC_CARRYOVER'),
            sourceSystem: entity.sourceSystem ?? this.DAILY_UNIVERSE_SYSTEM_ACTOR,
            timestamp: Date.now(),
            version: '1.0.0'
          }
        });
      }
    }

    // 6. Execute initialization via PeriodInitializer with authoritative predecessor parameters
    const initParams = {
      startTime,
      endTime: options.endTime,
      previousPeriodRef: discovery.isFirstPeriod ? undefined : (options.previousPeriodRef ?? discovery.predecessorPeriodRef),
      sequenceNumber: options.sequenceNumber ?? discovery.expectedSequenceNumber,
      universeScope: scope,
      previousContinuityItems: options.previousContinuityItems ?? [],
      previousUnresolvedConditions: inheritedUnresolved,
      previousProcesses: inheritedProcesses,
      previousFutureInfo: options.previousFutureInfo ?? [],
      initialEvents: options.initialEvents ?? []
    };

    return PeriodInitializer.initialize(initParams);
  }

  /**
   * Records a completed or finalized period into the authoritative UniverseModel snapshot.
   * Preserves immutability and domain ownership invariants.
   */
  public static recordPeriodToUniverse(
    universe: UniverseModel,
    periodOrCtx: UniversePeriod | UniversePeriodContext,
    options?: { finalization?: FinalizationResult }
  ): UniverseModel {
    const period: UniversePeriod = 'period' in periodOrCtx ? periodOrCtx.period : periodOrCtx;
    const ctx: UniversePeriodContext | undefined = 'period' in periodOrCtx ? periodOrCtx : undefined;

    const source = this.DAILY_UNIVERSE_SYSTEM_ACTOR;
    const periodEndTime = period.endTime?.toCanonical() ?? period.currentUniverseTime.toCanonical();
    const periodEndDate = period.endTime?.date?.toCanonical() ?? period.currentUniverseTime.date?.toCanonical() ?? universe.temporalContext.currentUniverseDate;

    // Build period record
    const periodRecord: UniversePeriodRecord = Object.freeze({
      periodId: period.periodId,
      universeScope: period.universeScope,
      startTime: period.startTime.toCanonical(),
      endTime: periodEndTime,
      sequenceNumber: period.isFirstPeriod ? 1 : (universe.temporalContext?.periodSequence ? universe.temporalContext.periodSequence + 1 : 1),
      status: period.status,
      previousPeriodRef: period.previousPeriodRef,
      isFirstPeriod: period.isFirstPeriod,
      openUnresolvedCount: options?.finalization?.openUnresolvedCount ?? ctx?.unresolvedConditions.filter(u => u.lifecycleStatus !== UnresolvedStatus.RESOLVED && u.lifecycleStatus !== UnresolvedStatus.CLOSED).length,
      activeProcessCount: options?.finalization?.activeProcessCount ?? ctx?.processes.filter(p => p.currentStatus === UniverseProcessStatus.ACTIVE).length
    });

    const updatedPeriods: Record<string, UniversePeriodRecord> = {
      ...(universe.periods ?? {}),
      [period.periodId]: periodRecord
    };

    // Update unresolved conditions map with any additions or status changes
    const updatedUnresolved: Record<string, UnresolvedConditionEntity> = {
      ...(universe.unresolvedConditions ?? {})
    };

    if (ctx?.unresolvedConditions) {
      for (const u of ctx.unresolvedConditions) {
        let currentStatus: UnresolvedConditionStatus = 'CARRYOVER';
        if (u.lifecycleStatus === UnresolvedStatus.RESOLVED || u.lifecycleStatus === UnresolvedStatus.CLOSED) {
          currentStatus = 'RESOLVED';
        } else if (u.lifecycleStatus === UnresolvedStatus.BLOCKED) {
          currentStatus = 'PENDING';
        }

        const existing = updatedUnresolved[u.unresolvedId];
        updatedUnresolved[u.unresolvedId] = Object.freeze({
          conditionId: u.unresolvedId,
          conditionType: existing?.conditionType ?? 'DAILY_UNRESOLVED',
          description: u.reason,
          ownerDomain: existing?.ownerDomain ?? makeDomainID('DAILY_UNIVERSE'),
          targetEntityRef: u.ownerReference ?? existing?.targetEntityRef,
          temporalScope: {
            effectiveFrom: u.temporalReference,
            temporalCategory: TemporalStatus.ACTUAL
          },
          dependencyRefs: existing?.dependencyRefs ?? [],
          currentStatus,
          createdAt: existing?.createdAt ?? period.startTime.toCanonical(),
          lastUpdated: periodEndTime,
          resolutionRef: u.resolutionReference ?? existing?.resolutionRef,
          sourceSystem: source,
          validationStatus: ModelValidationStatus.VALID,
          provenance: existing?.provenance ?? createProvenanceMetadata(
            source,
            makeDomainID('DAILY_UNIVERSE'),
            'REV_INITIAL',
            AuthorityLevel.AUTHORITATIVE
          )
        });
      }
    }

    // Update processes map with any additions or status changes
    const updatedProcesses: Record<string, ProcessEntity> = {
      ...(universe.processes ?? {})
    };

    if (ctx?.processes) {
      for (const proc of ctx.processes) {
        let currentStatus: ProcessStatus = 'ACTIVE';
        if (proc.currentStatus === UniverseProcessStatus.COMPLETED) currentStatus = 'COMPLETED';
        else if (proc.currentStatus === UniverseProcessStatus.PAUSED) currentStatus = 'PAUSED';
        else if (proc.currentStatus === UniverseProcessStatus.SUSPENDED) currentStatus = 'BLOCKED';
        else if (proc.currentStatus === UniverseProcessStatus.CANCELLED || proc.currentStatus === UniverseProcessStatus.FAILED) currentStatus = 'TERMINATED';

        const existing = updatedProcesses[proc.processId];
        const locationRef = (proc.metadata as Record<string, unknown> | undefined)?.locationRef as string | undefined;

        updatedProcesses[proc.processId] = Object.freeze({
          processId: proc.processId,
          processType: existing?.processType ?? 'UNIVERSE_PROCESS',
          title: existing?.title ?? `Process ${proc.processId}`,
          participantRefs: (existing?.participantRefs ?? []) as readonly EntityID[],
          objectRefs: (existing?.objectRefs ?? []) as readonly EntityID[],
          locationRef: locationRef ?? existing?.locationRef,
          startTime: proc.startReference,
          endCondition: proc.completionCriteria?.[0] ?? existing?.endCondition,
          currentStatus,
          progressRatio: currentStatus === 'COMPLETED' ? 1.0 : (existing?.progressRatio ?? 0.0),
          dependencies: [...proc.dependencies],
          unresolvedConditionRefs: existing?.unresolvedConditionRefs ?? [],
          temporalValidity: {
            effectiveFrom: proc.startReference,
            temporalCategory: TemporalStatus.ACTUAL
          },
          sourceSystem: source,
          validationStatus: ModelValidationStatus.VALID,
          history: existing?.history ?? RevisionHistoryManager.createInitial(
            source,
            periodEndTime,
            `Process ${proc.processId} registered`
          ),
          provenance: existing?.provenance ?? createProvenanceMetadata(
            source,
            makeDomainID('DAILY_UNIVERSE'),
            'REV_INITIAL',
            AuthorityLevel.AUTHORITATIVE
          )
        });
      }
    }

    const nextSeq = period.isFirstPeriod ? 1 : (universe.temporalContext?.periodSequence ? universe.temporalContext.periodSequence + 1 : 1);

    return Object.freeze({
      ...universe,
      temporalContext: Object.freeze({
        currentUniverseDate: periodEndDate,
        currentUniverseTime: periodEndTime,
        currentPeriodRef: period.periodId,
        previousPeriodRef: period.previousPeriodRef,
        periodSequence: nextSeq,
        periodLifecycleState: period.status,
        activeTimezoneOrEra: universe.temporalContext?.activeTimezoneOrEra
      }),
      periods: Object.freeze(updatedPeriods),
      unresolvedConditions: Object.freeze(updatedUnresolved),
      processes: Object.freeze(updatedProcesses)
    });
  }
}
