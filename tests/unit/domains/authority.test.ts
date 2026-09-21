/**
 * Phase 7: Domain Authority Unit Tests
 *
 * Verifies that the gateway strictly blocks non-owners from applying mutations,
 * prevents authority bypasses, and upholds architectural ownership bounds.
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
  registerAllMockDomainAdapters
} from '../../../core/domains/index.ts';
import { makeSystemID, makeRequestID } from '../../../core/types/identifiers.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 7 - Domain Authority Unit Tests', () => {
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');
  const storyPipeline = makeSystemID('STORY_PIPELINE');
  const rogueSystem = makeSystemID('ROGUE_EXTERNAL_SYSTEM');

  beforeEach(() => {
    registerAllMockDomainAdapters();
    DomainGateway.clearTraces();
  });

  it('1. Rejects attempt by Daily Universe to directly APPLY a mutation to Character domain', () => {
    const applyReq = {
      requestId: makeRequestID('REQ_UNAUTH_APPLY_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'BYPASSED_CONDITION',
        transitionReason: 'Unauthorized mutation attempt'
      }
    };

    const res = DomainGateway.applyChange(dailyUniverse, CHARACTER_DOMAIN_ID, applyReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
  });

  it('2. Rejects attempt by Story Pipeline to directly APPLY a mutation to Object domain', () => {
    const applyReq = {
      requestId: makeRequestID('REQ_UNAUTH_APPLY_02'),
      sourceSystem: storyPipeline,
      targetDomain: OBJECT_DOMAIN_ID,
      operation: ObjectOperation.REQUEST_TRANSITION,
      entityReference: 'OBJ_ABSTRACT_01',
      payload: {
        objectId: 'OBJ_ABSTRACT_01',
        targetStatus: 'DESTROYED',
        transitionReason: 'Story drama'
      }
    };

    const res = DomainGateway.applyChange(storyPipeline, OBJECT_DOMAIN_ID, applyReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
  });

  it('3. Rejects attempt by Character System to APPLY a mutation to Location domain (cross-owner violation)', () => {
    const applyReq = {
      requestId: makeRequestID('REQ_UNAUTH_APPLY_03'),
      sourceSystem: CHARACTER_OWNER_ID,
      targetDomain: LOCATION_DOMAIN_ID,
      operation: 'REQUEST_TRANSITION',
      entityReference: 'LOC_ABSTRACT_01',
      payload: {}
    };

    const res = DomainGateway.applyChange(CHARACTER_OWNER_ID, LOCATION_DOMAIN_ID, applyReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
  });

  it('4. Allows consumers to submit REQUEST_CHANGE, but leaves application strictly to owner', () => {
    const changeReq = {
      requestId: makeRequestID('REQ_AUTH_REQ_01'),
      sourceSystem: dailyUniverse,
      targetDomain: OBJECT_DOMAIN_ID,
      operation: ObjectOperation.REQUEST_TRANSITION,
      entityReference: 'OBJ_ABSTRACT_01',
      payload: {
        objectId: 'OBJ_ABSTRACT_01',
        transferToHolderRef: 'CHAR_ABSTRACT_02',
        transitionReason: 'Trade request'
      }
    };

    // Request is authorized for Daily Universe
    const reqRes = DomainGateway.requestChange(dailyUniverse, OBJECT_DOMAIN_ID, changeReq);
    assert.strictEqual(reqRes.success, true);
    assert.strictEqual(reqRes.data?.owner, OBJECT_OWNER_ID);

    // But Daily Universe cannot directly apply it
    const applyRes = DomainGateway.applyChange(dailyUniverse, OBJECT_DOMAIN_ID, changeReq);
    assert.strictEqual(applyRes.success, false);

    // Only OBJECT_OWNER_ID can apply it
    const ownerApplyRes = DomainGateway.applyChange(OBJECT_OWNER_ID, OBJECT_DOMAIN_ID, changeReq);
    assert.strictEqual(ownerApplyRes.success, true);
  });
});
