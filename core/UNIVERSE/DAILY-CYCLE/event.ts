/**
 * Phase 5: Generic Universe Event Model.
 * Domain-neutral event handling with strict precondition checks and explicit occurrence.
 */

import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { TimeInterval } from '../../RUNTIME/TEMPORAL/time-interval.ts';
import { TemporalRelationEngine } from '../../RUNTIME/TEMPORAL/relations.ts';
import { TemporalRelation } from '../../RUNTIME/TEMPORAL/types.ts';
import { TraceabilityMetadata } from '../../SHARED/common.ts';
import { makeRequestID, makeSystemID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export enum UniverseEventStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  OCCURRED = 'OCCURRED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  UNRESOLVED = 'UNRESOLVED',
  UNKNOWN = 'UNKNOWN'
}

export type EventPrerequisiteType = 'TEMPORAL' | 'DEPENDENCY' | 'STATE' | 'EXPLICIT';

export interface EventPrerequisite {
  type: EventPrerequisiteType;
  description: string;
  targetRef?: string;
  expectedValue?: unknown;
  satisfied?: boolean;
}

export interface UniverseEvent {
  eventId: string;
  temporalReference: string;
  status: UniverseEventStatus;
  participants: string[];
  prerequisites: EventPrerequisite[];
  dependencies: string[];
  sourceReference?: string;
  result?: unknown;
  metadata?: Record<string, unknown>;
  traceability: TraceabilityMetadata;
}

export interface CreateEventParams {
  eventId: string;
  temporalReference: TimePoint | TimeInterval | string;
  participants?: string[];
  prerequisites?: EventPrerequisite[];
  dependencies?: string[];
  sourceReference?: string;
  initialStatus?: UniverseEventStatus;
  metadata?: Record<string, unknown>;
}

export function createUniverseEvent(params: CreateEventParams): UniverseEvent {
  let tempRef: string;
  if (typeof params.temporalReference === 'string') {
    tempRef = params.temporalReference;
  } else if ('toCanonical' in params.temporalReference) {
    tempRef = params.temporalReference.toCanonical();
  } else {
    tempRef = (params.temporalReference as any).toString();
  }

  return {
    eventId: params.eventId,
    temporalReference: tempRef,
    status: params.initialStatus ?? UniverseEventStatus.PENDING,
    participants: params.participants ?? [],
    prerequisites: params.prerequisites ?? [],
    dependencies: params.dependencies ?? [],
    sourceReference: params.sourceReference,
    metadata: params.metadata,
    traceability: {
      requestId: makeRequestID(`REQ_EV_${params.eventId}`),
      sourceSystem: makeSystemID('DAILY_UNIVERSE_CORE'),
      timestamp: 0,
      version: '1.0.0'
    }
  };
}

export interface EventEvaluationContext {
  currentUniverseTime?: TimePoint;
  satisfiedDependencies?: Set<string>;
  stateFlags?: Map<string, unknown>;
}

export class EventRegistry {
  private events: Map<string, UniverseEvent> = new Map();

  constructor(initialEvents: UniverseEvent[] = []) {
    for (const ev of initialEvents) {
      this.register(ev);
    }
  }

  public register(event: UniverseEvent): Result<void> {
    if (!event.eventId) {
      return failure('Event must have an eventId', EngineErrorCode.INVALID_EVENT_TRANSITION);
    }
    this.events.set(event.eventId, { ...event });
    return success(undefined);
  }

  public get(id: string): UniverseEvent | undefined {
    const found = this.events.get(id);
    return found ? { ...found } : undefined;
  }

  public getAll(): UniverseEvent[] {
    return Array.from(this.events.values()).map(e => ({ ...e }));
  }

  public getPending(): UniverseEvent[] {
    return this.getAll().filter(e => e.status === UniverseEventStatus.PENDING || e.status === UniverseEventStatus.READY);
  }

  public getOccurred(): UniverseEvent[] {
    return this.getAll().filter(e => e.status === UniverseEventStatus.OCCURRED);
  }

  /**
   * Evaluates preconditions for a pending event without marking it OCCURRED.
   * If prerequisites are met, moves PENDING -> READY.
   */
  public evaluateReadiness(eventId: string, context: EventEvaluationContext): Result<UniverseEvent> {
    const event = this.events.get(eventId);
    if (!event) {
      return failure(`Event not found: ${eventId}`, EngineErrorCode.INVALID_EVENT_TRANSITION);
    }

    if (event.status !== UniverseEventStatus.PENDING && event.status !== UniverseEventStatus.READY) {
      return success({ ...event });
    }

    let allSatisfied = true;
    const evaluatedPrereqs: EventPrerequisite[] = [];

    // Check temporal relation if current time provided
    if (context.currentUniverseTime) {
      const parsed = TimePoint.parse(event.temporalReference);
      if (parsed.success && parsed.data) {
        const relation = TemporalRelationEngine.compareTimePoints(parsed.data, context.currentUniverseTime);
        // Event target is in the future relative to current clock -> not ready yet
        if (relation === TemporalRelation.AFTER) {
          allSatisfied = false;
        }
      }
    }

    // Check explicit prerequisites
    for (const prereq of event.prerequisites) {
      let isSat: boolean | undefined = prereq.satisfied;
      if (prereq.type === 'DEPENDENCY' && prereq.targetRef && context.satisfiedDependencies) {
        isSat = context.satisfiedDependencies.has(prereq.targetRef);
      } else if (prereq.type === 'STATE' && prereq.targetRef && context.stateFlags) {
        const val = context.stateFlags.get(prereq.targetRef);
        isSat = val === prereq.expectedValue;
      }
      evaluatedPrereqs.push({ ...prereq, satisfied: isSat });
      if (isSat !== true) {
        allSatisfied = false;
      }
    }

    // Check explicit dependencies list
    if (context.satisfiedDependencies) {
      for (const dep of event.dependencies) {
        if (!context.satisfiedDependencies.has(dep)) {
          allSatisfied = false;
        }
      }
    }

    const nextStatus = allSatisfied ? UniverseEventStatus.READY : UniverseEventStatus.PENDING;
    const updated: UniverseEvent = {
      ...event,
      status: nextStatus,
      prerequisites: evaluatedPrereqs
    };
    this.events.set(eventId, updated);
    return success(updated);
  }

  /**
   * Explicitly triggers occurrence of an event.
   * Rejects occurrence if preconditions or dependencies are failed.
   */
  public markOccurred(
    eventId: string,
    executionResult?: unknown,
    forced: boolean = false
  ): Result<UniverseEvent> {
    const event = this.events.get(eventId);
    if (!event) {
      return failure(`Event not found: ${eventId}`, EngineErrorCode.INVALID_EVENT_TRANSITION);
    }

    if (event.status === UniverseEventStatus.CANCELLED || event.status === UniverseEventStatus.FAILED) {
      return failure(`Cannot occur cancelled or failed event: ${eventId}`, EngineErrorCode.INVALID_EVENT_TRANSITION);
    }

    // Verify prerequisites unless explicitly forced by authority
    if (!forced) {
      const hasUnsatisfied = event.prerequisites.some(p => p.satisfied !== true);
      if (hasUnsatisfied) {
        return failure(
          `Cannot mark event occurred with unsatisfied prerequisites: ${eventId}`,
          EngineErrorCode.EVENT_PRECONDITION_FAILED
        );
      }
    }

    const updated: UniverseEvent = {
      ...event,
      status: UniverseEventStatus.OCCURRED,
      result: executionResult
    };
    this.events.set(eventId, updated);
    return success(updated);
  }

  /**
   * Explicitly cancels an event.
   */
  public cancel(eventId: string, reason?: string): Result<UniverseEvent> {
    const event = this.events.get(eventId);
    if (!event) {
      return failure(`Event not found: ${eventId}`, EngineErrorCode.INVALID_EVENT_TRANSITION);
    }

    const updated: UniverseEvent = {
      ...event,
      status: UniverseEventStatus.CANCELLED,
      metadata: { ...event.metadata, cancelReason: reason }
    };
    this.events.set(eventId, updated);
    return success(updated);
  }

  /**
   * Marks an event failed.
   */
  public fail(eventId: string, reason?: string): Result<UniverseEvent> {
    const event = this.events.get(eventId);
    if (!event) {
      return failure(`Event not found: ${eventId}`, EngineErrorCode.INVALID_EVENT_TRANSITION);
    }

    const updated: UniverseEvent = {
      ...event,
      status: UniverseEventStatus.FAILED,
      metadata: { ...event.metadata, failureReason: reason }
    };
    this.events.set(eventId, updated);
    return success(updated);
  }
}
