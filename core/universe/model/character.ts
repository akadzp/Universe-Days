/**
 * Phase 8: Character Domain Data Model
 *
 * Implements the core Character representation conforming to the Universe Data Model.
 * Connects roles, state, knowledge, relationships, and location via stable ID references
 * without duplicating subsystem data.
 */

import { EntityIdentity } from './identity.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export interface CharacterEntity {
  readonly identity: EntityIdentity;
  readonly roleReferences: readonly string[];
  readonly stateReference?: string;
  readonly knowledgeReferences: readonly string[];
  readonly relationshipReferences: readonly string[];
  readonly locationReference?: string;
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}
