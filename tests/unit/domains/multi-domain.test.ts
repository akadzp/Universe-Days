/**
 * Phase 7: Multi-Domain / Cross-Domain Unit Tests
 *
 * Verifies that multi-domain operations (e.g., Character acquiring an Object,
 * or Character entering a Location):
 * 1. Identifies all target domains.
 * 2. Identifies all authoritative owners.
 * 3. Preserves separate domain authority without ownership bleed.
 * 4. Routes mutations strictly to respective domain owners.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  DomainGateway,
  CHARACTER_DOMAIN_ID,
  CHARACTER_OWNER_ID,
  OBJECT_DOMAIN_ID,
  OBJECT_OWNER_ID,
  LOCATION_DOMAIN_ID,
  LOCATION_OWNER_ID,
  CharacterOperation,
  ObjectOperation,
  LocationOperation,
  registerAllMockDomainAdapters
} from '../../../core/domains/index.ts';
import { makeSystemID, makeRequestID } from '../../../core/types/identifiers.ts';

describe('Phase 7 - Multi-Domain Cross-Domain Unit Tests', () => {
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');

  beforeEach(() => {
    registerAllMockDomainAdapters();
  });

  it('1. Executes multi-domain change request across Character and Object domains while maintaining separate ownership', () => {
    // A scenario where Character status changes to 'HOLDING_ITEM' and Object holder changes to 'CHAR_ABSTRACT_01'
    const charReq = {
      requestId: makeRequestID('REQ_MULTI_CHAR_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'EQUIPPED',
        transitionReason: 'Equipped item'
      }
    };

    const objReq = {
      requestId: makeRequestID('REQ_MULTI_OBJ_01'),
      sourceSystem: dailyUniverse,
      targetDomain: OBJECT_DOMAIN_ID,
      operation: ObjectOperation.REQUEST_TRANSITION,
      entityReference: 'OBJ_ABSTRACT_01',
      payload: {
        objectId: 'OBJ_ABSTRACT_01',
        transferToHolderRef: 'CHAR_ABSTRACT_01',
        transitionReason: 'Equipped by character'
      }
    };

    const multiRes = DomainGateway.requestMultiDomainChange(dailyUniverse, [charReq, objReq]);

    assert.strictEqual(multiRes.allSucceeded, true);
    assert.strictEqual(multiRes.results[String(CHARACTER_DOMAIN_ID)].owner, CHARACTER_OWNER_ID);
    assert.strictEqual(multiRes.results[String(OBJECT_DOMAIN_ID)].owner, OBJECT_OWNER_ID);

    // Verify ownerships did not merge
    assert.notStrictEqual(
      multiRes.results[String(CHARACTER_DOMAIN_ID)].owner,
      multiRes.results[String(OBJECT_DOMAIN_ID)].owner
    );
  });

  it('2. Multi-domain operations route mutations only to their corresponding domain owners', () => {
    // Character owner applies Character change
    const charApply = {
      requestId: makeRequestID('REQ_APPLY_CHAR_01'),
      sourceSystem: CHARACTER_OWNER_ID,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'MOVED_ZONES',
        transitionReason: 'Relocation'
      }
    };

    // Object owner applies Object change
    const objApply = {
      requestId: makeRequestID('REQ_APPLY_OBJ_01'),
      sourceSystem: OBJECT_OWNER_ID,
      targetDomain: OBJECT_DOMAIN_ID,
      operation: ObjectOperation.REQUEST_TRANSITION,
      entityReference: 'OBJ_ABSTRACT_01',
      payload: {
        objectId: 'OBJ_ABSTRACT_01',
        transferToLocationRef: 'LOC_ABSTRACT_02',
        transitionReason: 'Relocation'
      }
    };

    // Character owner applying character change succeeds
    const charRes = DomainGateway.applyChange(CHARACTER_OWNER_ID, CHARACTER_DOMAIN_ID, charApply);
    assert.strictEqual(charRes.success, true);

    // Object owner applying object change succeeds
    const objRes = DomainGateway.applyChange(OBJECT_OWNER_ID, OBJECT_DOMAIN_ID, objApply);
    assert.strictEqual(objRes.success, true);

    // Character owner attempting to apply Object change fails
    const illegalObjApply = DomainGateway.applyChange(CHARACTER_OWNER_ID, OBJECT_DOMAIN_ID, objApply);
    assert.strictEqual(illegalObjApply.success, false);
  });
});
