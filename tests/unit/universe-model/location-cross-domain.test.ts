/**
 * Location Cross-Domain Integration & Resolution Test Suite
 *
 * Exhaustively verifies all 39 requirements specified in Section 24:
 * - Universe <-> Location (1-5)
 * - Character <-> Location (6-8 + non-location check)
 * - State <-> Location (9-11)
 * - Object <-> Location (12-14)
 * - Location graph (15-24)
 * - Resolver (25-29)
 * - Rename (30-31)
 * - Persistence & Authority (32-39)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createGenericSeedUniverse,
  UniverseModel,
  UniverseModelValidator,
  LocationManager,
  LocationReferenceResolver,
  LocationDataSource,
  LocationAccessibilityStatus,
  LocationEntity,
  CharacterEntity,
  CharacterStateEntity,
  CharacterStateLifecycle,
  ObjectEntity,
  EntityType,
  AuthorityLevel,
  EntityLifecycleStatus,
  EntityIdentityFactory,
  RevisionHistoryManager,
  createProvenanceMetadata,
  UniverseSerializer,
  InMemoryUniverseRepository
} from '../../../core/universe/model/index.ts';

import { UniverseAuthorityStore } from '../../../core/platform/universe/index.ts';

import { makeDomainID, makeEntityID, makeSystemID } from '../../../core/types/identifiers.ts';
import { TemporalStatus } from '../../../core/types/temporal.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

const LOC_ACTOR = makeSystemID('LOCATION_SYSTEM');
const CHAR_ACTOR = makeSystemID('CHARACTER_SYSTEM');
const OBJ_ACTOR = makeSystemID('OBJECT_SYSTEM');
const STATE_ACTOR = makeSystemID('STATE_SYSTEM');
const NOW = new Date().toISOString();

describe('Universe Integration & Cross-Domain Resolution: Location System', () => {

  // =========================================================================
  // 1. Universe <-> Location (Requirements 1 - 5)
  // =========================================================================
  describe('1. Universe <-> Location Integration', () => {
    it('1. Universe successfully loads locations', () => {
      const universe = createGenericSeedUniverse();
      assert.ok(universe.locations);
      assert.ok(universe.locations['LOC_GENERIC_A']);
      assert.strictEqual(universe.locations['LOC_GENERIC_A'].identity.displayName, 'Location Alpha');
      const validation = UniverseModelValidator.validate(universe);
      assert.strictEqual(validation.isValid, true);
    });

    it('2. Empty Location collection is valid when no cross-references exist', () => {
      const universe: UniverseModel = {
        universeId: 'UNIV_EMPTY_LOC',
        schemaVersion: '1.0.0',
        metadata: {
          title: 'Empty Loc Universe',
          seed: 'seed-test',
          createdAt: NOW,
          updatedAt: NOW,
          version: 1
        },
        temporalContext: {
          currentUniverseDate: '2026-09-22',
          timelineState: 'NORMAL',
          calendarType: 'STANDARD'
        },
        characters: {},
        actors: {},
        profiles: {},
        behaviors: {},
        states: {},
        styles: {},
        relationships: {},
        objects: {},
        objectRelations: {},
        knowledge: {},
        locations: {},
        events: {},
        processes: {},
        consequences: {},
        unresolvedConditions: {},
        continuityItems: {},
        domainBindings: []
      };

      const validation = UniverseModelValidator.validate(universe);
      assert.strictEqual(validation.isValid, true);
    });

    it('3. Location map key must match entity ID (rejects ID_KEY_MISMATCH)', () => {
      const universe = createGenericSeedUniverse();
      const loc = universe.locations['LOC_GENERIC_A'];
      const mutatedLocations = {
        ...universe.locations,
        'LOC_MISMATCHED_KEY': loc
      };
      delete (mutatedLocations as Record<string, unknown>)['LOC_GENERIC_A'];

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: mutatedLocations
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'ID_KEY_MISMATCH' && i.path.includes('LOC_MISMATCHED_KEY')));
    });

    it('4. Invalid Location ID is rejected', () => {
      const universe = createGenericSeedUniverse();
      const corruptLoc: LocationEntity = {
        ...universe.locations['LOC_GENERIC_A'],
        identity: {
          id: '' as unknown as string,
          entityType: EntityType.LOCATION,
          displayName: 'Invalid ID Loc',
          status: EntityLifecycleStatus.ACTIVE
        }
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          '': corruptLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'INVALID_LOCATION_ID'));
    });

    it('5. Invalid source authority is rejected (AI proposal or UNKNOWN marked AUTHORITATIVE)', () => {
      const universe = createGenericSeedUniverse();
      const corruptLoc: LocationEntity = {
        ...universe.locations['LOC_GENERIC_A'],
        source: LocationDataSource.AI_PROPOSAL,
        provenance: {
          ...universe.locations['LOC_GENERIC_A'].provenance,
          authorityLevel: AuthorityLevel.AUTHORITATIVE
        }
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': corruptLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'INVALID_SOURCE_AUTHORITY'));
    });
  });

  // =========================================================================
  // 2. Character <-> Location (Requirements 6 - 8 + Non-Location Type Check)
  // =========================================================================
  describe('2. Character <-> Location Referential Integrity', () => {
    it('6. Valid character location reference is accepted', () => {
      const universe = createGenericSeedUniverse();
      const char = universe.characters['CHAR_GENERIC_A'];
      assert.strictEqual(char.locationReference, 'LOC_GENERIC_A');
      assert.ok(universe.locations['LOC_GENERIC_A']);
      const validation = UniverseModelValidator.validate(universe);
      assert.strictEqual(validation.isValid, true);
    });

    it('7. Dangling character location reference is rejected', () => {
      const universe = createGenericSeedUniverse();
      const char = universe.characters['CHAR_GENERIC_A'];
      const mutatedChar: CharacterEntity = {
        ...char,
        locationReference: 'LOC_DOES_NOT_EXIST'
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        characters: {
          ...universe.characters,
          'CHAR_GENERIC_A': mutatedChar
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'DANGLING_LOCATION_REFERENCE' && i.path === 'characters.CHAR_GENERIC_A.locationReference'));
    });

    it('8. UNKNOWN location reference is accepted as an unresolved baseline', () => {
      const universe = createGenericSeedUniverse();
      const char = universe.characters['CHAR_GENERIC_A'];
      const unknownChar: CharacterEntity = {
        ...char,
        locationReference: 'UNKNOWN'
      };

      const validUniverse: UniverseModel = {
        ...universe,
        characters: {
          ...universe.characters,
          'CHAR_GENERIC_A': unknownChar
        }
      };

      const validation = UniverseModelValidator.validate(validUniverse);
      assert.strictEqual(validation.isValid, true);
    });

    it('8b. Character location reference pointing to non-location entity (Object or Character) is rejected', () => {
      const universe = createGenericSeedUniverse();
      const char = universe.characters['CHAR_GENERIC_A'];
      const invalidChar: CharacterEntity = {
        ...char,
        locationReference: 'OBJ_GENERIC_A' // Points to an object!
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        characters: {
          ...universe.characters,
          'CHAR_GENERIC_A': invalidChar
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'INVALID_ENTITY_REFERENCE_TYPE' && i.path === 'characters.CHAR_GENERIC_A.locationReference'));
    });
  });

  // =========================================================================
  // 3. State <-> Location (Requirements 9 - 11)
  // =========================================================================
  describe('3. State <-> Location Referential Integrity', () => {
    const createBaseCharState = () => {
      const res = CharacterStateLifecycle.createManual({
        stateId: 'STATE_CHAR_STATE_A',
        characterId: 'CHAR_GENERIC_A',
        snapshot: {
          currentLocationReference: 'LOC_GENERIC_A'
        },
        effectiveFrom: '2024-01-01T00:00:00Z'
      });
      return res.data!;
    };

    it('9. Valid currentLocationReference in CharacterState is accepted', () => {
      const universe = createGenericSeedUniverse();
      const charState = createBaseCharState();
      const testUniverse: UniverseModel = {
        ...universe,
        states: {
          ...universe.states,
          [charState.stateId]: charState
        }
      };

      assert.strictEqual(charState.currentValue.currentLocationReference, 'LOC_GENERIC_A');
      const validation = UniverseModelValidator.validate(testUniverse);
      assert.strictEqual(validation.isValid, true);
    });

    it('10. Dangling currentLocationReference in CharacterState is rejected', () => {
      const universe = createGenericSeedUniverse();
      const charState = createBaseCharState();
      const mutatedState: CharacterStateEntity = {
        ...charState,
        currentValue: {
          ...charState.currentValue,
          currentLocationReference: 'LOC_LOST_IN_SPACE'
        }
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        states: {
          ...universe.states,
          [charState.stateId]: mutatedState
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'DANGLING_LOCATION_REFERENCE' && i.path === `states.${charState.stateId}.currentValue.currentLocationReference`));
    });

    it('11. State currentLocationReference pointing to a non-location entity is rejected', () => {
      const universe = createGenericSeedUniverse();
      const charState = createBaseCharState();
      const mutatedState: CharacterStateEntity = {
        ...charState,
        currentValue: {
          ...charState.currentValue,
          currentLocationReference: 'CHAR_GENERIC_A' // Points to character, not location!
        }
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        states: {
          ...universe.states,
          [charState.stateId]: mutatedState
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'INVALID_ENTITY_REFERENCE_TYPE' && i.path === `states.${charState.stateId}.currentValue.currentLocationReference`));
    });
  });

  // =========================================================================
  // 4. Object <-> Location (Requirements 12 - 14)
  // =========================================================================
  describe('4. Object <-> Location Referential Integrity', () => {
    it('12. Valid object locationRef is accepted', () => {
      const universe = createGenericSeedUniverse();
      const obj = universe.objects['OBJ_GENERIC_A'];
      assert.strictEqual(obj.locationRef, 'LOC_GENERIC_A');
      const validation = UniverseModelValidator.validate(universe);
      assert.strictEqual(validation.isValid, true);
    });

    it('13. Dangling object locationRef is rejected', () => {
      const universe = createGenericSeedUniverse();
      const obj = universe.objects['OBJ_GENERIC_A'];
      const mutatedObj: ObjectEntity = {
        ...obj,
        locationRef: 'LOC_NON_EXISTENT'
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        objects: {
          ...universe.objects,
          'OBJ_GENERIC_A': mutatedObj
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'DANGLING_LOCATION_REFERENCE' && i.path === 'objects.OBJ_GENERIC_A.locationRef'));
    });

    it('13b. Object locationRef pointing to non-location entity is rejected', () => {
      const universe = createGenericSeedUniverse();
      const obj = universe.objects['OBJ_GENERIC_A'];
      const mutatedObj: ObjectEntity = {
        ...obj,
        locationRef: 'CHAR_GENERIC_A' // Points to character!
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        objects: {
          ...universe.objects,
          'OBJ_GENERIC_A': mutatedObj
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'INVALID_ENTITY_REFERENCE_TYPE' && i.path === 'objects.OBJ_GENERIC_A.locationRef'));
    });

    it('14. Object container reference is distinguished from Location reference (container pointing to Location is rejected)', () => {
      const universe = createGenericSeedUniverse();
      const obj = universe.objects['OBJ_GENERIC_A'];
      // containedWithinObjectRef should point to an OBJECT, not a LOCATION
      const mutatedObj: ObjectEntity = {
        ...obj,
        containedWithinObjectRef: 'LOC_GENERIC_A'
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        objects: {
          ...universe.objects,
          'OBJ_GENERIC_A': mutatedObj
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'INVALID_CONTAINER_ENTITY_TYPE' && i.path === 'objects.OBJ_GENERIC_A.containedWithinObjectRef'));
    });
  });

  // =========================================================================
  // 5. Location Graph Integrity (Requirements 15 - 24)
  // =========================================================================
  describe('5. Location Graph Integrity', () => {
    it('15. Valid parent location is accepted', () => {
      const universe = createGenericSeedUniverse();
      const subLoc = universe.locations['LOC_GENERIC_SUB_A'];
      assert.strictEqual(subLoc.parentLocationRef, 'LOC_GENERIC_A');
      const validation = UniverseModelValidator.validate(universe);
      assert.strictEqual(validation.isValid, true);
    });

    it('16. Dangling parent location is rejected', () => {
      const universe = createGenericSeedUniverse();
      const subLoc = universe.locations['LOC_GENERIC_SUB_A'];
      const corruptSubLoc: LocationEntity = {
        ...subLoc,
        parentLocationRef: 'LOC_GHOST_PARENT'
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_SUB_A': corruptSubLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'DANGLING_PARENT_LOCATION_REFERENCE'));
    });

    it('17. Self-parent is rejected', () => {
      const universe = createGenericSeedUniverse();
      const loc = universe.locations['LOC_GENERIC_A'];
      const corruptLoc: LocationEntity = {
        ...loc,
        parentLocationRef: 'LOC_GENERIC_A'
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': corruptLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'SELF_PARENT_LOCATION'));
    });

    it('18. Valid adjacency is accepted (symmetric)', () => {
      const universe = createGenericSeedUniverse();
      const locA = universe.locations['LOC_GENERIC_A'];
      const locB = universe.locations['LOC_GENERIC_B'];
      assert.ok(locA.adjacentLocationRefs.includes('LOC_GENERIC_B'));
      assert.ok(locB.adjacentLocationRefs.includes('LOC_GENERIC_A'));
      const validation = UniverseModelValidator.validate(universe);
      assert.strictEqual(validation.isValid, true);
    });

    it('19. Dangling adjacency is rejected', () => {
      const universe = createGenericSeedUniverse();
      const locA = universe.locations['LOC_GENERIC_A'];
      const corruptLoc: LocationEntity = {
        ...locA,
        adjacentLocationRefs: ['LOC_GHOST_ADJACENT']
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': corruptLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'DANGLING_ADJACENT_LOCATION_REFERENCE'));
    });

    it('20. Self-adjacency is rejected', () => {
      const universe = createGenericSeedUniverse();
      const locA = universe.locations['LOC_GENERIC_A'];
      const corruptLoc: LocationEntity = {
        ...locA,
        adjacentLocationRefs: ['LOC_GENERIC_A']
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': corruptLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'SELF_ADJACENT_LOCATION'));
    });

    it('21. Valid contained location is accepted', () => {
      const universe = createGenericSeedUniverse();
      const locA = universe.locations['LOC_GENERIC_A'];
      assert.ok(locA.containedLocationRefs.includes('LOC_GENERIC_SUB_A'));
      const validation = UniverseModelValidator.validate(universe);
      assert.strictEqual(validation.isValid, true);
    });

    it('22. Dangling contained location is rejected', () => {
      const universe = createGenericSeedUniverse();
      const locA = universe.locations['LOC_GENERIC_A'];
      const corruptLoc: LocationEntity = {
        ...locA,
        containedLocationRefs: ['LOC_GHOST_CHILD']
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': corruptLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'DANGLING_CHILD_LOCATION_REFERENCE'));
    });

    it('23. Self-containment is rejected', () => {
      const universe = createGenericSeedUniverse();
      const locA = universe.locations['LOC_GENERIC_A'];
      const corruptLoc: LocationEntity = {
        ...locA,
        containedLocationRefs: ['LOC_GENERIC_A']
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': corruptLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'SELF_CONTAINED_LOCATION'));
    });

    it('24. Cyclic hierarchy is rejected', () => {
      const universe = createGenericSeedUniverse();
      // Make LOC_GENERIC_A parent of LOC_GENERIC_B, and LOC_GENERIC_B parent of LOC_GENERIC_A
      const locA = universe.locations['LOC_GENERIC_A'];
      const locB = universe.locations['LOC_GENERIC_B'];

      const cyclicA: LocationEntity = {
        ...locA,
        parentLocationRef: 'LOC_GENERIC_B',
        containedLocationRefs: []
      };
      const cyclicB: LocationEntity = {
        ...locB,
        parentLocationRef: 'LOC_GENERIC_A',
        containedLocationRefs: []
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': cyclicA,
          'LOC_GENERIC_B': cyclicB
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'CIRCULAR_LOCATION_HIERARCHY'));
    });

    it('24b. Graph references pointing to non-location entity are rejected', () => {
      const universe = createGenericSeedUniverse();
      const locA = universe.locations['LOC_GENERIC_A'];
      const corruptLoc: LocationEntity = {
        ...locA,
        parentLocationRef: 'CHAR_GENERIC_A' // Points to character!
      };

      const invalidUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': corruptLoc
        }
      };

      const validation = UniverseModelValidator.validate(invalidUniverse);
      assert.strictEqual(validation.isValid, false);
      assert.ok(validation.issues.some(i => i.code === 'INVALID_ENTITY_REFERENCE_TYPE' && i.path === 'locations.LOC_GENERIC_A.parentLocationRef'));
    });
  });

  // =========================================================================
  // 6. Location Reference Resolver (Requirements 25 - 29)
  // =========================================================================
  describe('6. Deterministic Reference Resolver', () => {
    const universe = createGenericSeedUniverse();

    it('25. Exact ID resolve returns EXACT_ID matchType', () => {
      const res = LocationReferenceResolver.resolveFromUniverse(universe, {
        locationId: 'LOC_GENERIC_A'
      });
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.matchedLocationId, 'LOC_GENERIC_A');
      assert.strictEqual(res.matchType, 'EXACT_ID');
      assert.strictEqual(res.matchedLocation?.identity.displayName, 'Location Alpha');
    });

    it('26. Exact name resolve returns EXACT_NAME matchType', () => {
      const res = LocationReferenceResolver.resolveFromUniverse(universe, {
        mentionOrName: 'Location Beta'
      });
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.matchedLocationId, 'LOC_GENERIC_B');
      assert.strictEqual(res.matchType, 'EXACT_NAME');
    });

    it('27. Alias resolve returns ALIAS matchType', () => {
      // Add an alias to Location Alpha
      const locWithAlias: LocationEntity = {
        ...universe.locations['LOC_GENERIC_A'],
        aliases: ['Old Town Alpha']
      };
      const testUniverse: UniverseModel = {
        ...universe,
        locations: {
          ...universe.locations,
          'LOC_GENERIC_A': locWithAlias
        }
      };

      const res = LocationReferenceResolver.resolveFromUniverse(testUniverse, {
        mentionOrName: 'Old Town Alpha'
      });
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.matchedLocationId, 'LOC_GENERIC_A');
      assert.strictEqual(res.matchType, 'ALIAS');
    });

    it('28. Not found when query does not match any candidate above threshold', () => {
      const res = LocationReferenceResolver.resolveFromUniverse(universe, {
        mentionOrName: 'Planet Neptune Crystal Cave'
      });
      assert.strictEqual(res.status, 'NOT_FOUND');
      assert.strictEqual(res.matchedLocationId, undefined);
    });

    it('29. Ambiguous when multiple locations tie with identical matching strength', () => {
      // Create two locations with the exact same display name
      const locTwinA: LocationEntity = {
        ...universe.locations['LOC_GENERIC_A'],
        identity: EntityIdentityFactory.create({
          id: 'LOC_TWIN_1',
          entityType: EntityType.LOCATION,
          displayName: 'Twin Oasis',
          status: EntityLifecycleStatus.ACTIVE
        }),
        parentLocationRef: null,
        adjacentLocationRefs: [],
        containedLocationRefs: []
      };
      const locTwinB: LocationEntity = {
        ...universe.locations['LOC_GENERIC_B'],
        identity: EntityIdentityFactory.create({
          id: 'LOC_TWIN_2',
          entityType: EntityType.LOCATION,
          displayName: 'Twin Oasis',
          status: EntityLifecycleStatus.ACTIVE
        }),
        parentLocationRef: null,
        adjacentLocationRefs: [],
        containedLocationRefs: []
      };

      const ambigUniverse: UniverseModel = {
        ...universe,
        locations: {
          'LOC_TWIN_1': locTwinA,
          'LOC_TWIN_2': locTwinB
        }
      };

      const res = LocationReferenceResolver.resolveFromUniverse(ambigUniverse, {
        mentionOrName: 'Twin Oasis'
      });
      assert.strictEqual(res.status, 'AMBIGUOUS');
      assert.strictEqual(res.matchedLocationId, undefined);
      assert.ok(res.reason.includes('ambiguous'));
    });

    it('Resolver operates strictly read-only without mutating the Universe', () => {
      const beforeSnapshot = JSON.stringify(universe.locations);
      LocationReferenceResolver.resolveFromUniverse(universe, {
        mentionOrName: 'Location Alpha'
      });
      const afterSnapshot = JSON.stringify(universe.locations);
      assert.strictEqual(beforeSnapshot, afterSnapshot);
    });
  });

  // =========================================================================
  // 7. Location Rename Semantics (Requirements 30 - 31)
  // =========================================================================
  describe('7. Location Rename Semantics', () => {
    it('30. Rename maintains stable ID unchanged', () => {
      const universe = createGenericSeedUniverse();
      const loc = universe.locations['LOC_GENERIC_A'];
      const renameRes = LocationManager.renameLocation(loc, {
        newName: 'Citadel Prime',
        retainOldAsAlias: true,
        reason: 'Renamed by royal decree',
        effectiveTime: NOW,
        actor: LOC_ACTOR,
        source: LocationDataSource.USER_DEFINED
      });

      assert.strictEqual(renameRes.success, true);
      assert.ok(renameRes.data);
      assert.strictEqual(renameRes.data.identity.id, 'LOC_GENERIC_A'); // Stable ID preserved!
      assert.strictEqual(renameRes.data.identity.displayName, 'Citadel Prime');
    });

    it('31. Previous name becomes alias and revision history is recorded', () => {
      const universe = createGenericSeedUniverse();
      const loc = universe.locations['LOC_GENERIC_A'];
      const renameRes = LocationManager.renameLocation(loc, {
        newName: 'Citadel Prime',
        retainOldAsAlias: true,
        reason: 'Historical renaming',
        effectiveTime: NOW,
        actor: LOC_ACTOR,
        source: LocationDataSource.USER_DEFINED
      });

      assert.strictEqual(renameRes.success, true);
      assert.ok(renameRes.data);
      assert.ok(renameRes.data.aliases?.includes('Location Alpha'));
      assert.ok(renameRes.data.history.revisions.length >= 2);
      const latestRevision = renameRes.data.history.revisions[renameRes.data.history.revisions.length - 1];
      assert.ok(latestRevision.changedFields.includes('identity.displayName'));
      assert.strictEqual(latestRevision.reason, 'Historical renaming');
    });
  });

  // =========================================================================
  // 8. Persistence, Authority & Single Source of Truth (Requirements 32 - 39)
  // =========================================================================
  describe('8. Persistence & Authority Invariants', () => {
    it('32 - 36. Serialization/deserialization preserves Location graph, provenance, temporal, and history', () => {
      const universe = createGenericSeedUniverse();
      const serialized = UniverseSerializer.serialize(universe);
      const deserializedRes = UniverseSerializer.deserialize(serialized);

      assert.strictEqual(deserializedRes.success, true);
      const roundtripUniverse = deserializedRes.data!;

      // Verify locations exist
      assert.ok(roundtripUniverse.locations);
      assert.ok(roundtripUniverse.locations['LOC_GENERIC_A']);
      assert.ok(roundtripUniverse.locations['LOC_GENERIC_SUB_A']);
      assert.ok(roundtripUniverse.locations['LOC_GENERIC_B']);

      // 33. Graph refs preserved
      const locA = roundtripUniverse.locations['LOC_GENERIC_A'];
      const subA = roundtripUniverse.locations['LOC_GENERIC_SUB_A'];
      assert.strictEqual(subA.parentLocationRef, 'LOC_GENERIC_A');
      assert.ok(locA.containedLocationRefs.includes('LOC_GENERIC_SUB_A'));
      assert.ok(locA.adjacentLocationRefs.includes('LOC_GENERIC_B'));

      // 34. Provenance preserved
      assert.strictEqual(locA.provenance.domainId, 'LOCATION');
      assert.strictEqual(locA.provenance.authorityLevel, AuthorityLevel.AUTHORITATIVE);

      // 35. Temporal validity preserved
      assert.ok(locA.temporalValidity);
      assert.strictEqual(locA.temporalValidity.temporalCategory, TemporalStatus.ACTUAL);

      // 36. History preserved
      assert.ok(locA.history.revisions.length > 0);
      assert.strictEqual(locA.history.revisions[0].revisionId, 'REV_0001');

      // Roundtrip validates cleanly
      const validation = UniverseModelValidator.validate(roundtripUniverse);
      assert.strictEqual(validation.isValid, true);
    });

    it('37. AI Proposal source is rejected for authoritative location mutations', () => {
      const universe = createGenericSeedUniverse();
      const loc = universe.locations['LOC_GENERIC_A'];
      const res = LocationManager.renameLocation(loc, {
        newName: 'AI Proposed City',
        reason: 'Generated by AI agent',
        effectiveTime: NOW,
        actor: LOC_ACTOR,
        source: LocationDataSource.AI_PROPOSAL
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
    });

    it('38. Production/story layers cannot directly mutate Location in repository without domain ownership', () => {
      const repo = new InMemoryUniverseRepository();
      const universe = createGenericSeedUniverse();
      const loc = universe.locations['LOC_GENERIC_A'];
      const locDomain = makeDomainID('LOCATION');
      const illegalActor = makeSystemID('DAILY_STORY_PRODUCER');

      // Attempting to save Location under a non-LOCATION owner actor must fail
      const saveRes = repo.saveDomainEntity(
        locDomain,
        loc.identity.id,
        loc,
        illegalActor
      );

      assert.strictEqual(saveRes.success, false);
      assert.strictEqual(saveRes.error, EngineErrorCode.UNAUTHORIZED_REPOSITORY_MUTATION);
    });

    it('39. Mounted Universe remains the single authoritative source of truth', () => {
      const universe = createGenericSeedUniverse();
      const store = new UniverseAuthorityStore();
      store.mount(universe, 'SANDBOX');

      const mounted = store.get();
      assert.ok(mounted);
      assert.ok(mounted.universe.locations['LOC_GENERIC_A']);
      assert.strictEqual(mounted.universe.locations['LOC_GENERIC_A'].identity.displayName, 'Location Alpha');
    });
  });
});
