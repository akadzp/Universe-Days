/**
 * Phase 8: Relationship Domain Data Model
 *
 * Implements Relationship as a first-class standalone entity.
 * Distinct from Character profile strings.
 */

import { EntityID } from '../../types/identifiers.ts';
import { EntityLifecycleStatus } from './types.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export type RelationshipDirection = 'UNIDIRECTIONAL' | 'BIDIRECTIONAL';

export interface RelationshipEntity {
  readonly relationshipId: string;
  readonly subjectRef: EntityID;
  readonly targetRef: EntityID;
  readonly relationshipType: string;
  readonly direction: RelationshipDirection;
  readonly status: EntityLifecycleStatus;
  readonly strength?: number; // e.g. 0.0 - 1.0 or custom scale
  readonly contextNotes?: string;
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}
