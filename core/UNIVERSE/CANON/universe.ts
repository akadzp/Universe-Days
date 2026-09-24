/**
 * Phase 8: Universe Root Context Model
 *
 * Implements the root Universe model that serves as the unified structural container
 * and execution context for all Pocer Universe systems.
 *
 * NOTE: The Universe is a structural container/context, NOT the monolithic owner of subsystems.
 * Individual domain entities retain their authoritative ownership via Phase 7 domain owners.
 */

import { DomainID, SystemID, RequestID, makeSystemID, makeDomainID, makeRequestID } from '../../SHARED/identifiers.ts';
import { CharacterEntity } from '../../CHARACTER/character.ts';
import { RelationshipEntity } from '../../DOMAIN/RELATIONSHIP/relationship.ts';
import { ObjectEntity, ObjectRelationEntity } from '../../OBJECT/object.ts';
import { KnowledgeEntity } from '../../DOMAIN/KNOWLEDGE/knowledge.ts';
import { StateEntity } from '../../DOMAIN/STATE/state.ts';
import { LocationEntity } from '../../DOMAIN/LOCATION/location.ts';
import { EventEntity } from '../../UNIVERSE/CANON/event.ts';
import { ProcessEntity } from '../../UNIVERSE/CANON/process.ts';
import { UnresolvedConditionEntity } from '../../UNIVERSE/CANON/unresolved.ts';
import { BehaviorEntity } from '../../CHARACTER/behavior.ts';
import { CharacterStyleEntity } from '../../CHARACTER/character-style.ts';
import { RevisionHistory, RevisionHistoryManager } from '../../SHARED/history.ts';
import { SourceAuthorityMetadata, createProvenanceMetadata } from '../../SHARED/provenance.ts';
import { AuthorityLevel } from '../../SHARED/model-types.ts';

export interface UniverseDomainBinding {
  readonly domainId: DomainID;
  readonly ownerId: SystemID;
  readonly version: string;
}

export interface UniverseContinuityContext {
  readonly activeConditionRefs: readonly string[];
  readonly activeChainRefs: readonly string[];
}

export interface UniverseTemporalContext {
  readonly currentUniverseDate: string;
  readonly currentUniverseTime: string;
  readonly currentPeriodRef?: string;
  readonly previousPeriodRef?: string;
  readonly periodSequence?: number;
  readonly periodLifecycleState?: string;
  readonly activeTimezoneOrEra?: string;
}

export interface UniversePeriodRecord {
  readonly periodId: string;
  readonly universeScope: string;
  readonly startTime: string;
  readonly endTime?: string;
  readonly sequenceNumber: number;
  readonly status: string;
  readonly previousPeriodRef?: string;
  readonly isFirstPeriod: boolean;
  readonly openUnresolvedCount?: number;
  readonly activeProcessCount?: number;
}

export interface UniverseModel {
  readonly universeId: string;
  readonly temporalContext: UniverseTemporalContext;

  readonly characters: Readonly<Record<string, CharacterEntity>>;
  readonly relationships: Readonly<Record<string, RelationshipEntity>>;
  readonly objects: Readonly<Record<string, ObjectEntity>>;
  readonly objectRelations?: Readonly<Record<string, ObjectRelationEntity>>;
  readonly knowledge: Readonly<Record<string, KnowledgeEntity>>;
  readonly states: Readonly<Record<string, StateEntity>>;
  readonly locations: Readonly<Record<string, LocationEntity>>;
  readonly behaviors: Readonly<Record<string, BehaviorEntity>>;
  readonly styles: Readonly<Record<string, CharacterStyleEntity>>;

  readonly events: Readonly<Record<string, EventEntity>>;
  readonly processes: Readonly<Record<string, ProcessEntity>>;
  readonly unresolvedConditions: Readonly<Record<string, UnresolvedConditionEntity>>;
  readonly periods?: Readonly<Record<string, UniversePeriodRecord>>;

  readonly continuityContext: UniverseContinuityContext;
  readonly domainBindings: readonly UniverseDomainBinding[];
  readonly revisionHistory: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}

export interface CreateUniverseModelParams {
  universeId: string;
  universeDate: string;
  universeTime?: string;
  periodRef?: string;
  previousPeriodRef?: string;
  periodSequence?: number;
  periodLifecycleState?: string;
  activeTimezoneOrEra?: string;
  characters?: Record<string, CharacterEntity>;
  relationships?: Record<string, RelationshipEntity>;
  objects?: Record<string, ObjectEntity>;
  objectRelations?: Record<string, ObjectRelationEntity>;
  knowledge?: Record<string, KnowledgeEntity>;
  states?: Record<string, StateEntity>;
  locations?: Record<string, LocationEntity>;
  behaviors?: Record<string, BehaviorEntity>;
  styles?: Record<string, CharacterStyleEntity>;
  events?: Record<string, EventEntity>;
  processes?: Record<string, ProcessEntity>;
  unresolvedConditions?: Record<string, UnresolvedConditionEntity>;
  periods?: Record<string, UniversePeriodRecord>;
  continuityContext?: UniverseContinuityContext;
  domainBindings?: UniverseDomainBinding[];
  sourceSystem?: SystemID;
}

export class UniverseModelFactory {
  public static create(params: CreateUniverseModelParams): UniverseModel {
    const universeTime = params.universeTime ?? `${params.universeDate}T00:00:00Z`;
    const source = params.sourceSystem ?? makeSystemID('UNIVERSE_ROOT_SYSTEM');

    const defaultBindings: UniverseDomainBinding[] = params.domainBindings ?? [
      { domainId: makeDomainID('CHARACTER'), ownerId: makeSystemID('CHARACTER_SYSTEM'), version: '1.0.0' },
      { domainId: makeDomainID('RELATIONSHIP'), ownerId: makeSystemID('RELATIONSHIP_SYSTEM'), version: '1.0.0' },
      { domainId: makeDomainID('OBJECT'), ownerId: makeSystemID('OBJECT_SYSTEM'), version: '1.0.0' },
      { domainId: makeDomainID('KNOWLEDGE'), ownerId: makeSystemID('KNOWLEDGE_SYSTEM'), version: '1.0.0' },
      { domainId: makeDomainID('STATE'), ownerId: makeSystemID('STATE_SYSTEM'), version: '1.0.0' },
      { domainId: makeDomainID('LOCATION'), ownerId: makeSystemID('LOCATION_SYSTEM'), version: '1.0.0' },
      { domainId: makeDomainID('EVENT'), ownerId: makeSystemID('EVENT_SYSTEM'), version: '1.0.0' },
      { domainId: makeDomainID('PROCESS'), ownerId: makeSystemID('PROCESS_SYSTEM'), version: '1.0.0' },
      { domainId: makeDomainID('UNRESOLVED'), ownerId: makeSystemID('UNRESOLVED_SYSTEM'), version: '1.0.0' }
    ];

    const revisionHistory = RevisionHistoryManager.createInitial(
      source,
      universeTime,
      `Universe ${params.universeId} initialized`
    );

    const provenance = createProvenanceMetadata(
      source,
      makeDomainID('UNIVERSE_ROOT'),
      revisionHistory.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE
    );

    const freezeMap = <T>(map: Record<string, T> | undefined): Readonly<Record<string, T>> => {
      const result: Record<string, T> = {};
      for (const [k, v] of Object.entries(map ?? {})) {
        result[k] = Object.freeze(v);
      }
      return Object.freeze(result);
    };

    return Object.freeze({
      universeId: params.universeId,
      temporalContext: Object.freeze({
        currentUniverseDate: params.universeDate,
        currentUniverseTime: universeTime,
        currentPeriodRef: params.periodRef,
        previousPeriodRef: params.previousPeriodRef,
        periodSequence: params.periodSequence,
        periodLifecycleState: params.periodLifecycleState,
        activeTimezoneOrEra: params.activeTimezoneOrEra
      }),
      characters: freezeMap(params.characters),
      relationships: freezeMap(params.relationships),
      objects: freezeMap(params.objects),
      objectRelations: freezeMap(params.objectRelations),
      knowledge: freezeMap(params.knowledge),
      states: freezeMap(params.states),
      locations: freezeMap(params.locations),
      behaviors: freezeMap(params.behaviors),
      styles: freezeMap(params.styles),
      events: freezeMap(params.events),
      processes: freezeMap(params.processes),
      unresolvedConditions: freezeMap(params.unresolvedConditions),
      periods: freezeMap(params.periods),
      continuityContext: Object.freeze({
        activeConditionRefs: Object.freeze([...(params.continuityContext?.activeConditionRefs ?? [])]),
        activeChainRefs: Object.freeze([...(params.continuityContext?.activeChainRefs ?? [])])
      }),
      domainBindings: Object.freeze([...defaultBindings]),
      revisionHistory,
      provenance
    });
  }

  /**
   * Creates a new Canon snapshot by evolving an existing snapshot without
   * dropping structural fields. Unlike create(), this preserves domain bindings,
   * behaviors, styles, periods, continuity, and the complete revision chain.
   */
  public static evolve(
    base: UniverseModel,
    params: {
      universeDate?: string;
      universeTime?: string;
      periodRef?: string;
      previousPeriodRef?: string;
      periodSequence?: number;
      periodLifecycleState?: string;
      activeTimezoneOrEra?: string;
      characters?: Record<string, CharacterEntity>;
      relationships?: Record<string, RelationshipEntity>;
      objects?: Record<string, ObjectEntity>;
      objectRelations?: Record<string, ObjectRelationEntity>;
      knowledge?: Record<string, KnowledgeEntity>;
      states?: Record<string, StateEntity>;
      locations?: Record<string, LocationEntity>;
      behaviors?: Record<string, BehaviorEntity>;
      styles?: Record<string, CharacterStyleEntity>;
      events?: Record<string, EventEntity>;
      processes?: Record<string, ProcessEntity>;
      unresolvedConditions?: Record<string, UnresolvedConditionEntity>;
      periods?: Record<string, UniversePeriodRecord>;
      continuityContext?: UniverseContinuityContext;
      sourceSystem: SystemID;
      effectiveTime: string;
      changedFields: string[];
      reason: string;
      sourceRequestId?: string;
    }
  ): UniverseModel {
    const universeTime = params.universeTime ?? base.temporalContext.currentUniverseTime;
    const universeDate = params.universeDate ?? base.temporalContext.currentUniverseDate;
    const revisionHistory = RevisionHistoryManager.appendRevision(
      base.revisionHistory,
      params.sourceSystem,
      params.effectiveTime,
      params.changedFields,
      params.reason
    );

    const nextProvenance = createProvenanceMetadata(
      params.sourceSystem,
      makeDomainID('UNIVERSE_ROOT'),
      revisionHistory.currentRevisionId,
      AuthorityLevel.AUTHORITATIVE,
      params.sourceRequestId ? makeRequestID(params.sourceRequestId) : undefined
    );

    const freezeMap = <T>(map: Readonly<Record<string, T>>): Readonly<Record<string, T>> => {
      const result: Record<string, T> = {};
      for (const [k, v] of Object.entries(map)) result[k] = Object.freeze(v);
      return Object.freeze(result);
    };

    return Object.freeze({
      ...base,
      temporalContext: Object.freeze({
        currentUniverseDate: universeDate,
        currentUniverseTime: universeTime,
        currentPeriodRef: params.periodRef ?? base.temporalContext.currentPeriodRef,
        previousPeriodRef: params.previousPeriodRef ?? base.temporalContext.previousPeriodRef,
        periodSequence: params.periodSequence ?? base.temporalContext.periodSequence,
        periodLifecycleState: params.periodLifecycleState ?? base.temporalContext.periodLifecycleState,
        activeTimezoneOrEra: params.activeTimezoneOrEra ?? base.temporalContext.activeTimezoneOrEra
      }),
      characters: freezeMap(params.characters ?? base.characters),
      relationships: freezeMap(params.relationships ?? base.relationships),
      objects: freezeMap(params.objects ?? base.objects),
      objectRelations: freezeMap(params.objectRelations ?? (base.objectRelations ?? {})),
      knowledge: freezeMap(params.knowledge ?? base.knowledge),
      states: freezeMap(params.states ?? base.states),
      locations: freezeMap(params.locations ?? base.locations),
      behaviors: freezeMap(params.behaviors ?? base.behaviors),
      styles: freezeMap(params.styles ?? base.styles),
      events: freezeMap(params.events ?? base.events),
      processes: freezeMap(params.processes ?? base.processes),
      unresolvedConditions: freezeMap(params.unresolvedConditions ?? base.unresolvedConditions),
      periods: freezeMap(params.periods ?? (base.periods ?? {})),
      continuityContext: Object.freeze({
        activeConditionRefs: Object.freeze([...(params.continuityContext?.activeConditionRefs ?? base.continuityContext.activeConditionRefs)]),
        activeChainRefs: Object.freeze([...(params.continuityContext?.activeChainRefs ?? base.continuityContext.activeChainRefs)])
      }),
      domainBindings: Object.freeze([...base.domainBindings]),
      revisionHistory,
      provenance: nextProvenance
    });
  }
}
