/**
 * Phase 8: Generic Development Seed Data
 *
 * Provides non-canon generic entities (character-A, location-A, object-A, etc.)
 * purely for testing schema structures, cross-domain references, and repository operations.
 */

import { makeEntityID, makeSystemID, makeDomainID } from '../../types/identifiers.ts';
import { EntityType, EntityLifecycleStatus, AuthorityLevel, ModelValidationStatus } from './types.ts';
import { EntityIdentityFactory } from './identity.ts';
import { RevisionHistoryManager } from './history.ts';
import { createProvenanceMetadata } from './provenance.ts';
import { CharacterEntity } from './character.ts';
import { RelationshipEntity } from './relationship.ts';
import { ObjectEntity } from './object.ts';
import { KnowledgeEntity } from './knowledge.ts';
import { StateEntity } from './state.ts';
import { LocationEntity } from './location.ts';
import { EventEntity } from './event.ts';
import { ProcessEntity } from './process.ts';
import { UnresolvedConditionEntity } from './unresolved.ts';
import { UniverseModel, UniverseModelFactory } from './universe.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export function createGenericSeedUniverse(): UniverseModel {
  const seedTime = '2024-01-01T00:00:00Z';
  const charOwner = makeSystemID('CHARACTER_SYSTEM');
  const relOwner = makeSystemID('RELATIONSHIP_SYSTEM');
  const objOwner = makeSystemID('OBJECT_SYSTEM');
  const knowOwner = makeSystemID('KNOWLEDGE_SYSTEM');
  const stateOwner = makeSystemID('STATE_SYSTEM');
  const locOwner = makeSystemID('LOCATION_SYSTEM');
  const eventOwner = makeSystemID('ENGINE_SYSTEM');
  const procOwner = makeSystemID('DAILY_UNIVERSE_SYSTEM');
  const unresOwner = makeSystemID('DAILY_UNIVERSE_SYSTEM');

  // 1. Locations
  const locationA: LocationEntity = {
    identity: EntityIdentityFactory.create({
      id: 'LOC_GENERIC_A',
      entityType: EntityType.LOCATION,
      displayName: 'Location Alpha',
      status: EntityLifecycleStatus.ACTIVE
    }),
    locationType: 'SETTLEMENT',
    parentLocationRef: null,
    adjacentLocationRefs: ['LOC_GENERIC_B'],
    containedLocationRefs: ['LOC_GENERIC_SUB_A'],
    accessibilityStatus: 'OPEN',
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    history: RevisionHistoryManager.createInitial(locOwner, seedTime),
    provenance: createProvenanceMetadata(locOwner, makeDomainID('LOCATION'))
  };

  const locationSubA: LocationEntity = {
    identity: EntityIdentityFactory.create({
      id: 'LOC_GENERIC_SUB_A',
      entityType: EntityType.LOCATION,
      displayName: 'Location Alpha Inner Chamber',
      status: EntityLifecycleStatus.ACTIVE
    }),
    locationType: 'INTERIOR_SPACE',
    parentLocationRef: 'LOC_GENERIC_A',
    adjacentLocationRefs: [],
    containedLocationRefs: [],
    accessibilityStatus: 'OPEN',
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    history: RevisionHistoryManager.createInitial(locOwner, seedTime),
    provenance: createProvenanceMetadata(locOwner, makeDomainID('LOCATION'))
  };

  const locationB: LocationEntity = {
    identity: EntityIdentityFactory.create({
      id: 'LOC_GENERIC_B',
      entityType: EntityType.LOCATION,
      displayName: 'Location Beta',
      status: EntityLifecycleStatus.ACTIVE
    }),
    locationType: 'STRUCTURE',
    parentLocationRef: null,
    adjacentLocationRefs: ['LOC_GENERIC_A'],
    containedLocationRefs: [],
    accessibilityStatus: 'OPEN',
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    history: RevisionHistoryManager.createInitial(locOwner, seedTime),
    provenance: createProvenanceMetadata(locOwner, makeDomainID('LOCATION'))
  };

  // 2. Characters
  const charA: CharacterEntity = {
    identity: EntityIdentityFactory.create({
      id: 'CHAR_GENERIC_A',
      entityType: EntityType.CHARACTER,
      displayName: 'Character Alpha',
      status: EntityLifecycleStatus.ACTIVE,
      tags: ['protagonist_archetype']
    }),
    roleReferences: ['ROLE_EXPLORER'],
    stateReference: 'STATE_CHAR_A_01',
    knowledgeReferences: ['KNOW_GENERIC_01'],
    relationshipReferences: ['REL_GENERIC_A_B'],
    locationReference: 'LOC_GENERIC_A',
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    continuityReference: 'CONT_CHAR_A_INITIAL',
    history: RevisionHistoryManager.createInitial(charOwner, seedTime),
    provenance: createProvenanceMetadata(charOwner, makeDomainID('CHARACTER'))
  };

  const charB: CharacterEntity = {
    identity: EntityIdentityFactory.create({
      id: 'CHAR_GENERIC_B',
      entityType: EntityType.CHARACTER,
      displayName: 'Character Beta',
      status: EntityLifecycleStatus.ACTIVE
    }),
    roleReferences: ['ROLE_SCHOLAR'],
    stateReference: 'STATE_CHAR_B_01',
    knowledgeReferences: [],
    relationshipReferences: ['REL_GENERIC_A_B'],
    locationReference: 'LOC_GENERIC_B',
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    history: RevisionHistoryManager.createInitial(charOwner, seedTime),
    provenance: createProvenanceMetadata(charOwner, makeDomainID('CHARACTER'))
  };

  // 3. Relationships
  const relAB: RelationshipEntity = {
    relationshipId: 'REL_GENERIC_A_B',
    subjectRef: makeEntityID('CHAR_GENERIC_A'),
    targetRef: makeEntityID('CHAR_GENERIC_B'),
    relationshipType: 'ALLY',
    direction: 'BIDIRECTIONAL',
    status: EntityLifecycleStatus.ACTIVE,
    strength: 0.8,
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    continuityReference: 'CONT_REL_AB_INITIAL',
    history: RevisionHistoryManager.createInitial(relOwner, seedTime),
    provenance: createProvenanceMetadata(relOwner, makeDomainID('RELATIONSHIP'))
  };

  // 4. Objects
  const objA: ObjectEntity = {
    identity: EntityIdentityFactory.create({
      id: 'OBJ_GENERIC_A',
      entityType: EntityType.OBJECT,
      displayName: 'Generic Artifact A',
      status: EntityLifecycleStatus.ACTIVE
    }),
    category: 'ARTIFACT',
    ownershipRef: makeEntityID('CHAR_GENERIC_A'),
    possessionRef: makeEntityID('CHAR_GENERIC_A'),
    locationRef: 'LOC_GENERIC_A',
    accessStatus: 'ACCESSIBLE',
    quantity: 1,
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    history: RevisionHistoryManager.createInitial(objOwner, seedTime),
    provenance: createProvenanceMetadata(objOwner, makeDomainID('OBJECT'))
  };

  // 5. Knowledge
  const knowA: KnowledgeEntity = {
    knowledgeId: 'KNOW_GENERIC_01',
    knowerRef: makeEntityID('CHAR_GENERIC_A'),
    referencedSubject: 'OBJ_GENERIC_A',
    statement: 'Character Alpha knows Artifact A is located at Location Alpha.',
    acquisitionSource: 'OBSERVATION',
    certainty: 'FACT',
    isUniverseFactConfirmed: true,
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    history: RevisionHistoryManager.createInitial(knowOwner, seedTime),
    provenance: createProvenanceMetadata(knowOwner, makeDomainID('KNOWLEDGE'))
  };

  // 6. States
  const stateA: StateEntity = {
    stateId: 'STATE_CHAR_A_01',
    entityRef: makeEntityID('CHAR_GENERIC_A'),
    stateType: 'CONDITION',
    currentValue: 'NORMAL',
    lifecycle: EntityLifecycleStatus.ACTIVE,
    validationStatus: ModelValidationStatus.VALID,
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    transitionCount: 0,
    history: RevisionHistoryManager.createInitial(stateOwner, seedTime),
    provenance: createProvenanceMetadata(stateOwner, makeDomainID('STATE'))
  };

  const stateB: StateEntity = {
    stateId: 'STATE_CHAR_B_01',
    entityRef: makeEntityID('CHAR_GENERIC_B'),
    stateType: 'CONDITION',
    currentValue: 'NORMAL',
    lifecycle: EntityLifecycleStatus.ACTIVE,
    validationStatus: ModelValidationStatus.VALID,
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    transitionCount: 0,
    history: RevisionHistoryManager.createInitial(stateOwner, seedTime),
    provenance: createProvenanceMetadata(stateOwner, makeDomainID('STATE'))
  };

  // 7. Events
  const eventA: EventEntity = {
    eventId: 'EVT_GENERIC_01',
    eventType: 'EXPEDITION_LAUNCH',
    title: 'Alpha sets forth from Location Alpha',
    participantRefs: [makeEntityID('CHAR_GENERIC_A')],
    objectRefs: [makeEntityID('OBJ_GENERIC_A')],
    locationRef: 'LOC_GENERIC_A',
    temporalInterval: {
      start: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    status: 'RESOLVED',
    causeRefs: [],
    consequenceRefs: ['EVT_GENERIC_CONSEQ_01'],
    sourceSystem: eventOwner,
    validationStatus: ModelValidationStatus.VALID,
    provenance: createProvenanceMetadata(eventOwner, makeDomainID('ENGINE'))
  };

  // 8. Processes
  const procA: ProcessEntity = {
    processId: 'PROC_GENERIC_01',
    processType: 'JOURNEY',
    title: 'Overland expedition toward Location Beta',
    participantRefs: [makeEntityID('CHAR_GENERIC_A')],
    objectRefs: [makeEntityID('OBJ_GENERIC_A')],
    locationRef: 'LOC_GENERIC_A',
    startTime: seedTime,
    currentStatus: 'ACTIVE',
    progressRatio: 0.25,
    dependencies: [],
    unresolvedConditionRefs: ['UNRES_GENERIC_WEATHER'],
    temporalValidity: {
      effectiveFrom: seedTime,
      temporalCategory: TemporalStatus.ACTUAL
    },
    sourceSystem: procOwner,
    validationStatus: ModelValidationStatus.VALID,
    history: RevisionHistoryManager.createInitial(procOwner, seedTime),
    provenance: createProvenanceMetadata(procOwner, makeDomainID('DAILY_UNIVERSE'))
  };

  // 9. Unresolved Conditions
  const unresA: UnresolvedConditionEntity = {
    conditionId: 'UNRES_GENERIC_WEATHER',
    conditionType: 'ENVIRONMENTAL_UNCERTAINTY',
    description: 'Incoming weather front over mountain pass yet unobserved',
    ownerDomain: makeDomainID('LOCATION'),
    targetEntityRef: 'LOC_GENERIC_B',
    temporalScope: {
      effectiveFrom: seedTime,
      deadline: '2024-01-05T00:00:00Z',
      temporalCategory: TemporalStatus.POSSIBILITY
    },
    dependencyRefs: [],
    currentStatus: 'CARRYOVER',
    createdAt: seedTime,
    lastUpdated: seedTime,
    sourceSystem: unresOwner,
    validationStatus: ModelValidationStatus.VALID,
    provenance: createProvenanceMetadata(unresOwner, makeDomainID('DAILY_UNIVERSE'))
  };

  return UniverseModelFactory.create({
    universeId: 'UNIVERSE_SEED_01',
    universeDate: '2024-01-01',
    universeTime: seedTime,
    characters: {
      [charA.identity.id]: charA,
      [charB.identity.id]: charB
    },
    relationships: {
      [relAB.relationshipId]: relAB
    },
    objects: {
      [objA.identity.id]: objA
    },
    knowledge: {
      [knowA.knowledgeId]: knowA
    },
    states: {
      [stateA.stateId]: stateA,
      [stateB.stateId]: stateB
    },
    locations: {
      [locationA.identity.id]: locationA,
      [locationSubA.identity.id]: locationSubA,
      [locationB.identity.id]: locationB
    },
    events: {
      [eventA.eventId]: eventA
    },
    processes: {
      [procA.processId]: procA
    },
    unresolvedConditions: {
      [unresA.conditionId]: unresA
    }
  });
}
