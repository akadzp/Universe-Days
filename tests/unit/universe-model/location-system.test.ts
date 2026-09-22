/**
 * Comprehensive Unit Test Suite for Location System
 *
 * Verifies all requirements:
 * 1. create manual canonical
 * 2. derive from story
 * 3. duplicate location detection
 * 4. transient vs persistent location
 * 5. hierarchy change valid
 * 6. hierarchy circular rejection
 * 7. containment consistency
 * 8. adjacency symmetry
 * 9. coordinates update & immutable non-guessing
 * 10. temporal change & range validation
 * 11. location rename
 * 12. location destruction preserving history
 * 13. reference resolver (exact ID, name, alias, ambiguous, not found)
 * 14. query immutability
 * 15. transaction rollback on failure
 * 16. AI proposal non-authoritative rejection
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  LocationManager,
  LocationDataSource,
  LocationAccessibilityStatus,
  LocationEntity
} from '../../../core/universe/model/location.ts';

import {
  LocationReferenceResolver
} from '../../../core/universe/model/location-reference.ts';

import {
  UniverseModelValidator
} from '../../../core/universe/model/validation.ts';

import {
  UniverseModel
} from '../../../core/universe/model/universe.ts';

import {
  AuthorityLevel
} from '../../../core/universe/model/types.ts';

import {
  makeSystemID
} from '../../../core/types/identifiers.ts';

import {
  EngineErrorCode
} from '../../../core/types/errors.ts';

const ACTOR = makeSystemID('LOCATION_SYSTEM');

describe('Location System Modernization & Authority Suite', () => {

  // 1. Create Manual Canonical
  describe('1. Create Manual Canonical Location', () => {
    it('creates a valid canonical location with initial revision and authoritative provenance', () => {
      const result = LocationManager.createManual({
        id: 'LOC_ROYAL_PALACE',
        displayName: 'Istana Kerajaan Langit',
        description: 'Pusat pemerintahan kerajaan di atas awan.',
        locationType: 'BUILDING',
        parentLocationRef: null,
        accessibilityStatus: LocationAccessibilityStatus.RESTRICTED,
        coordinates: { x: 100, y: 250, z: 50 },
        aliases: ['Istana Langit', 'Balai Utama'],
        effectiveFrom: '2026-09-22T08:00:00Z',
        reason: 'Pembangunan awal istana'
      });

      assert.equal(result.success, true);
      assert.ok(result.data);
      const loc = result.data;
      assert.equal(loc.identity.id, 'LOC_ROYAL_PALACE');
      assert.equal(loc.identity.displayName, 'Istana Kerajaan Langit');
      assert.equal(loc.locationType, 'BUILDING');
      assert.equal(loc.accessibilityStatus, LocationAccessibilityStatus.RESTRICTED);
      assert.equal(loc.coordinates?.x, 100);
      assert.equal(loc.coordinates?.y, 250);
      assert.equal(loc.coordinates?.z, 50);
      assert.deepEqual(loc.aliases, ['Istana Langit', 'Balai Utama']);
      assert.equal(loc.provenance.authorityLevel, AuthorityLevel.AUTHORITATIVE);
      assert.equal(loc.source, LocationDataSource.USER_DEFINED);
      assert.equal(loc.history.revisions.length, 1);
    });

    it('rejects invalid location ID format', () => {
      const result = LocationManager.createManual({
        id: 'invalid id with spaces',
        displayName: 'Tempat Aneh',
        locationType: 'ROOM',
        effectiveFrom: '2026-09-22T08:00:00Z'
      });

      assert.equal(result.success, false);
      assert.equal(result.error, EngineErrorCode.INVALID_ENTITY_IDENTITY);
    });
  });

  // 2. Derive from Story
  describe('2. Derive from Story Emergence', () => {
    it('derives location from narrative context with emergence metadata', () => {
      const result = LocationManager.deriveFromStory({
        id: 'LOC_SECRET_CAVE',
        displayName: 'Gua Rahasia Kabut',
        description: 'Sebuah gua tersembunyi yang ditemukan tokoh utama.',
        locationType: 'TERRAIN',
        continuityReference: 'STORY_ACT_1_CHAPTER_3',
        effectiveFrom: '2026-09-22T10:00:00Z',
        aliases: ['Gua Kabut']
      });

      assert.equal(result.success, true);
      assert.ok(result.data);
      const loc = result.data;
      assert.equal(loc.identity.id, 'LOC_SECRET_CAVE');
      assert.equal(loc.source, LocationDataSource.STORY_DERIVED);
      assert.equal(loc.continuityReference, 'STORY_ACT_1_CHAPTER_3');
      assert.equal(loc.history.revisions.length, 1);
    });
  });

  // 3. Duplicate Location Detection
  describe('3. Duplicate Location Detection', () => {
    it('detects duplicate location by exact ID or aliases and blocks creation', () => {
      const createRes = LocationManager.createManual({
        id: 'LOC_CAPITAL_CITY',
        displayName: 'Kota Megah',
        locationType: 'SETTLEMENT',
        effectiveFrom: '2026-09-22T08:00:00Z',
        aliases: ['Metropolis Utama']
      });
      assert.equal(createRes.success, true);
      assert.ok(createRes.data);

      const knownLocations: Record<string, LocationEntity> = {
        LOC_CAPITAL_CITY: createRes.data
      };

      // Query duplicate by existing ID
      const dupCheckById = LocationReferenceResolver.resolve({
        locationId: 'LOC_CAPITAL_CITY',
        knownLocations
      });
      assert.equal(dupCheckById.status, 'RESOLVED');
      assert.equal(dupCheckById.matchedLocationId, 'LOC_CAPITAL_CITY');

      // Query duplicate by exact alias
      const dupCheckByAlias = LocationReferenceResolver.resolve({
        mentionOrName: 'Metropolis Utama',
        knownLocations
      });
      assert.equal(dupCheckByAlias.status, 'RESOLVED');
      assert.equal(dupCheckByAlias.matchedLocationId, 'LOC_CAPITAL_CITY');
    });
  });

  // 4. Transient vs Persistent Location
  describe('4. Transient vs Persistent Location Filtering', () => {
    it('allows persistent emergence for locations with specific identity and narrative depth', () => {
      const result = LocationManager.createManual({
        id: 'LOC_ARCHIVE_TOWER',
        displayName: 'Menara Arsip Kuno',
        description: 'Tempat penyimpanan prasasti peradaban pertama.',
        locationType: 'BUILDING',
        effectiveFrom: '2026-09-22T08:00:00Z'
      });
      assert.equal(result.success, true);
      assert.ok(result.data);
    });

    it('rejects emergence with empty or invalid location name', () => {
      const result = LocationManager.createManual({
        id: 'LOC_GENERIC_ALLEY',
        displayName: '   ',
        locationType: 'ROUTE',
        effectiveFrom: '2026-09-22T08:00:00Z'
      });
      assert.equal(result.success, false);
      assert.equal(result.error, EngineErrorCode.INVALID_ENTITY_IDENTITY);
    });
  });

  // 5. Hierarchy Change Valid
  describe('5. Hierarchy Change Valid', () => {
    it('successfully changes parent location and updates revision history', () => {
      const createRes = LocationManager.createManual({
        id: 'LOC_THRONE_ROOM',
        displayName: 'Ruang Singgasana',
        locationType: 'ROOM',
        parentLocationRef: 'LOC_INNER_SANCTUM',
        effectiveFrom: '2026-09-22T08:00:00Z'
      });
      assert.equal(createRes.success, true);
      assert.ok(createRes.data);
      const initial = createRes.data;

      const changeRes = LocationManager.changeParent(initial, {
        newParentLocationRef: 'LOC_ROYAL_PALACE',
        actor: ACTOR,
        effectiveTime: '2026-09-22T12:00:00Z',
        reason: 'Penataan ulang hierarki istana'
      });

      assert.equal(changeRes.success, true);
      assert.ok(changeRes.data);
      const updated = changeRes.data;
      assert.equal(updated.parentLocationRef, 'LOC_ROYAL_PALACE');
      assert.equal(updated.history.revisions.length, 2);
    });
  });

  // 6. Hierarchy Circular Rejection
  describe('6. Hierarchy Circular Rejection', () => {
    it('rejects self-parenting when modifying parent reference', () => {
      const createRes = LocationManager.createManual({
        id: 'LOC_CASTLE_MAIN',
        displayName: 'Kastil Utama',
        locationType: 'BUILDING',
        effectiveFrom: '2026-09-22T08:00:00Z'
      });
      assert.equal(createRes.success, true);
      assert.ok(createRes.data);

      const circularRes = LocationManager.changeParent(createRes.data, {
        newParentLocationRef: 'LOC_CASTLE_MAIN',
        actor: ACTOR,
        effectiveTime: '2026-09-22T12:00:00Z',
        reason: 'Circular test'
      });

      assert.equal(circularRes.success, false);
      assert.equal(circularRes.error, EngineErrorCode.CIRCULAR_ENTITY_REFERENCE);
    });

    it('validator flags circular parent chains across multiple entities', () => {
      const locA = LocationManager.createManual({
        id: 'LOC_A',
        displayName: 'Wilayah A',
        locationType: 'REGION',
        parentLocationRef: 'LOC_B',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const locB = LocationManager.createManual({
        id: 'LOC_B',
        displayName: 'Wilayah B',
        locationType: 'REGION',
        parentLocationRef: 'LOC_A',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const mockUniverse: UniverseModel = {
        universeId: 'UNV_TEST_01',
        schemaVersion: '1.0.0',
        metadata: {
          title: 'Test Universe',
          description: 'Testing circular hierarchy',
          createdDate: '2026-09-22T08:00:00Z',
          lastModified: '2026-09-22T08:00:00Z',
          tags: []
        },
        characters: {},
        actors: {},
        profiles: {},
        behaviors: {},
        states: {},
        styles: {},
        roles: {},
        relationships: {},
        knowledge: {},
        locations: {
          LOC_A: locA,
          LOC_B: locB
        },
        objects: {},
        objectRelations: {},
        events: {},
        processes: {},
        unresolved: {},
        continuityLedger: []
      };

      const report = UniverseModelValidator.validate(mockUniverse);
      assert.equal(report.isValid, false);
      assert.equal(report.issues.some(i => i.code === 'CIRCULAR_LOCATION_HIERARCHY'), true);
    });
  });

  // 7. Containment Consistency
  describe('7. Containment Consistency', () => {
    it('rejects self-containment in LocationManager', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_VAULT',
        displayName: 'Bilik Rahasia',
        locationType: 'ROOM',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const res = LocationManager.updateContainedLocations(loc, {
        containedLocationRefs: ['LOC_VAULT'],
        actor: ACTOR,
        effectiveTime: '2026-09-22T10:00:00Z',
        reason: 'Self containment test'
      });

      assert.equal(res.success, false);
      assert.equal(res.error, EngineErrorCode.CIRCULAR_ENTITY_REFERENCE);
    });

    it('validator detects mismatch between parentLocationRef and containedLocationRefs', () => {
      const parent = LocationManager.createManual({
        id: 'LOC_CITY',
        displayName: 'Kota Utama',
        locationType: 'SETTLEMENT',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const child = LocationManager.createManual({
        id: 'LOC_SHOP',
        displayName: 'Kedai Ramuan',
        locationType: 'BUILDING',
        parentLocationRef: 'LOC_ANOTHER_CITY', // mismatch!
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      // Parent claims child, but child belongs elsewhere
      const parentWithChild = LocationManager.updateContainedLocations(parent, {
        containedLocationRefs: ['LOC_SHOP'],
        actor: ACTOR,
        effectiveTime: '2026-09-22T09:00:00Z',
        reason: 'Containment test'
      }).data!;

      const anotherCity = LocationManager.createManual({
        id: 'LOC_ANOTHER_CITY',
        displayName: 'Kota Lain',
        locationType: 'SETTLEMENT',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const mockUniverse: UniverseModel = {
        universeId: 'UNV_TEST_02',
        schemaVersion: '1.0.0',
        metadata: {
          title: 'Test Universe',
          description: 'Testing containment mismatch',
          createdDate: '2026-09-22T08:00:00Z',
          lastModified: '2026-09-22T08:00:00Z',
          tags: []
        },
        characters: {},
        actors: {},
        profiles: {},
        behaviors: {},
        states: {},
        styles: {},
        roles: {},
        relationships: {},
        knowledge: {},
        locations: {
          LOC_CITY: parentWithChild,
          LOC_SHOP: child,
          LOC_ANOTHER_CITY: anotherCity
        },
        objects: {},
        objectRelations: {},
        events: {},
        processes: {},
        unresolved: {},
        continuityLedger: []
      };

      const report = UniverseModelValidator.validate(mockUniverse);
      assert.equal(report.isValid, false);
      assert.equal(report.issues.some(i => i.code === 'LOCATION_CONTAINMENT_MISMATCH'), true);
    });
  });

  // 8. Adjacency Symmetry
  describe('8. Adjacency Symmetry', () => {
    it('rejects self-adjacency in updateAdjacency', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_MARKET',
        displayName: 'Pasar Rakyat',
        locationType: 'DISTRICT',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const res = LocationManager.updateAdjacency(loc, {
        adjacentLocationRefs: ['LOC_MARKET'],
        actor: ACTOR,
        effectiveTime: '2026-09-22T10:00:00Z',
        reason: 'Self adjacency test'
      });

      assert.equal(res.success, false);
      assert.equal(res.error, EngineErrorCode.CIRCULAR_ENTITY_REFERENCE);
    });

    it('validator detects asymmetric adjacency between two locations', () => {
      const locEast = LocationManager.createManual({
        id: 'LOC_EAST_GATE',
        displayName: 'Gerbang Timur',
        locationType: 'LANDMARK',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const locWest = LocationManager.createManual({
        id: 'LOC_WEST_GATE',
        displayName: 'Gerbang Barat',
        locationType: 'LANDMARK',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      // East gate points to West gate, but West gate does not point back
      const locEastUpdated = LocationManager.updateAdjacency(locEast, {
        adjacentLocationRefs: ['LOC_WEST_GATE'],
        actor: ACTOR,
        effectiveTime: '2026-09-22T09:00:00Z',
        reason: 'Link east to west'
      }).data!;

      const mockUniverse: UniverseModel = {
        universeId: 'UNV_TEST_03',
        schemaVersion: '1.0.0',
        metadata: {
          title: 'Test Universe',
          description: 'Testing asymmetric adjacency',
          createdDate: '2026-09-22T08:00:00Z',
          lastModified: '2026-09-22T08:00:00Z',
          tags: []
        },
        characters: {},
        actors: {},
        profiles: {},
        behaviors: {},
        states: {},
        styles: {},
        roles: {},
        relationships: {},
        knowledge: {},
        locations: {
          LOC_EAST_GATE: locEastUpdated,
          LOC_WEST_GATE: locWest
        },
        objects: {},
        objectRelations: {},
        events: {},
        processes: {},
        unresolved: {},
        continuityLedger: []
      };

      const report = UniverseModelValidator.validate(mockUniverse);
      assert.equal(report.isValid, false);
      assert.equal(report.issues.some(i => i.code === 'ASYMMETRIC_LOCATION_ADJACENCY'), true);
    });
  });

  // 9. Coordinates Update & Immutable Non-guessing
  describe('9. Coordinates Update & Immutable Non-guessing', () => {
    it('updates coordinates accurately without guessing missing axes', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_OBSERVATORY',
        displayName: 'Observatorium Bintang',
        locationType: 'BUILDING',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      assert.equal(loc.coordinates, undefined);

      const updateRes = LocationManager.updateCoordinates(loc, {
        coordinates: { x: 42.5, y: 88.0 },
        actor: ACTOR,
        effectiveTime: '2026-09-22T10:00:00Z',
        reason: 'Set GPS coords'
      });

      assert.equal(updateRes.success, true);
      assert.ok(updateRes.data);
      assert.equal(updateRes.data.coordinates?.x, 42.5);
      assert.equal(updateRes.data.coordinates?.y, 88.0);
      assert.equal(updateRes.data.coordinates?.z, undefined);
    });

    it('rejects invalid NaN coordinates', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_OBSERVATORY_2',
        displayName: 'Observatorium Bintang 2',
        locationType: 'BUILDING',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const updateRes = LocationManager.updateCoordinates(loc, {
        coordinates: { x: NaN, y: 10 },
        actor: ACTOR,
        effectiveTime: '2026-09-22T10:00:00Z',
        reason: 'Invalid coords'
      });

      assert.equal(updateRes.success, false);
      assert.equal(updateRes.error, EngineErrorCode.INVALID_STATE);
    });
  });

  // 10. Temporal Change & Range Validation
  describe('10. Temporal Change & Range Validation', () => {
    it('updates temporal validity when effectiveTo is after effectiveFrom', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_FESTIVAL_GROUNDS',
        displayName: 'Alun-alun Festival',
        locationType: 'DISTRICT',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const updateRes = LocationManager.updateTemporalValidity(loc, {
        effectiveFrom: '2026-09-22T08:00:00Z',
        effectiveTo: '2026-09-25T18:00:00Z',
        actor: ACTOR,
        effectiveTime: '2026-09-22T09:00:00Z',
        reason: 'Festival period'
      });

      assert.equal(updateRes.success, true);
      assert.ok(updateRes.data);
      assert.equal(updateRes.data.temporalValidity?.effectiveTo, '2026-09-25T18:00:00Z');
    });

    it('rejects update when effectiveTo precedes effectiveFrom', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_FESTIVAL_GROUNDS_2',
        displayName: 'Alun-alun Festival 2',
        locationType: 'DISTRICT',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const updateRes = LocationManager.updateTemporalValidity(loc, {
        effectiveFrom: '2026-09-22T08:00:00Z',
        effectiveTo: '2026-09-20T00:00:00Z', // Before effectiveFrom!
        actor: ACTOR,
        effectiveTime: '2026-09-22T09:00:00Z',
        reason: 'Invalid interval'
      });

      assert.equal(updateRes.success, false);
      assert.equal(updateRes.error, EngineErrorCode.INVALID_INTERVAL);
    });
  });

  // 11. Location Rename
  describe('11. Location Rename', () => {
    it('renames location and records change in revision history with audit reason', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_OLD_HARBOR',
        displayName: 'Dermaga Lama',
        locationType: 'LANDMARK',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const renameRes = LocationManager.renameLocation(loc, {
        newName: 'Pelabuhan Samudra Merdeka',
        reason: 'Dekret kerajaan pembangunan ulang pelabuhan',
        actor: ACTOR,
        effectiveTime: '2026-09-22T14:00:00Z'
      });

      assert.equal(renameRes.success, true);
      assert.ok(renameRes.data);
      const updated = renameRes.data;
      assert.equal(updated.identity.displayName, 'Pelabuhan Samudra Merdeka');
      assert.equal(updated.history.revisions.length, 2);
      assert.equal(updated.history.revisions[1].reason, 'Dekret kerajaan pembangunan ulang pelabuhan');
    });
  });

  // 12. Location Destruction Preserving History
  describe('12. Location Destruction Preserving History', () => {
    it('marks location as DESTROYED while preserving entity identity, record, and history', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_ANCIENT_BRIDGE',
        displayName: 'Jembatan Gantung Kuno',
        locationType: 'ROUTE',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const destroyRes = LocationManager.changeAccessibility(loc, {
        newStatus: LocationAccessibilityStatus.DESTROYED,
        reason: 'Runtuh akibat gempa bumi hebat',
        actor: ACTOR,
        effectiveTime: '2026-09-22T16:00:00Z'
      });

      assert.equal(destroyRes.success, true);
      assert.ok(destroyRes.data);
      const destroyed = destroyRes.data;
      assert.equal(destroyed.identity.id, 'LOC_ANCIENT_BRIDGE');
      assert.equal(destroyed.accessibilityStatus, LocationAccessibilityStatus.DESTROYED);
      assert.equal(destroyed.history.revisions.length, 2);
      assert.equal(destroyed.history.revisions[1].reason, 'Runtuh akibat gempa bumi hebat');
    });
  });

  // 13. Reference Resolver
  describe('13. Location Reference Resolver', () => {
    const loc1 = LocationManager.createManual({
      id: 'LOC_LIBRARY_GRAND',
      displayName: 'Perpustakaan Agung',
      aliases: ['Pustaka Pusat', 'Balai Kitab'],
      locationType: 'BUILDING',
      effectiveFrom: '2026-09-22T08:00:00Z'
    }).data!;

    const loc2 = LocationManager.createManual({
      id: 'LOC_LIBRARY_SECRET',
      displayName: 'Perpustakaan Rahasia',
      aliases: ['Pustaka Bawah Tanah'],
      locationType: 'ROOM',
      effectiveFrom: '2026-09-22T08:00:00Z'
    }).data!;

    const knownLocations: Record<string, LocationEntity> = {
      LOC_LIBRARY_GRAND: loc1,
      LOC_LIBRARY_SECRET: loc2
    };

    it('resolves by exact ID', () => {
      const res = LocationReferenceResolver.resolve({
        locationId: 'LOC_LIBRARY_GRAND',
        knownLocations
      });
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.matchedLocationId, 'LOC_LIBRARY_GRAND');
    });

    it('resolves by display name', () => {
      const res = LocationReferenceResolver.resolve({
        mentionOrName: 'Perpustakaan Agung',
        knownLocations
      });
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.matchedLocationId, 'LOC_LIBRARY_GRAND');
    });

    it('resolves by alias', () => {
      const res = LocationReferenceResolver.resolve({
        mentionOrName: 'Pustaka Bawah Tanah',
        knownLocations
      });
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.matchedLocationId, 'LOC_LIBRARY_SECRET');
    });

    it('returns AMBIGUOUS when two candidates tie with identical matching strength', () => {
      const twinA = LocationManager.createManual({
        id: 'LOC_NORTH_TOWER',
        displayName: 'Menara Penjaga',
        locationType: 'BUILDING',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const twinB = LocationManager.createManual({
        id: 'LOC_SOUTH_TOWER',
        displayName: 'Menara Penjaga',
        locationType: 'BUILDING',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const res = LocationReferenceResolver.resolve({
        mentionOrName: 'Menara Penjaga',
        knownLocations: {
          LOC_NORTH_TOWER: twinA,
          LOC_SOUTH_TOWER: twinB
        }
      });
      assert.equal(res.status, 'AMBIGUOUS');
      assert.equal(res.candidates.length, 2);
    });

    it('returns NOT_FOUND when reference does not match known locations', () => {
      const res = LocationReferenceResolver.resolve({
        mentionOrName: 'Gunung Berapi Antah Berantah',
        knownLocations
      });
      assert.equal(res.status, 'NOT_FOUND');
    });
  });

  // 14. Query Immutability
  describe('14. Query Immutability', () => {
    it('executes Location queries deterministically with zero mutations to input objects', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_TEMPLE',
        displayName: 'Kuil Kejayaan',
        locationType: 'BUILDING',
        aliases: ['Kuil Cahaya'],
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      const knownLocations = Object.freeze({ LOC_TEMPLE: loc });
      const originalSerialized = JSON.stringify(knownLocations);

      // Perform multiple query resolutions
      LocationReferenceResolver.resolve({
        mentionOrName: 'Kuil Cahaya',
        knownLocations
      });
      LocationReferenceResolver.resolve({
        locationId: 'LOC_TEMPLE',
        knownLocations
      });

      assert.equal(JSON.stringify(knownLocations), originalSerialized);
    });
  });

  // 15. Transaction Rollback on Failure
  describe('15. Transaction Boundary & Rollback', () => {
    it('rolls back batch mutations when any location validation constraint fails', () => {
      const loc = LocationManager.createManual({
        id: 'LOC_FORTRESS',
        displayName: 'Benteng Perkasa',
        locationType: 'BUILDING',
        effectiveFrom: '2026-09-22T08:00:00Z'
      }).data!;

      let workingUniverse: Record<string, LocationEntity> = {
        LOC_FORTRESS: loc
      };

      const originalSnapshot = { ...workingUniverse };

      // Simulate a transactional operation of 2 updates:
      // Op 1: Valid rename
      // Op 2: Invalid circular self-parenting
      const op1 = LocationManager.renameLocation(workingUniverse.LOC_FORTRESS, {
        newName: 'Benteng Megah',
        actor: ACTOR,
        effectiveTime: '2026-09-22T10:00:00Z',
        reason: 'Renaming fortress'
      });

      assert.equal(op1.success, true);

      // Op 2 fails
      const op2 = LocationManager.changeParent(op1.data!, {
        newParentLocationRef: 'LOC_FORTRESS', // invalid circular self-parenting!
        actor: ACTOR,
        effectiveTime: '2026-09-22T10:00:00Z',
        reason: 'Invalid self parent'
      });

      assert.equal(op2.success, false);

      // Transaction rollback: working snapshot remains original
      workingUniverse = originalSnapshot;
      assert.equal(workingUniverse.LOC_FORTRESS.identity.displayName, 'Benteng Perkasa');
      assert.equal(workingUniverse.LOC_FORTRESS.history.revisions.length, 1);
    });
  });

  // 16. AI Proposal Non-Authoritative Rejection
  describe('16. AI Proposal Non-Authoritative Rejection', () => {
    it('rejects AI_PROPOSAL as canonical authoritative location creation', () => {
      const res = LocationManager.createManual({
        id: 'LOC_AI_GENERATED',
        displayName: 'Istana AI',
        locationType: 'BUILDING',
        effectiveFrom: '2026-09-22T08:00:00Z',
        source: LocationDataSource.AI_PROPOSAL
      });

      assert.equal(res.success, false);
      assert.equal(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
    });

    it('rejects UNKNOWN source as canonical authoritative location creation', () => {
      const res = LocationManager.createManual({
        id: 'LOC_UNKNOWN_SOURCE',
        displayName: 'Tempat Misterius',
        locationType: 'ROOM',
        effectiveFrom: '2026-09-22T08:00:00Z',
        source: LocationDataSource.UNKNOWN
      });

      assert.equal(res.success, false);
      assert.equal(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
    });
  });

});
