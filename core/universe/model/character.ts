/**
 * Character / Actor Domain Data Model
 *
 * Character data remains a domain-owned profile connected to State, Knowledge,
 * Relationship, Location, and Continuity by stable references.
 *
 * Actor classification is optional here for backward compatibility with older
 * generic Universe seeds. New authoritative Actor records should populate it.
 */

import { EntityIdentity } from './identity.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';
import { ActorClassification } from './actor.ts';

export interface CharacterEntity {
  readonly identity: EntityIdentity;
  readonly actor?: ActorClassification;
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
