/**
 * Phase 8: Object Domain Data Model
 *
 * Implements the Object domain data model, explicitly distinguishing
 * ownership, possession, physical location, and access state.
 */

import { EntityIdentity } from './identity.ts';
import { EntityID } from '../../types/identifiers.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export type ObjectAccessStatus = 'ACCESSIBLE' | 'RESTRICTED' | 'LOCKED' | 'DESTROYED' | 'INACCESSIBLE';

export interface ObjectEntity {
  readonly identity: EntityIdentity;
  readonly category: string;
  readonly ownershipRef: EntityID | null;    // Authoritative owner
  readonly possessionRef: EntityID | null;   // Current holder/possessor
  readonly locationRef: string;              // Current physical location ID
  readonly accessStatus: ObjectAccessStatus;
  readonly quantity?: number;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}
