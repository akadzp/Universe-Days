/**
 * Comprehensive Unit Test Suite for Object System
 *
 * Verifies all requirements:
 * A. Identity
 * B. Type
 * C. Ownership & Predecessor Guard
 * D. Possession
 * E. Usage
 * F. Wearing
 * G. Location & Container
 * H. Condition
 * I. Status & Historical Preservation
 * J. Reference Resolver
 * K. Duplicate Emergence Prevention
 * L. Transient Object Filtering
 * M. Source Authority
 * N. Object Relations
 * O. Actor Boundary Validation
 * P. Timeline & Revision Monotonicity
 * Q. Conflict Detection
 * R. Transaction Boundary & Rollback
 * S. Query Immutability
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ObjectSystem,
  ObjectType,
  ObjectIdentityStatus,
  ObjectPossessionStatus,
  ObjectCondition,
  ObjectStatus,
  ObjectDataSource,
  ObjectEmergenceResult,
  ObjectRelationType,
  ObjectEntity
} from '../../../core/universe/model/object.ts';

import {
  ObjectReferenceResolver
} from '../../../core/universe/model/object-reference.ts';

import {
  UniverseModelFactory,
  UniverseModel
} from '../../../core/universe/model/universe.ts';

import {
  UniverseModelValidator
} from '../../../core/universe/model/validation.ts';

import {
  InMemoryUniverseRepository
} from '../../../core/universe/model/repository.ts';

import {
  TransactionBoundary
} from '../../../core/engine/transaction.ts';

import {
  QueryProcessor,
  UniverseQuery
} from '../../../core/engine/query.ts';

import {
  ExecutionContext
} from '../../../core/engine/context.ts';

import {
  CommandValidator
} from '../../../core/engine/command.ts';

import {
  makeEntityID,
  makeSystemID,
  makeDomainID
} from '../../../core/types/identifiers.ts';

import {
  CharacterEntity
} from '../../../core/universe/model/character.ts';

import {
  EntityIdentityFactory
} from '../../../core/universe/model/identity.ts';

import {
  EntityLifecycleStatus,
  EntityType,
  AuthorityLevel
} from '../../../core/universe/model/types.ts';

import {
  RevisionHistoryManager
} from '../../../core/universe/model/history.ts';

import {
  createProvenanceMetadata
} from '../../../core/universe/model/provenance.ts';

import {
  TemporalStatus
} from '../../../core/types/temporal.ts';

function createMockCharacter(id: string, name: string): CharacterEntity {
  const actor = makeSystemID('CHARACTER_SYSTEM');
  const now = '2024-01-01T00:00:00Z';
  return {
    identity: EntityIdentityFactory.create({
      id,
      entityType: EntityType.CHARACTER,
      displayName: name,
      status: EntityLifecycleStatus.ACTIVE
    }),
    temporalValidity: {
      effectiveFrom: now,
      temporalCategory: TemporalStatus.ACTUAL
    },
    history: RevisionHistoryManager.createInitial(actor, now),
    provenance: createProvenanceMetadata(actor, makeDomainID('CHARACTER'))
  };
}

describe('Object System Full Implementation', () => {

  // A. IDENTITY
  describe('A. Identity', () => {
    it('creates object with valid Object ID', () => {
      const res = ObjectSystem.createObject({
        objectId: 'OBJ_SWORD_01',
        displayName: 'Silver Longsword',
        category: 'WEAPON',
        objectType: ObjectType.PHYSICAL
      });

      assert.equal(res.success, true);
      assert.ok(res.data);
      assert.equal(res.data.identity.id, 'OBJ_SWORD_01');
      assert.equal(res.data.identity.displayName, 'Silver Longsword');
      assert.equal(res.data.objectName, 'Silver Longsword');
    });

    it('rejects creation with empty or invalid Object ID', () => {
      const res = ObjectSystem.createObject({
        objectId: '',
        category: 'WEAPON'
      });
      assert.equal(res.success, false);
    });

    it('validates duplicate Object ID mismatch with map key in UniverseModel', () => {
      const objRes = ObjectSystem.createObject({
        objectId: 'OBJ_SWORD_01',
        category: 'WEAPON'
      });
      assert.ok(objRes.data);

      const universe = UniverseModelFactory.create({
        universeId: 'UNIV_TEST',
        universeDate: '2024-01-01',
        objects: {
          'OBJ_DIFFERENT_KEY': objRes.data
        }
      });

      const report = UniverseModelValidator.validate(universe);
      assert.equal(report.isValid, false);
      assert.ok(report.issues.some(i => i.code === 'ID_KEY_MISMATCH'));
    });
  });

  // B. TYPE
  describe('B. Type', () => {
    it('supports PHYSICAL objects', () => {
      const res = ObjectSystem.createObject({
        objectId: 'OBJ_CHAIR_01',
        category: 'FURNITURE',
        objectType: ObjectType.PHYSICAL
      });
      assert.equal(res.success, true);
      assert.equal(res.data?.objectType, ObjectType.PHYSICAL);
    });

    it('supports DIGITAL objects', () => {
      const res = ObjectSystem.createObject({
        objectId: 'OBJ_CRYPTO_KEY_01',
        category: 'DIGITAL_ASSET',
        objectType: ObjectType.DIGITAL
      });
      assert.equal(res.success, true);
      assert.equal(res.data?.objectType, ObjectType.DIGITAL);
    });

    it('retains UNKNOWN objectType without guessing or assuming physical attributes', () => {
      const res = ObjectSystem.createObject({
        objectId: 'OBJ_ANOMALY_01',
        category: 'ANOMALY',
        objectType: ObjectType.UNKNOWN
      });
      assert.equal(res.success, true);
      assert.equal(res.data?.objectType, ObjectType.UNKNOWN);
    });
  });

  // C. OWNERSHIP
  describe('C. Ownership', () => {
    it('transfers ownership and updates revision history cleanly', () => {
      const charA = makeEntityID('CHAR_ALICE');
      const charB = makeEntityID('CHAR_BOB');

      const initialRes = ObjectSystem.createObject({
        objectId: 'OBJ_RELIC_01',
        category: 'ARTIFACT',
        ownershipRef: charA
      });
      assert.ok(initialRes.data);
      const initial = initialRes.data;

      const transferRes = ObjectSystem.transferOwnership(initial, {
        currentOwner: charA,
        targetOwner: charB,
        effectiveTime: '2024-01-02T10:00:00Z',
        trigger: 'Alice gifted relic to Bob',
        source: ObjectDataSource.USER_DEFINED
      });

      assert.equal(transferRes.success, true);
      assert.equal(transferRes.data?.ownershipRef, charB);
      assert.equal(transferRes.data?.history.revisions.length, 2);
      assert.equal(transferRes.data?.fieldSources?.ownershipRef, ObjectDataSource.USER_DEFINED);
    });

    it('rejects ownership transfer when predecessor mismatches (stale write protection)', () => {
      const charA = makeEntityID('CHAR_ALICE');
      const charB = makeEntityID('CHAR_BOB');
      const charCharlie = makeEntityID('CHAR_CHARLIE');

      const initialRes = ObjectSystem.createObject({
        objectId: 'OBJ_RELIC_02',
        category: 'ARTIFACT',
        ownershipRef: charA
      });
      assert.ok(initialRes.data);

      // Attempt transfer claiming current owner is Charlie instead of Alice
      const transferRes = ObjectSystem.transferOwnership(initialRes.data, {
        currentOwner: charCharlie,
        targetOwner: charB,
        effectiveTime: '2024-01-02T10:00:00Z',
        trigger: 'Illegal stale transfer',
        source: ObjectDataSource.USER_DEFINED
      });

      assert.equal(transferRes.success, false);
      assert.ok(transferRes.message?.includes('Stale write detected'));
    });
  });

  // D. POSSESSION
  describe('D. Possession', () => {
    it('allows possessor / holder to be different from legal owner', () => {
      const owner = makeEntityID('CHAR_KING');
      const knight = makeEntityID('CHAR_KNIGHT');

      const res = ObjectSystem.createObject({
        objectId: 'OBJ_ROYAL_BANNER',
        category: 'INSIGNIA',
        ownershipRef: owner,
        possessionRef: knight,
        possessionStatus: ObjectPossessionStatus.HELD
      });

      assert.equal(res.success, true);
      assert.equal(res.data?.ownershipRef, owner);
      assert.equal(res.data?.possessionRef, knight);
      assert.equal(res.data?.possessionStatus, ObjectPossessionStatus.HELD);
    });

    it('transfers possession independently of ownership', () => {
      const owner = makeEntityID('CHAR_KING');
      const knight1 = makeEntityID('CHAR_KNIGHT_1');
      const knight2 = makeEntityID('CHAR_KNIGHT_2');

      const initial = ObjectSystem.createObject({
        objectId: 'OBJ_SHIELD_01',
        category: 'ARMOR',
        ownershipRef: owner,
        possessionRef: knight1
      }).data!;

      const transferred = ObjectSystem.transferPossession(initial, {
        currentHolder: knight1,
        targetHolder: knight2,
        possessionStatus: ObjectPossessionStatus.EQUIPPED,
        effectiveTime: '2024-01-02T12:00:00Z',
        trigger: 'Knight 1 lent shield to Knight 2',
        source: ObjectDataSource.USER_DEFINED
      }).data!;

      assert.equal(transferred.ownershipRef, owner); // Still King's shield
      assert.equal(transferred.possessionRef, knight2);
      assert.equal(transferred.possessionStatus, ObjectPossessionStatus.EQUIPPED);
    });
  });

  // E. USAGE
  describe('E. Usage', () => {
    it('allows currentUserRef to be different from owner and holder', () => {
      const owner = makeEntityID('CHAR_OWNER');
      const holder = makeEntityID('CHAR_HOLDER');
      const user = makeEntityID('CHAR_GUEST');

      const res = ObjectSystem.createObject({
        objectId: 'OBJ_TELESCOPE_01',
        category: 'TOOL',
        ownershipRef: owner,
        possessionRef: holder,
        currentUserRef: user
      });

      assert.equal(res.success, true);
      assert.equal(res.data?.ownershipRef, owner);
      assert.equal(res.data?.possessionRef, holder);
      assert.equal(res.data?.currentUserRef, user);
    });

    it('changes user via changeUser lifecycle method', () => {
      const initial = ObjectSystem.createObject({
        objectId: 'OBJ_TERMINAL_01',
        category: 'COMPUTER',
        currentUserRef: null
      }).data!;

      const user = makeEntityID('CHAR_OPERATOR');
      const updated = ObjectSystem.changeUser(initial, {
        targetUser: user,
        effectiveTime: '2024-01-02T14:00:00Z',
        trigger: 'Operator logged in',
        source: ObjectDataSource.USER_DEFINED
      }).data!;

      assert.equal(updated.currentUserRef, user);
    });
  });

  // F. WEARING
  describe('F. Wearing', () => {
    it('allows currentWearerRef distinct from holder and owner', () => {
      const owner = makeEntityID('CHAR_GUILD');
      const wearer = makeEntityID('CHAR_CHAMPION');

      const res = ObjectSystem.createObject({
        objectId: 'OBJ_AMULET_01',
        category: 'JEWELRY',
        ownershipRef: owner,
        possessionRef: wearer,
        currentWearerRef: wearer
      });

      assert.equal(res.success, true);
      assert.equal(res.data?.currentWearerRef, wearer);
    });

    it('updates wearer via changeWearer', () => {
      const initial = ObjectSystem.createObject({
        objectId: 'OBJ_RING_01',
        category: 'JEWELRY',
        currentWearerRef: null
      }).data!;

      const wearer = makeEntityID('CHAR_HERO');
      const updated = ObjectSystem.changeWearer(initial, {
        targetWearer: wearer,
        effectiveTime: '2024-01-02T15:00:00Z',
        trigger: 'Hero equipped the ring',
        source: ObjectDataSource.USER_DEFINED
      }).data!;

      assert.equal(updated.currentWearerRef, wearer);
    });
  });

  // G. LOCATION & CONTAINER
  describe('G. Location and Container', () => {
    it('relocates object to new location reference', () => {
      const initial = ObjectSystem.createObject({
        objectId: 'OBJ_CRATE_01',
        category: 'CONTAINER',
        locationRef: 'LOC_WAREHOUSE'
      }).data!;

      const relocated = ObjectSystem.relocateObject(initial, {
        targetLocationRef: 'LOC_DOCKS',
        effectiveTime: '2024-01-03T09:00:00Z',
        trigger: 'Moved to docks',
        source: ObjectDataSource.USER_DEFINED
      }).data!;

      assert.equal(relocated.locationRef, 'LOC_DOCKS');
    });

    it('supports container hierarchy without inventing fake locations', () => {
      const bag = ObjectSystem.createObject({
        objectId: 'OBJ_BACKPACK_01',
        category: 'CONTAINER',
        locationRef: 'LOC_CAMP'
      }).data!;

      const gem = ObjectSystem.createObject({
        objectId: 'OBJ_GEM_01',
        category: 'TREASURE',
        locationRef: 'LOC_CAMP',
        containedWithinObjectRef: makeEntityID('OBJ_BACKPACK_01')
      }).data!;

      assert.equal(gem.containedWithinObjectRef, 'OBJ_BACKPACK_01');
    });

    it('rejects self-containment', () => {
      const bag = ObjectSystem.createObject({
        objectId: 'OBJ_BAG_01',
        category: 'CONTAINER'
      }).data!;

      const res = ObjectSystem.changeContainer(bag, {
        containedWithinObjectRef: makeEntityID('OBJ_BAG_01'),
        effectiveTime: '2024-01-03T10:00:00Z',
        trigger: 'Put bag in itself',
        source: ObjectDataSource.USER_DEFINED
      });

      assert.equal(res.success, false);
      assert.ok(res.message?.includes('cannot be contained within itself'));
    });
  });

  // H. CONDITION
  describe('H. Condition', () => {
    it('changes condition (damage / repair) while preserving the same Object ID', () => {
      const sword = ObjectSystem.createObject({
        objectId: 'OBJ_KATANA_01',
        category: 'WEAPON',
        condition: ObjectCondition.INTACT
      }).data!;

      const damaged = ObjectSystem.changeCondition(sword, {
        targetCondition: ObjectCondition.DAMAGED,
        effectiveTime: '2024-01-04T08:00:00Z',
        trigger: 'Blade chipped in duel',
        source: ObjectDataSource.USER_DEFINED
      }).data!;

      assert.equal(damaged.identity.id, 'OBJ_KATANA_01');
      assert.equal(damaged.condition, ObjectCondition.DAMAGED);

      const repaired = ObjectSystem.changeCondition(damaged, {
        targetCondition: ObjectCondition.INTACT,
        effectiveTime: '2024-01-04T16:00:00Z',
        trigger: 'Forged and sharpened by blacksmith',
        source: ObjectDataSource.USER_DEFINED
      }).data!;

      assert.equal(repaired.identity.id, 'OBJ_KATANA_01');
      assert.equal(repaired.condition, ObjectCondition.INTACT);
      assert.equal(repaired.history.revisions.length, 3);
    });
  });

  // I. STATUS & HISTORICAL PRESERVATION
  describe('I. Status', () => {
    it('marks object destroyed while preserving historic entity record and Object ID', () => {
      const idol = ObjectSystem.createObject({
        objectId: 'OBJ_CLAY_IDOL_01',
        category: 'SCULPTURE',
        status: ObjectStatus.ACTIVE,
        condition: ObjectCondition.INTACT
      }).data!;

      const destroyed = ObjectSystem.changeStatus(idol, {
        targetStatus: ObjectStatus.DESTROYED,
        effectiveTime: '2024-01-05T12:00:00Z',
        trigger: 'Smashed into dust',
        source: ObjectDataSource.USER_DEFINED
      }).data!;

      assert.equal(destroyed.identity.id, 'OBJ_CLAY_IDOL_01');
      assert.equal(destroyed.status, ObjectStatus.DESTROYED);
    });
  });

  // J. REFERENCE RESOLVER
  describe('J. Reference Resolver', () => {
    const sword = ObjectSystem.createObject({
      objectId: 'OBJ_EXCALIBUR_01',
      displayName: 'Excalibur',
      aliases: ['Sword of the King', 'Caliburn'],
      category: 'WEAPON',
      categoryPath: ['EQUIPMENT', 'WEAPON', 'SWORD'],
      locationRef: 'LOC_AVALON'
    }).data!;

    const dagger1 = ObjectSystem.createObject({
      objectId: 'OBJ_DAGGER_01',
      displayName: 'Iron Dagger',
      category: 'WEAPON'
    }).data!;

    const dagger2 = ObjectSystem.createObject({
      objectId: 'OBJ_DAGGER_02',
      displayName: 'Iron Dagger',
      category: 'WEAPON'
    }).data!;

    const knownObjects = {
      [sword.identity.id]: sword,
      [dagger1.identity.id]: dagger1,
      [dagger2.identity.id]: dagger2
    };

    it('resolves exact ID match', () => {
      const res = ObjectReferenceResolver.resolve({
        objectId: 'OBJ_EXCALIBUR_01',
        knownObjects
      });

      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.matchedObjectId, 'OBJ_EXCALIBUR_01');
    });

    it('resolves by name match', () => {
      const res = ObjectReferenceResolver.resolve({
        mentionOrName: 'Excalibur',
        knownObjects
      });

      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.matchedObjectId, 'OBJ_EXCALIBUR_01');
    });

    it('resolves by alias match', () => {
      const res = ObjectReferenceResolver.resolve({
        mentionOrName: 'Sword of the King',
        knownObjects
      });

      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.matchedObjectId, 'OBJ_EXCALIBUR_01');
    });

    it('returns AMBIGUOUS when two objects tie with identical matching strength', () => {
      const res = ObjectReferenceResolver.resolve({
        mentionOrName: 'Iron Dagger',
        knownObjects
      });

      assert.equal(res.status, 'AMBIGUOUS');
      assert.ok(res.candidates.length >= 2);
    });

    it('returns NOT_FOUND when no object matches query', () => {
      const res = ObjectReferenceResolver.resolve({
        mentionOrName: 'Nonexistent Plasma Rifle',
        knownObjects
      });

      assert.equal(res.status, 'NOT_FOUND');
    });
  });

  // K. DUPLICATE EMERGENCE PREVENTION
  describe('K. Duplicate Emergence Prevention', () => {
    it('detects existing object and blocks duplicate creation during story emergence', () => {
      const existingKey = ObjectSystem.createObject({
        objectId: 'OBJ_IRON_KEY_01',
        displayName: 'Old Iron Key',
        aliases: ['Cell Key'],
        category: 'KEY'
      }).data!;

      const evalRes = ObjectSystem.emergeFromStory({
        mention: 'Old Iron Key',
        isNarrativelySignificant: true,
        existingObjects: {
          [existingKey.identity.id]: existingKey
        }
      });

      assert.equal(evalRes.result, ObjectEmergenceResult.REQUIRES_RESOLUTION);
      assert.ok(evalRes.candidateObjectIds?.includes('OBJ_IRON_KEY_01'));
    });
  });

  // L. TRANSIENT OBJECT
  describe('L. Transient Object Filtering', () => {
    it('ignores transient everyday objects that lack narrative significance or ownership', () => {
      const evalRes = ObjectSystem.emergeFromStory({
        mention: 'sebuah gelas air',
        contextDescription: 'Karakter meminum seteguk air lalu meletakkannya',
        isNarrativelySignificant: false,
        isRecurring: false,
        isOwnedOrPossessed: false
      });

      assert.equal(evalRes.result, ObjectEmergenceResult.IGNORED_TRANSIENT);
      assert.ok(evalRes.reason.includes('lacks continuity relevance'));
    });

    it('allows persistent emergence for narratively significant objects', () => {
      const evalRes = ObjectSystem.emergeFromStory({
        mention: 'Peta Kuno Benua Hilang',
        contextDescription: 'Peta rahasia yang menjadi tujuan ekspedisi',
        isNarrativelySignificant: true,
        isOwnedOrPossessed: true,
        ownerCandidate: makeEntityID('CHAR_EXPLORER')
      });

      assert.equal(evalRes.result, ObjectEmergenceResult.CREATED);
      assert.ok(evalRes.object);
      assert.equal(evalRes.object.identity.displayName, 'Peta Kuno Benua Hilang');
      assert.equal(evalRes.object.ownershipRef, 'CHAR_EXPLORER');
    });
  });

  // M. SOURCE AUTHORITY
  describe('M. Source Authority', () => {
    it('rejects AI_PROPOSAL as canonical authoritative object creation', () => {
      const res = ObjectSystem.createObject({
        objectId: 'OBJ_AI_HALLUCINATED',
        category: 'ITEM',
        source: ObjectDataSource.AI_PROPOSAL
      });

      assert.equal(res.success, false);
      assert.ok(res.message?.includes('AI_PROPOSAL cannot create an authoritative Canon object'));
    });

    it('rejects UNKNOWN source as canonical authoritative object creation', () => {
      const res = ObjectSystem.createObject({
        objectId: 'OBJ_UNKNOWN_SRC',
        category: 'ITEM',
        source: ObjectDataSource.UNKNOWN
      });

      assert.equal(res.success, false);
    });
  });

  // N. OBJECT RELATIONS
  describe('N. Object Relations', () => {
    it('creates and attaches valid object-to-object relation', () => {
      const sword = ObjectSystem.createObject({
        objectId: 'OBJ_SWORD_BASE',
        category: 'WEAPON'
      }).data!;

      const gem = ObjectSystem.createObject({
        objectId: 'OBJ_GEM_SOCKET',
        category: 'GEM'
      }).data!;

      const relRes = ObjectSystem.createObjectRelation({
        relationId: 'REL_SWORD_GEM_01',
        subjectRef: makeEntityID('OBJ_SWORD_BASE'),
        targetRef: makeEntityID('OBJ_GEM_SOCKET'),
        relationType: ObjectRelationType.ATTACHED_TO
      });

      assert.equal(relRes.success, true);
      assert.ok(relRes.data);
      assert.equal(relRes.data.relationType, ObjectRelationType.ATTACHED_TO);

      const attached = ObjectSystem.attachRelation(sword, relRes.data);
      assert.equal(attached.relations?.length, 1);
    });

    it('rejects illegal self-relation', () => {
      const relRes = ObjectSystem.createObjectRelation({
        relationId: 'REL_SELF_01',
        subjectRef: makeEntityID('OBJ_SWORD_BASE'),
        targetRef: makeEntityID('OBJ_SWORD_BASE'),
        relationType: ObjectRelationType.CONTAINS
      });

      assert.equal(relRes.success, false);
      assert.ok(relRes.message?.includes('Illegal self-relation'));
    });

    it('validator rejects relation pointing to non-existent target object', () => {
      const sword = ObjectSystem.createObject({
        objectId: 'OBJ_SWORD_BASE',
        category: 'WEAPON'
      }).data!;

      const relRes = ObjectSystem.createObjectRelation({
        relationId: 'REL_DANGLING_01',
        subjectRef: makeEntityID('OBJ_SWORD_BASE'),
        targetRef: makeEntityID('OBJ_NONEXISTENT'),
        relationType: ObjectRelationType.PART_OF
      }).data!;

      const swordWithRel = ObjectSystem.attachRelation(sword, relRes);

      const universe = UniverseModelFactory.create({
        universeId: 'UNIV_TEST',
        universeDate: '2024-01-01',
        objects: {
          [swordWithRel.identity.id]: swordWithRel
        }
      });

      const report = UniverseModelValidator.validate(universe);
      assert.equal(report.isValid, false);
      assert.ok(report.issues.some(i => i.code === 'DANGLING_OBJECT_RELATION_TARGET'));
    });
  });

  // O. ACTOR BOUNDARY VALIDATION
  describe('O. Actor Boundary Validation', () => {
    it('detects dangling reference when object references a non-existent actor for owner, holder, user, or wearer', () => {
      const obj = ObjectSystem.createObject({
        objectId: 'OBJ_ORPHAN_01',
        category: 'WEAPON',
        ownershipRef: makeEntityID('CHAR_GHOST_OWNER'),
        possessionRef: makeEntityID('CHAR_GHOST_HOLDER'),
        currentUserRef: makeEntityID('CHAR_GHOST_USER'),
        currentWearerRef: makeEntityID('CHAR_GHOST_WEARER')
      }).data!;

      const universe = UniverseModelFactory.create({
        universeId: 'UNIV_TEST',
        universeDate: '2024-01-01',
        characters: {}, // No characters exist
        objects: {
          [obj.identity.id]: obj
        }
      });

      const report = UniverseModelValidator.validate(universe);
      assert.equal(report.isValid, false);
      const danglingErrors = report.issues.filter(i => i.code === 'DANGLING_ACTOR_REFERENCE');
      assert.equal(danglingErrors.length, 4);
    });
  });

  // P. TIMELINE & REVISION MONOTONICITY
  describe('P. Timeline Validation', () => {
    it('detects backwards non-chronological revisions in object history', () => {
      const obj = ObjectSystem.createObject({
        objectId: 'OBJ_CLOCK_01',
        category: 'DEVICE',
        effectiveTime: '2024-01-02T10:00:00Z'
      }).data!;

      // Manually corrupt history with an earlier timestamp
      const corruptedHistory = {
        ...obj.history,
        revisions: [
          obj.history.revisions[0],
          {
            revisionId: 'REV_2',
            actorId: makeSystemID('OBJECT_SYSTEM'),
            effectiveTime: '2024-01-01T00:00:00Z', // Inverted earlier date!
            changeSummary: 'Corrupt backward change',
            predecessorRevisionId: obj.history.revisions[0].revisionId
          }
        ]
      };

      const corruptedObj: ObjectEntity = {
        ...obj,
        history: corruptedHistory
      };

      const universe = UniverseModelFactory.create({
        universeId: 'UNIV_TEST',
        universeDate: '2024-01-02',
        objects: {
          [corruptedObj.identity.id]: corruptedObj
        }
      });

      const report = UniverseModelValidator.validate(universe);
      assert.equal(report.isValid, false);
      assert.ok(report.issues.some(i => i.code === 'CORRUPT_REVISION_HISTORY'));
    });
  });

  // Q. CONFLICT DETECTION
  describe('Q. Conflict Detection', () => {
    it('marks contradictory object state (e.g. destroyed but intact/accessible) as CONFLICT without auto-repair', () => {
      const obj = ObjectSystem.createObject({
        objectId: 'OBJ_CONTRADICTORY_01',
        category: 'ARTIFACT',
        status: ObjectStatus.DESTROYED,
        condition: ObjectCondition.INTACT,
        accessStatus: 'ACCESSIBLE'
      }).data!;

      const universe = UniverseModelFactory.create({
        universeId: 'UNIV_TEST',
        universeDate: '2024-01-02',
        objects: {
          [obj.identity.id]: obj
        }
      });

      const report = UniverseModelValidator.validate(universe);
      assert.equal(report.isValid, false);
      const conflictIssue = report.issues.find(i => i.code === 'CONTRADICTORY_OBJECT_STATE');
      assert.ok(conflictIssue);
      assert.equal(conflictIssue.severity, 'CONFLICT');
    });
  });

  // R. TRANSACTION BOUNDARY & ROLLBACK
  describe('R. Transaction Boundary & Rollback', () => {
    it('rolls back transaction when object mutation introduces invalid invariants', () => {
      const char = createMockCharacter('CHAR_VALID', 'Valid Character');
      const baseObj = ObjectSystem.createObject({
        objectId: 'OBJ_SAFE_01',
        category: 'ITEM',
        ownershipRef: makeEntityID('CHAR_VALID')
      }).data!;

      const repo = new InMemoryUniverseRepository();
      const baseUniverse = UniverseModelFactory.create({
        universeId: 'UNIV_TRANSACTION',
        universeDate: '2024-01-01',
        characters: { [char.identity.id]: char },
        objects: { [baseObj.identity.id]: baseObj }
      });
      repo.saveUniverse(baseUniverse);

      const cmd = CommandValidator.validate({
        commandId: 'CMD_TX_OBJ_01',
        commandType: 'UPDATE_ENTITY',
        requestedBy: makeSystemID('OBJECT_SYSTEM'),
        universeContext: { universeId: baseUniverse.universeId, universeTime: '2024-01-02T10:00:00Z' }
      }).data!;

      const ctx = new ExecutionContext({
        executionId: 'EXEC_TX_OBJ_01',
        command: cmd,
        universe: baseUniverse,
        actor: makeSystemID('OBJECT_SYSTEM'),
        temporalContext: { universeTime: '2024-01-02T10:00:00Z', engineTime: Date.now(), periodRef: 'P1' }
      });

      const tx = new TransactionBoundary(repo, 'EXEC_TX_OBJ_01');
      tx.stageMutation({
        mutationId: 'MUT_INVALID_OBJECT',
        domain: makeDomainID('OBJECT'),
        entityId: 'OBJ_SAFE_01',
        entityData: {
          ...baseObj,
          // Corrupt with dangling actor reference
          ownershipRef: makeEntityID('CHAR_NONEXISTENT_GHOST')
        },
        effectiveTime: '2024-01-02T10:00:00Z',
        authoritativeOwner: makeSystemID('OBJECT_SYSTEM')
      });

      tx.prepare(ctx);
      const commitRes = tx.postValidateAndCommit(ctx);

      // Commit must fail and transaction must abort
      assert.equal(commitRes.success, false);
      assert.equal(tx.getStatus(), 'ABORTED');

      // Repository must remain intact with original valid state
      const freshSnap = repo.getUniverse('UNIV_TRANSACTION').data!;
      assert.equal(freshSnap.objects['OBJ_SAFE_01'].ownershipRef, 'CHAR_VALID');
    });
  });

  // S. QUERY IMMUTABILITY
  describe('S. Query Immutability', () => {
    it('executes Object queries deterministically with zero mutations to Universe snapshot', () => {
      const char = createMockCharacter('CHAR_ALICE', 'Alice');
      const obj = ObjectSystem.createObject({
        objectId: 'OBJ_STAFF_01',
        displayName: 'Mage Staff',
        category: 'WEAPON',
        ownershipRef: makeEntityID('CHAR_ALICE'),
        possessionRef: makeEntityID('CHAR_ALICE'),
        locationRef: 'LOC_TOWER'
      }).data!;

      const repo = new InMemoryUniverseRepository();
      const universe = UniverseModelFactory.create({
        universeId: 'UNIV_QUERY_TEST',
        universeDate: '2024-01-01',
        characters: { [char.identity.id]: char },
        locations: {
          LOC_TOWER: {
            identity: EntityIdentityFactory.create({
              id: 'LOC_TOWER',
              entityType: EntityType.LOCATION,
              displayName: 'Mage Tower',
              status: EntityLifecycleStatus.ACTIVE
            }),
            category: 'BUILDING',
            temporalValidity: { effectiveFrom: '2024-01-01T00:00:00Z', temporalCategory: TemporalStatus.ACTUAL },
            history: RevisionHistoryManager.createInitial(makeSystemID('LOCATION_SYSTEM'), '2024-01-01T00:00:00Z'),
            provenance: createProvenanceMetadata(makeSystemID('LOCATION_SYSTEM'), makeDomainID('LOCATION'))
          }
        },
        objects: { [obj.identity.id]: obj }
      });
      repo.saveUniverse(universe);

      const processor = new QueryProcessor(repo);

      // 1. GET_OBJECT query
      const qObj: UniverseQuery = {
        queryId: 'Q_1',
        queryType: 'OBJECT',
        universeId: 'UNIV_QUERY_TEST',
        targetEntityId: 'OBJ_STAFF_01',
        requestedBy: makeSystemID('OBSERVER'),
        requestedAt: 1000
      };
      const resObj = processor.execute<ObjectEntity>(qObj);
      assert.equal(resObj.success, true);
      assert.equal(resObj.data?.data?.identity.id, 'OBJ_STAFF_01');
      assert.equal(resObj.data?.readOnly, true);

      // 2. GET_OWNER query
      const qOwner: UniverseQuery = {
        queryId: 'Q_2',
        queryType: 'OBJECT_OWNER',
        universeId: 'UNIV_QUERY_TEST',
        targetEntityId: 'OBJ_STAFF_01',
        requestedBy: makeSystemID('OBSERVER'),
        requestedAt: 1001
      };
      const resOwner = processor.execute(qOwner);
      assert.equal(resOwner.success, true);
      assert.equal(resOwner.data?.data, 'CHAR_ALICE');

      // 3. GET_POSSESSION_REF query
      const qPoss: UniverseQuery = {
        queryId: 'Q_3',
        queryType: 'OBJECT_POSSESSION',
        universeId: 'UNIV_QUERY_TEST',
        targetEntityId: 'OBJ_STAFF_01',
        requestedBy: makeSystemID('OBSERVER'),
        requestedAt: 1002
      };
      const resPoss = processor.execute(qPoss);
      assert.equal(resPoss.success, true);
      assert.equal(resPoss.data?.data, 'CHAR_ALICE');

      // 4. GET_LOCATION_REF query
      const qLoc: UniverseQuery = {
        queryId: 'Q_4',
        queryType: 'OBJECT_LOCATION',
        universeId: 'UNIV_QUERY_TEST',
        targetEntityId: 'OBJ_STAFF_01',
        requestedBy: makeSystemID('OBSERVER'),
        requestedAt: 1003
      };
      const resLoc = processor.execute(qLoc);
      assert.equal(resLoc.success, true);
      assert.equal(resLoc.data?.data, 'LOC_TOWER');

      // 5. RESOLVE_OBJECT_REFERENCE query
      const qResolve: UniverseQuery = {
        queryId: 'Q_5',
        queryType: 'OBJECT_REFERENCE_RESOLUTION',
        universeId: 'UNIV_QUERY_TEST',
        parameters: {
          mentionOrName: 'Mage Staff'
        },
        requestedBy: makeSystemID('OBSERVER'),
        requestedAt: 1004
      };
      const resResolve = processor.execute<any>(qResolve);
      assert.equal(resResolve.success, true);
      assert.equal(resResolve.data?.data?.status, 'RESOLVED');
      assert.equal(resResolve.data?.data?.matchedObjectId, 'OBJ_STAFF_01');

      // Verify universe remains strictly unmodified
      const freshSnap = repo.getUniverse('UNIV_QUERY_TEST').data!;
      assert.equal(freshSnap.objects['OBJ_STAFF_01'].identity.id, obj.identity.id);
      assert.equal(freshSnap.objects['OBJ_STAFF_01'].ownershipRef, 'CHAR_ALICE');
      assert.equal(freshSnap.objects['OBJ_STAFF_01'].possessionRef, 'CHAR_ALICE');
      assert.equal(freshSnap.objects['OBJ_STAFF_01'].locationRef, 'LOC_TOWER');
    });
  });
});
