/**
 * Phase 8: Event Data Model
 *
 * Implements objective Universe Event data.
 * Explicitly decoupled from narrative scenes, story pages, or prose descriptions.
 */

import { EntityID, SystemID } from '../../types/identifiers.ts';
import { ModelValidationStatus } from './types.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export type EventStatus = 'SCHEDULED' | 'OCCURRING' | 'RESOLVED' | 'CANCELLED';

export interface EventEntity {
  readonly eventId: string;
  readonly eventType: string;
  readonly title: string;
  readonly participantRefs: readonly EntityID[];
  readonly objectRefs: readonly EntityID[];
  readonly locationRef: string;
  readonly temporalInterval: {
    readonly start: string;
    readonly end?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly status: EventStatus;
  readonly causeRefs: readonly string[];
  readonly consequenceRefs: readonly string[];
  readonly continuityReference?: string;
  readonly sourceSystem: SystemID;
  readonly validationStatus: ModelValidationStatus;
  readonly provenance: SourceAuthorityMetadata;
}
