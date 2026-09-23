/**
 * Character / Actor Domain Data Model
 *
 * Character data remains a domain-owned profile connected to State, Knowledge,
 * Relationship, Location, Behavior, and Continuity by stable references.
 */

import { EntityIdentity } from '../SHARED/identity.ts';
import { RevisionHistory } from '../SHARED/history.ts';
import { SourceAuthorityMetadata } from '../SHARED/provenance.ts';
import { TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';
import { ActorClassification } from './actor.ts';
import { CharacterProfile } from './character-profile.ts';

export interface CharacterEntity {
  readonly identity: EntityIdentity;
  readonly actor?: ActorClassification;
  readonly profile?: CharacterProfile;
  readonly behaviorReferences?: readonly string[];
  readonly styleReferences?: readonly string[];
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
