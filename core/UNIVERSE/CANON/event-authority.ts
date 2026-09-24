import { SystemID, makeSystemID, makeDomainID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { AuthorityLevel, ModelValidationStatus } from '../../SHARED/model-types.ts';
import { createProvenanceMetadata } from '../../SHARED/provenance.ts';
import type { EventEntity, EventStatus } from './event.ts';
import type { UniverseEvent, UniverseEventStatus } from '../DAILY-CYCLE/event.ts';

export const EVENT_SYSTEM_ACTOR = makeSystemID('EVENT_SYSTEM');

export type CanonicalEventTransition = 'OCCUR' | 'RESOLVE' | 'CANCEL';

export class CanonicalEventAuthority {
  public static transition(event: EventEntity, transition: CanonicalEventTransition, actor: SystemID, effectiveTime: string): Result<EventEntity> {
    if (actor !== EVENT_SYSTEM_ACTOR) {
      return failure(`Actor '${actor}' cannot mutate canonical Event '${event.eventId}'.`, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
    }

    let nextStatus: EventStatus;
    if (transition === 'OCCUR') {
      if (event.status !== 'SCHEDULED' && event.status !== 'OCCURRING') {
        return failure(`Event '${event.eventId}' cannot OCCUR from status '${event.status}'.`, EngineErrorCode.INVALID_EVENT_TRANSITION);
      }
      nextStatus = 'OCCURRING';
    } else if (transition === 'RESOLVE') {
      if (event.status !== 'OCCURRING') {
        return failure(`Event '${event.eventId}' cannot RESOLVE from status '${event.status}'.`, EngineErrorCode.INVALID_EVENT_TRANSITION);
      }
      nextStatus = 'RESOLVED';
    } else {
      if (event.status === 'RESOLVED' || event.status === 'CANCELLED') {
        return failure(`Event '${event.eventId}' cannot CANCEL from terminal status '${event.status}'.`, EngineErrorCode.INVALID_EVENT_TRANSITION);
      }
      nextStatus = 'CANCELLED';
    }

    const provenance = createProvenanceMetadata(
      EVENT_SYSTEM_ACTOR,
      makeDomainID('EVENT'),
      event.provenance.revision,
      AuthorityLevel.AUTHORITATIVE
    );

    return success(Object.freeze({
      ...event,
      status: nextStatus,
      temporalInterval: Object.freeze({ ...event.temporalInterval, start: effectiveTime }),
      sourceSystem: EVENT_SYSTEM_ACTOR,
      validationStatus: ModelValidationStatus.VALID,
      provenance
    }));
  }

  public static mapDailyStatus(status: UniverseEventStatus): CanonicalEventTransition | null {
    switch (status) {
      case 'OCCURRED': return 'OCCUR';
      case 'RESOLVED': return 'RESOLVE';
      case 'CANCELLED': return 'CANCEL';
      default: return null;
    }
  }

  /**
   * Canonical event creation requires explicit semantic metadata; this function
   * never invents title/type/location from an ID.
   */
  public static createFromDaily(event: UniverseEvent): Result<EventEntity> {
    const metadata = (event.metadata ?? {}) as Record<string, unknown>;
    const eventType = typeof metadata.canonicalEventType === 'string' ? metadata.canonicalEventType : undefined;
    const title = typeof metadata.canonicalTitle === 'string' ? metadata.canonicalTitle : undefined;
    const locationRef = typeof metadata.canonicalLocationRef === 'string' ? metadata.canonicalLocationRef : undefined;
    if (!eventType || !title || !locationRef) {
      return failure(
        `Daily Event '${event.eventId}' cannot become Canon without canonicalEventType, canonicalTitle, and canonicalLocationRef metadata.`,
        EngineErrorCode.MISSING_REQUIRED_CONTEXT
      );
    }

    return success(Object.freeze({
      eventId: event.eventId,
      eventType,
      title,
      participantRefs: Object.freeze([...event.participants] as any),
      objectRefs: Object.freeze([]),
      locationRef,
      temporalInterval: Object.freeze({
        start: event.temporalReference,
        end: typeof metadata.canonicalTemporalEnd === 'string' ? metadata.canonicalTemporalEnd : undefined,
        temporalCategory: metadata.canonicalTemporalCategory as any ?? 'ACTUAL'
      }),
      status: event.status === 'CANCELLED' ? 'CANCELLED' : event.status === 'OCCURRED' ? 'OCCURRING' : 'SCHEDULED',
      causeRefs: Object.freeze(event.dependencies.map(String)),
      consequenceRefs: Object.freeze([]),
      sourceSystem: EVENT_SYSTEM_ACTOR,
      validationStatus: ModelValidationStatus.VALID,
      provenance: createProvenanceMetadata(EVENT_SYSTEM_ACTOR, makeDomainID('EVENT'), 'REV_INITIAL', AuthorityLevel.AUTHORITATIVE)
    }));
  }
}
