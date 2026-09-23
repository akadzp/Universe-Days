/**
 * Phase 6: Story Handoff Context.
 * The authoritative contract object passed to the future Narrator (Phase 7+).
 * The handoff is a validated data contract, NOT a story prose renderer.
 */

import { StoryTrigger } from './trigger.ts';
import { StoryScope } from './scope.ts';
import { StoryDateInfo } from './date.ts';
import { UniverseEvent } from '../UNIVERSE/DAILY-CYCLE/event.ts';
import { UniverseProcess } from '../UNIVERSE/DAILY-CYCLE/process.ts';
import { UniverseConsequence } from '../UNIVERSE/DAILY-CYCLE/consequence.ts';
import { UnresolvedCondition } from '../UNIVERSE/DAILY-CYCLE/unresolved.ts';
import { ContinuityItem } from '../UNIVERSE/CONTINUITY/continuity-model.ts';
import { UniversePeriodContext } from '../UNIVERSE/DAILY-CYCLE/initialization.ts';

export interface TemporalHandoffContext {
  periodId: string;
  startTime: string;
  endTime?: string;
  currentTime: string;
  temporalRange?: {
    start: string;
    end?: string;
  };
}

export interface StoryActorRef {
  entityRef: string;
  domain?: string;
  status?: string;
  roleInScope?: string;
}

export interface StoryRelationshipRef {
  sourceRef: string;
  targetRef: string;
  relationshipType?: string;
  intensity?: number;
}

export interface StoryObjectRef {
  objectRef: string;
  domain?: string;
  holderRef?: string;
}

export interface StoryKnowledgeBoundary {
  topic: string;
  entityRef: string;
  isKnown: boolean;
  disclosureScope?: string;
}

export interface StoryStateReference {
  stateKey: string;
  stateValue: unknown;
  domain?: string;
}

export interface StoryLocationRef {
  locationId: string;
  domain?: string;
  activeStatus?: string;
}

export interface StoryHandoffContext {
  instanceRef: string;
  storyId: string;
  storyDate: string; // Canonical YYYY-MM-DD
  storyDateTime: string; // Canonical ISO DateTime
  trigger: StoryTrigger;
  scope: StoryScope;
  temporalContext: TemporalHandoffContext;
  relevantActors: StoryActorRef[];
  relevantRelationships: StoryRelationshipRef[];
  relevantObjects: StoryObjectRef[];
  relevantKnowledgeBoundaries: StoryKnowledgeBoundary[];
  relevantStateReferences: StoryStateReference[];
  relevantLocations: StoryLocationRef[];
  events: UniverseEvent[];
  processes: UniverseProcess[];
  consequences: UniverseConsequence[];
  unresolvedConditions: UnresolvedCondition[];
  continuityItems: ContinuityItem[];
  productionRestrictions: string[];
  validationStatus: 'PASSED' | 'REVIEW_REQUIRED' | 'BLOCKED';
  sourceReferences: string[];
  version: number;
  createdAtUniverseTime: string;
  upstreamFingerprint: string;
}

export class StoryHandoffBuilder {
  /**
   * Constructs a strict, validated StoryHandoffContext from UniversePeriodContext and scoped elements.
   */
  public static buildHandoff(params: {
    instanceRef: string;
    storyId: string;
    storyDate: StoryDateInfo;
    trigger: StoryTrigger;
    scope: StoryScope;
    universeContext: UniversePeriodContext;
    upstreamFingerprint: string;
    version?: number;
    restrictions?: string[];
  }): StoryHandoffContext {
    const {
      instanceRef,
      storyId,
      storyDate,
      trigger,
      scope,
      universeContext,
      upstreamFingerprint,
      version = 1,
      restrictions = ['STRICT_CANON_PROTECTION', 'NO_UNAUTHORIZED_UNIVERSE_MUTATION']
    } = params;

    // Filter events to only those in scope
    const scopedEvents = universeContext.events.filter(e =>
      scope.relevantEventIds.includes(e.eventId)
    );

    // Filter processes to only those in scope
    const scopedProcesses = universeContext.processes.filter(p =>
      scope.relevantProcessIds.includes(p.processId)
    );

    // Filter consequences to only those in scope
    const scopedConsequences = universeContext.consequences.filter(c =>
      scope.relevantConsequenceIds.includes(c.consequenceId)
    );

    // Filter unresolved conditions to only those in scope
    const scopedUnresolved = universeContext.unresolvedConditions.filter(u =>
      scope.relevantUnresolvedIds.includes(u.unresolvedId)
    );

    // Filter continuity items to only those in scope
    const scopedContinuity = universeContext.continuityItems.filter(c =>
      scope.relevantContinuityIds.includes(c.identity.continuityId)
    );

    // Build actor references from scope and continuity items
    const actors: StoryActorRef[] = scope.relevantActorEntityRefs.map(ref => ({
      entityRef: ref,
      roleInScope: 'PRIMARY_PARTICIPANT'
    }));

    // Build source references list
    const sourceRefs: string[] = [
      `period:${universeContext.period.periodId}`,
      `trigger:${trigger.triggerId}`,
      ...scope.relevantEventIds.map(id => `event:${id}`),
      ...scope.relevantProcessIds.map(id => `process:${id}`),
      ...scope.relevantContinuityIds.map(id => `continuity:${id}`)
    ];

    const temporalContext: TemporalHandoffContext = {
      periodId: universeContext.period.periodId,
      startTime: universeContext.period.startTime.toCanonical(),
      endTime: universeContext.period.endTime?.toCanonical(),
      currentTime: universeContext.clock ? universeContext.clock.readCurrentTime().toCanonical() : universeContext.period.startTime.toCanonical(),
      temporalRange: scope.temporalRange
    };

    return {
      instanceRef,
      storyId,
      storyDate: storyDate.storyDate,
      storyDateTime: storyDate.storyDateTime,
      trigger,
      scope,
      temporalContext,
      relevantActors: actors,
      relevantRelationships: [],
      relevantObjects: [],
      relevantKnowledgeBoundaries: [],
      relevantStateReferences: [],
      relevantLocations: [],
      events: scopedEvents,
      processes: scopedProcesses,
      consequences: scopedConsequences,
      unresolvedConditions: scopedUnresolved,
      continuityItems: scopedContinuity,
      productionRestrictions: restrictions,
      validationStatus: 'PASSED',
      sourceReferences: sourceRefs,
      version,
      createdAtUniverseTime: universeContext.clock ? universeContext.clock.readCurrentTime().toCanonical() : storyDate.storyDateTime,
      upstreamFingerprint
    };
  }
}
