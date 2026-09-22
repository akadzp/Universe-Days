/**
 * Character / Actor Domain Data Model
 *
 * Character data remains a domain-owned profile connected to State, Knowledge,
 * Relationship, Location, and Continuity by stable references.
 */

import { EntityIdentity } from './identity.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';
import { ActorClassification } from './actor.ts';
import { CharacterProfile } from './character-profile.ts';

export interface CharacterEntity {
  readonly identity: EntityIdentity;
  readonly actor?: ActorClassification;
  readonly profile?: CharacterProfile;
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
