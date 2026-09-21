/**
 * Phase 6: Daily Story Scope.
 * Represents a scoped subset of validated Universe context required for a specific Story.
 * Story Scope must NEVER become a second source of truth or invent ungrounded context.
 */

import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { UniversePeriodContext } from '../../universe/daily/initialization.ts';
import { StoryTrigger } from './trigger.ts';

export interface StoryScope {
  scopeId: string;
  universeScope: string;
  primaryContext: string;
  supportingContexts: string[];
  relevantActorEntityRefs: string[];
  relevantEventIds: string[];
  relevantProcessIds: string[];
  relevantConsequenceIds: string[];
  relevantUnresolvedIds: string[];
  relevantContinuityIds: string[];
  relevantDomainReferences: string[];
  temporalRange?: {
    start: string;
    end?: string;
  };
}

export interface ScopeValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  scopedItemCounts: {
    actors: number;
    events: number;
    processes: number;
    consequences: number;
    unresolved: number;
    continuity: number;
  };
}

export class StoryScopeValidator {
  /**
   * Validates that the Story Scope is a strict, consistent subset of the provided UniversePeriodContext.
   */
  public static validateScope(
    scope: StoryScope,
    universeContext: UniversePeriodContext
  ): ScopeValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!scope.scopeId) {
      errors.push('StoryScope is missing scopeId');
    }
    if (!scope.primaryContext) {
      errors.push('StoryScope is missing primaryContext');
    }

    // 1. Verify universe scope match
    if (scope.universeScope !== universeContext.period.universeScope) {
      errors.push(
        `Scope contamination: scope universeScope "${scope.universeScope}" does not match period scope "${universeContext.period.universeScope}"`
      );
    }

    // 2. Validate events in scope exist in Universe
    const universeEventIds = new Set(universeContext.events.map(e => e.eventId));
    for (const evId of scope.relevantEventIds) {
      if (!universeEventIds.has(evId)) {
        errors.push(`Scope includes unknown eventId "${evId}" not present in Universe context`);
      }
    }

    // 3. Validate processes in scope exist in Universe
    const universeProcessIds = new Set(universeContext.processes.map(p => p.processId));
    for (const procId of scope.relevantProcessIds) {
      if (!universeProcessIds.has(procId)) {
        errors.push(`Scope includes unknown processId "${procId}" not present in Universe context`);
      }
    }

    // 4. Validate consequences in scope exist in Universe
    const universeConsequenceIds = new Set(universeContext.consequences.map(c => c.consequenceId));
    for (const cnsqId of scope.relevantConsequenceIds) {
      if (!universeConsequenceIds.has(cnsqId)) {
        errors.push(`Scope includes unknown consequenceId "${cnsqId}" not present in Universe context`);
      }
    }

    // 5. Validate unresolved conditions in scope exist in Universe
    const universeUnresolvedIds = new Set(universeContext.unresolvedConditions.map(u => u.unresolvedId));
    for (const unresId of scope.relevantUnresolvedIds) {
      if (!universeUnresolvedIds.has(unresId)) {
        errors.push(`Scope includes unknown unresolvedId "${unresId}" not present in Universe context`);
      }
    }

    // 6. Validate continuity items in scope exist in Universe
    const universeContinuityIds = new Set(universeContext.continuityItems.map(c => c.identity.continuityId));
    for (const contId of scope.relevantContinuityIds) {
      if (!universeContinuityIds.has(contId)) {
        errors.push(`Scope includes unknown continuityId "${contId}" not present in Universe context`);
      }
    }

    // 7. Check if empty scope (warning)
    const totalScoped =
      scope.relevantEventIds.length +
      scope.relevantProcessIds.length +
      scope.relevantConsequenceIds.length +
      scope.relevantUnresolvedIds.length +
      scope.relevantContinuityIds.length;

    if (totalScoped === 0 && scope.relevantActorEntityRefs.length === 0) {
      warnings.push('StoryScope is empty; contains no events, processes, or entities');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      scopedItemCounts: {
        actors: scope.relevantActorEntityRefs.length,
        events: scope.relevantEventIds.length,
        processes: scope.relevantProcessIds.length,
        consequences: scope.relevantConsequenceIds.length,
        unresolved: scope.relevantUnresolvedIds.length,
        continuity: scope.relevantContinuityIds.length
      }
    };
  }
}

export class StoryScopeBuilder {
  /**
   * Builds a scoped subset around a given trigger from UniversePeriodContext.
   */
  public static buildFromTrigger(
    trigger: StoryTrigger,
    universeContext: UniversePeriodContext,
    options?: {
      scopeId?: string;
      primaryContext?: string;
      additionalActors?: string[];
      additionalDomains?: string[];
    }
  ): Result<StoryScope> {
    const universeScope = universeContext.period.universeScope;
    const scopeId = options?.scopeId ?? `SCOPE_${trigger.triggerId}`;
    const primaryContext = options?.primaryContext ?? `Story around ${trigger.type} (${trigger.sourceReference})`;

    const relevantEvents: string[] = [];
    const relevantProcesses: string[] = [];
    const relevantConsequences: string[] = [];
    const relevantUnresolved: string[] = [];
    const relevantContinuity: string[] = [];
    const actorRefs = new Set<string>(options?.additionalActors ?? []);
    const domainRefs = new Set<string>(options?.additionalDomains ?? []);

    // Link trigger source reference
    switch (trigger.type) {
      case 'UNIVERSE_EVENT': {
        const ev = universeContext.events.find(e => e.eventId === trigger.sourceReference);
        if (ev) {
          relevantEvents.push(ev.eventId);
          // Add linked consequences
          const linkedCnsqs = universeContext.consequences.filter(c => c.sourceEventRef === ev.eventId);
          for (const c of linkedCnsqs) {
            relevantConsequences.push(c.consequenceId);
          }
        }
        break;
      }
      case 'ONGOING_PROCESS': {
        const proc = universeContext.processes.find(p => p.processId === trigger.sourceReference);
        if (proc) {
          relevantProcesses.push(proc.processId);
        }
        break;
      }
      case 'CONSEQUENCE': {
        const cnsq = universeContext.consequences.find(c => c.consequenceId === trigger.sourceReference);
        if (cnsq) {
          relevantConsequences.push(cnsq.consequenceId);
          if (cnsq.sourceEventRef) {
            relevantEvents.push(cnsq.sourceEventRef);
          }
        }
        break;
      }
      case 'CONTINUITY_CHANGE': {
        const cont = universeContext.continuityItems.find(c => c.identity.continuityId === trigger.sourceReference);
        if (cont) {
          relevantContinuity.push(cont.identity.continuityId);
          if (cont.identity.entityRef) {
            actorRefs.add(cont.identity.entityRef);
          }
          if (cont.identity.domainRef) {
            domainRefs.add(cont.identity.domainRef);
          }
        }
        break;
      }
      case 'UNRESOLVED_DEVELOPMENT': {
        const unres = universeContext.unresolvedConditions.find(u => u.unresolvedId === trigger.sourceReference);
        if (unres) {
          relevantUnresolved.push(unres.unresolvedId);
        }
        break;
      }
      case 'EXPLICIT_REQUEST':
      case 'TEMPORAL_TRANSITION': {
        // Include active items for broad production request
        for (const ev of universeContext.events) {
          if (ev.status === 'OCCURRED' || ev.status === 'READY') {
            relevantEvents.push(ev.eventId);
          }
        }
        for (const p of universeContext.processes) {
          if (p.currentStatus === 'ACTIVE') {
            relevantProcesses.push(p.processId);
          }
        }
        for (const u of universeContext.unresolvedConditions) {
          if (u.lifecycleStatus === 'UNRESOLVED') {
            relevantUnresolved.push(u.unresolvedId);
          }
        }
        break;
      }
    }

    const scope: StoryScope = {
      scopeId,
      universeScope,
      primaryContext,
      supportingContexts: [],
      relevantActorEntityRefs: Array.from(actorRefs),
      relevantEventIds: relevantEvents,
      relevantProcessIds: relevantProcesses,
      relevantConsequenceIds: relevantConsequences,
      relevantUnresolvedIds: relevantUnresolved,
      relevantContinuityIds: relevantContinuity,
      relevantDomainReferences: Array.from(domainRefs),
      temporalRange: {
        start: universeContext.period.startTime.toCanonical(),
        end: universeContext.period.endTime?.toCanonical()
      }
    };

    const validation = StoryScopeValidator.validateScope(scope, universeContext);
    if (!validation.valid) {
      return failure(
        EngineErrorCode.INVALID_STORY_SCOPE,
        `Built scope failed validation: ${validation.errors.join('; ')}`
      );
    }

    return success(scope);
  }
}
