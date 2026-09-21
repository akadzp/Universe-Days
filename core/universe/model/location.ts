/**
 * Phase 8: Location Domain Data Model
 *
 * Implements structural and spatial location representation, supporting nested
 * containment hierarchies and adjacency relations without conflating hierarchy with temporal truth.
 */

import { EntityIdentity } from './identity.ts';
import { EntityLifecycleStatus } from './types.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export interface LocationEntity {
  readonly identity: EntityIdentity;
  readonly locationType: string; // e.g. 'REALM', 'REGION', 'SETTLEMENT', 'STRUCTURE', 'INTERIOR_SPACE'
  readonly parentLocationRef: string | null;
  readonly adjacentLocationRefs: readonly string[];
  readonly containedLocationRefs: readonly string[];
  readonly coordinates?: {
    readonly x?: number;
    readonly y?: number;
    readonly z?: number;
    readonly system?: string;
  };
  readonly accessibilityStatus: 'OPEN' | 'RESTRICTED' | 'SEALED' | 'DESTROYED';
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}
