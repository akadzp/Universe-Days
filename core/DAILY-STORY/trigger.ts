/**
 * Phase 6: Daily Story Trigger.
 * Represents reasons and entry points for producing a Daily Story from Universe context.
 * Daily Story consumes validated Universe info; it does not mutate or invent Universe events.
 */

import { TimePoint } from '../RUNTIME/TEMPORAL/time-point.ts';
import { Result, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';
import { UniversePeriodContext } from '../UNIVERSE/DAILY-CYCLE/initialization.ts';
import { UniverseEventStatus } from '../UNIVERSE/DAILY-CYCLE/event.ts';
import { UniverseProcessStatus } from '../UNIVERSE/DAILY-CYCLE/process.ts';
import { UniverseConsequenceStatus } from '../UNIVERSE/DAILY-CYCLE/consequence.ts';
import { UnresolvedStatus } from '../UNIVERSE/DAILY-CYCLE/unresolved.ts';
import { ContinuityStatus } from '../UNIVERSE/CONTINUITY/continuity-model.ts';

export enum StoryTriggerType {
  UNIVERSE_EVENT = 'UNIVERSE_EVENT',
  ONGOING_PROCESS = 'ONGOING_PROCESS',
  CONSEQUENCE = 'CONSEQUENCE',
  CONTINUITY_CHANGE = 'CONTINUITY_CHANGE',
  UNRESOLVED_DEVELOPMENT = 'UNRESOLVED_DEVELOPMENT',
  TEMPORAL_TRANSITION = 'TEMPORAL_TRANSITION',
  EXPLICIT_REQUEST = 'EXPLICIT_REQUEST'
}

export type StoryTriggerStatus = 'ACTIVE' | 'BLOCKED' | 'INVALID' | 'RESOLVED';

export interface StoryTrigger {
  triggerId: string;
  type: StoryTriggerType;
  sourceReference: string;
  universeScope: string;
  temporalAnchor: string; // Canonical TimePoint string
  description: string;
  metadata?: Record<string, unknown>;
  status: StoryTriggerStatus;
}

export interface StoryTriggerValidationResult {
  valid: boolean;
  triggerStatus: StoryTriggerStatus;
  reasons: string[];
  hasUniverseBasis: boolean;
  isExplicitRequestOnly: boolean;
}

export class StoryTriggerEvaluator {
  /**
   * Validates a trigger against a validated UniversePeriodContext.
   * Ensures the trigger is grounded in actual Universe state, not hallucinated or blocked.
   */
  public static evaluateTrigger(
    trigger: StoryTrigger,
    universeContext: UniversePeriodContext
  ): Result<StoryTriggerValidationResult> {
    if (!trigger) {
      return failure(
        EngineErrorCode.MISSING_STORY_TRIGGER,
        'Story trigger is null or undefined'
      );
    }

    if (!trigger.triggerId || !trigger.sourceReference) {
      return failure(
        EngineErrorCode.INVALID_STORY_TRIGGER,
        'Story trigger is missing triggerId or sourceReference'
      );
    }

    const reasons: string[] = [];
    let triggerStatus: StoryTriggerStatus = 'ACTIVE';
    let hasUniverseBasis = false;
    let isExplicitRequestOnly = false;

    // Check scope match
    if (trigger.universeScope && trigger.universeScope !== universeContext.period.universeScope) {
      return failure(
        EngineErrorCode.SCOPE_CONTAMINATION,
        `Trigger universeScope "${trigger.universeScope}" does not match period scope "${universeContext.period.universeScope}"`
      );
    }

    // Validate temporal anchor format
    const parsedAnchor = TimePoint.parse(trigger.temporalAnchor);
    if (!parsedAnchor.success) {
      return failure(
        EngineErrorCode.INVALID_STORY_DATE,
        `Trigger temporalAnchor "${trigger.temporalAnchor}" is not a valid TimePoint`
      );
    }

    switch (trigger.type) {
      case StoryTriggerType.UNIVERSE_EVENT: {
        const ev = universeContext.events.find(e => e.eventId === trigger.sourceReference);
        if (!ev) {
          triggerStatus = 'INVALID';
          reasons.push(`Source Universe event "${trigger.sourceReference}" not found in context`);
        } else if (ev.status === UniverseEventStatus.FAILED || ev.status === UniverseEventStatus.CANCELLED) {
          triggerStatus = 'BLOCKED';
          reasons.push(`Source Universe event "${trigger.sourceReference}" is in ${ev.status} status`);
        } else {
          hasUniverseBasis = true;
        }
        break;
      }

      case StoryTriggerType.ONGOING_PROCESS: {
        const proc = universeContext.processes.find(p => p.processId === trigger.sourceReference);
        if (!proc) {
          triggerStatus = 'INVALID';
          reasons.push(`Source Universe process "${trigger.sourceReference}" not found in context`);
        } else if (proc.currentStatus === UniverseProcessStatus.FAILED || proc.currentStatus === UniverseProcessStatus.CANCELLED) {
          triggerStatus = 'BLOCKED';
          reasons.push(`Source Universe process "${trigger.sourceReference}" is in ${proc.currentStatus} status`);
        } else {
          hasUniverseBasis = true;
        }
        break;
      }

      case StoryTriggerType.CONSEQUENCE: {
        const cnsq = universeContext.consequences.find(c => c.consequenceId === trigger.sourceReference);
        if (!cnsq) {
          triggerStatus = 'INVALID';
          reasons.push(`Source consequence "${trigger.sourceReference}" not found in context`);
        } else if (cnsq.status === UniverseConsequenceStatus.CANCELLED || cnsq.status === UniverseConsequenceStatus.FAILED) {
          triggerStatus = 'BLOCKED';
          reasons.push(`Source consequence "${trigger.sourceReference}" is ${cnsq.status}`);
        } else {
          hasUniverseBasis = true;
        }
        break;
      }

      case StoryTriggerType.CONTINUITY_CHANGE: {
        const cont = universeContext.continuityItems.find(c => c.identity.continuityId === trigger.sourceReference);
        if (!cont) {
          triggerStatus = 'INVALID';
          reasons.push(`Source continuity item "${trigger.sourceReference}" not found in context`);
        } else if (cont.status === ContinuityStatus.INVALID) {
          triggerStatus = 'BLOCKED';
          reasons.push(`Source continuity item "${trigger.sourceReference}" is INVALID`);
        } else {
          hasUniverseBasis = true;
        }
        break;
      }

      case StoryTriggerType.UNRESOLVED_DEVELOPMENT: {
        const unres = universeContext.unresolvedConditions.find(u => u.unresolvedId === trigger.sourceReference);
        if (!unres) {
          triggerStatus = 'INVALID';
          reasons.push(`Source unresolved condition "${trigger.sourceReference}" not found in context`);
        } else if (unres.lifecycleStatus === UnresolvedStatus.CLOSED) {
          triggerStatus = 'RESOLVED';
          reasons.push(`Source unresolved condition "${trigger.sourceReference}" is already CLOSED`);
        } else {
          hasUniverseBasis = true;
        }
        break;
      }

      case StoryTriggerType.TEMPORAL_TRANSITION: {
        // Temporal transition is valid if period time matches or interval is active
        hasUniverseBasis = true;
        break;
      }

      case StoryTriggerType.EXPLICIT_REQUEST: {
        isExplicitRequestOnly = true;
        // Check if there is any active universe basis to support the explicit request
        const hasActiveEvents = universeContext.events.some(e => e.status === UniverseEventStatus.OCCURRED || e.status === UniverseEventStatus.READY);
        const hasActiveProcesses = universeContext.processes.some(p => p.currentStatus === UniverseProcessStatus.ACTIVE);
        const hasUnresolved = universeContext.unresolvedConditions.some(u => u.lifecycleStatus === UnresolvedStatus.UNRESOLVED);

        if (hasActiveEvents || hasActiveProcesses || hasUnresolved) {
          hasUniverseBasis = true;
        } else {
          // Explicit request is allowed, but noted that Universe state has no active changes
          hasUniverseBasis = false;
          reasons.push('Explicit story request without active events, processes, or unresolved items');
        }
        break;
      }

      default:
        triggerStatus = 'INVALID';
        reasons.push(`Unknown trigger type "${trigger.type}"`);
    }

    const isValid = triggerStatus === 'ACTIVE';

    return success({
      valid: isValid,
      triggerStatus,
      reasons,
      hasUniverseBasis,
      isExplicitRequestOnly
    });
  }
}

export function createStoryTrigger(input: {
  triggerId: string;
  type: StoryTriggerType;
  sourceReference: string;
  universeScope: string;
  temporalAnchor: string;
  description: string;
  metadata?: Record<string, unknown>;
  status?: StoryTriggerStatus;
}): StoryTrigger {
  return {
    triggerId: input.triggerId,
    type: input.type,
    sourceReference: input.sourceReference,
    universeScope: input.universeScope,
    temporalAnchor: input.temporalAnchor,
    description: input.description,
    metadata: input.metadata,
    status: input.status ?? 'ACTIVE'
  };
}
