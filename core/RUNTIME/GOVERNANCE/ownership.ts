import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../SHARED/identifiers.ts';

export type CoreDomain =
  | 'TEMPORAL'
  | 'CHARACTER'
  | 'RELATIONSHIP'
  | 'OBJECT'
  | 'KNOWLEDGE'
  | 'STATE'
  | 'LOCATION'
  | 'DAILY_UNIVERSE'
  | 'DAILY_STORY'
  | 'DAILY_PAGE'
  | 'NARRATOR'
  | 'INSTANCE_MANAGEMENT'
  | 'ENGINE';

export interface DomainOwner {
  ownerId: SystemID;
  domainId: DomainID;
  description: string;
  authorityLevel: number;
}

export const DOMAIN_OWNERS: Record<CoreDomain, DomainOwner> = {
  TEMPORAL: {
    ownerId: makeSystemID('TEMPORAL_SYSTEM'),
    domainId: makeDomainID('TEMPORAL'),
    description: 'Authoritative owner of temporal progression, clocks, and cycle invariants.',
    authorityLevel: 1
  },
  CHARACTER: {
    ownerId: makeSystemID('CHARACTER_SYSTEM'),
    domainId: makeDomainID('CHARACTER'),
    description: 'Authoritative owner of character identity, traits, profile, and character-specific persistent facts.',
    authorityLevel: 2
  },
  RELATIONSHIP: {
    ownerId: makeSystemID('RELATIONSHIP_SYSTEM'),
    domainId: makeDomainID('RELATIONSHIP'),
    description: 'Authoritative owner of inter-entity bonds, trust, and affinity dynamics.',
    authorityLevel: 2
  },
  OBJECT: {
    ownerId: makeSystemID('OBJECT_SYSTEM'),
    domainId: makeDomainID('OBJECT'),
    description: 'Authoritative owner of physical items, artifacts, and possession tracking.',
    authorityLevel: 2
  },
  KNOWLEDGE: {
    ownerId: makeSystemID('KNOWLEDGE_SYSTEM'),
    domainId: makeDomainID('KNOWLEDGE'),
    description: 'Authoritative owner of verified secrets, lore, and epistemic boundaries.',
    authorityLevel: 2
  },
  STATE: {
    ownerId: makeSystemID('STATE_SYSTEM'),
    domainId: makeDomainID('STATE'),
    description: 'Authoritative owner of universe global state vectors and metrics.',
    authorityLevel: 1
  },
  LOCATION: {
    ownerId: makeSystemID('LOCATION_SYSTEM'),
    domainId: makeDomainID('LOCATION'),
    description: 'Authoritative owner of spatial nodes, geography, and physical occupancy.',
    authorityLevel: 2
  },
  DAILY_UNIVERSE: {
    ownerId: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
    domainId: makeDomainID('DAILY_UNIVERSE'),
    description: 'Authoritative orchestrator of diurnal daily universe cycles.',
    authorityLevel: 2
  },
  DAILY_STORY: {
    ownerId: makeSystemID('DAILY_STORY_SYSTEM'),
    domainId: makeDomainID('DAILY_STORY'),
    description: 'Authoritative owner of daily story lifecycle, incidents, and beat arcs.',
    authorityLevel: 3
  },
  DAILY_PAGE: {
    ownerId: makeSystemID('DAILY_PAGE_SYSTEM'),
    domainId: makeDomainID('DAILY_PAGE'),
    description: 'Authoritative owner of daily page composition and presentation layout.',
    authorityLevel: 3
  },
  NARRATOR: {
    ownerId: makeSystemID('NARRATOR_SYSTEM'),
    domainId: makeDomainID('NARRATOR'),
    description: 'Authoritative owner of prose transformation, voice styling, and narrative rendering.',
    authorityLevel: 4
  },
  INSTANCE_MANAGEMENT: {
    ownerId: makeSystemID('INSTANCE_MANAGEMENT_SYSTEM'),
    domainId: makeDomainID('INSTANCE_MANAGEMENT'),
    description: 'Authoritative owner of persistent storage, snapshotting, and instance serialization.',
    authorityLevel: 1
  },
  ENGINE: {
    ownerId: makeSystemID('ENGINE_SYSTEM'),
    domainId: makeDomainID('ENGINE'),
    description: 'Authoritative owner of execution orchestration, state machine transitions, and task routing.',
    authorityLevel: 1
  }
};

/**
 * Deterministically retrieves the authoritative owner for a domain.
 * Returns undefined if the domain is not registered.
 */
export function getOwner(domain: string | DomainID): DomainOwner | undefined {
  if (Object.prototype.hasOwnProperty.call(DOMAIN_OWNERS, domain)) {
    return DOMAIN_OWNERS[domain as CoreDomain];
  }
  return undefined;
}

/**
 * Checks if a domain string is a recognized core domain.
 */
export function isKnownDomain(domain: string): domain is CoreDomain {
  return Object.prototype.hasOwnProperty.call(DOMAIN_OWNERS, domain);
}

/**
 * Returns all registered domain owners.
 */
export function getAllOwners(): DomainOwner[] {
  return Object.values(DOMAIN_OWNERS);
}
