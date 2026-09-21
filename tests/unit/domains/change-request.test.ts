/**
 * Phase 7: Domain Change Request Unit Tests
 *
 * Verifies change request lifecycle, validation by domain owners,
 * distinction between ACCEPTED vs APPLIED, and rejection/blocking behaviors.
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
  CharacterOperation,
  ObjectOperation,
  LocationOperation,
  DomainResultType,
  registerAllMockDomainAdapters
} from '../../../core/domains/index.ts';
import { makeSystemID, makeRequestID } from '../../../core/types/identifiers.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 7 - Domain Change Request Unit Tests', () => {
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');
  const orchestrator = makeSystemID('ORCHESTRATOR');

  beforeEach(() => {
    registerAllMockDomainAdapters();
    DomainGateway.clearTraces();
  });

  it('1. Daily Universe submits a valid change request to Character owner and receives ACCEPTED (not APPLIED)', () => {
    const changeReq = {
      requestId: makeRequestID('REQ_CHAR_CHG_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'ACTIVE_STUDY',
        transitionReason: 'Daily schedule shift'
      }
    };

    const res = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, changeReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    assert.strictEqual(res.data.resultType, DomainResultType.ACCEPTED);
    assert.strictEqual(res.data.owner, CHARACTER_OWNER_ID);

    // Verify change is NOT automatically applied to underlying state store yet
    const queryReq = {
      requestId: makeRequestID('REQ_CHAR_VERIFY_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.GET_STATE_REF,
      entityReference: 'CHAR_ABSTRACT_01'
    };
    const checkQuery = DomainGateway.query(dailyUniverse, CHARACTER_DOMAIN_ID, queryReq);
    assert.strictEqual((checkQuery.data?.data as any)?.conditionStatus, 'NORMAL'); // Still NORMAL in base state
  });

  it('2. Character owner can authoritatively APPLY change', () => {
    const applyReq = {
      requestId: makeRequestID('REQ_CHAR_APPLY_01'),
      sourceSystem: CHARACTER_OWNER_ID,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'RESTING',
        transitionReason: 'Authoritative sleep cycle'
      }
    };

    const res = DomainGateway.applyChange(CHARACTER_OWNER_ID, CHARACTER_DOMAIN_ID, applyReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    assert.strictEqual(res.data.resultType, DomainResultType.APPLIED);

    // Verify it is now mutated in the domain store
    const queryReq = {
      requestId: makeRequestID('REQ_CHAR_VERIFY_02'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.GET_STATE_REF,
      entityReference: 'CHAR_ABSTRACT_01'
    };
    const checkQuery = DomainGateway.query(dailyUniverse, CHARACTER_DOMAIN_ID, queryReq);
    assert.strictEqual((checkQuery.data?.data as any)?.conditionStatus, 'RESTING');
  });

  it('3. Rejects change request with unsupported operation', () => {
    const invalidOpReq = {
      requestId: makeRequestID('REQ_INVALID_OP_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: 'UNSUPPORTED_RANDOM_OPERATION',
      payload: {}
    };

    const res = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, invalidOpReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.DOMAIN_VALIDATION_FAILED);
  });

  it('4. Rejects change request with invalid entity reference format', () => {
    const invalidRefReq = {
      requestId: makeRequestID('REQ_INVALID_REF_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'INVALID_PREFIX_ID',
      payload: {
        characterId: 'INVALID_PREFIX_ID',
        targetCondition: 'ACTIVE',
        transitionReason: 'Test'
      }
    };

    const res = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, invalidRefReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.DOMAIN_VALIDATION_FAILED);
  });

  it('5. Handles REJECTED result from domain owner when invariant fails', () => {
    const rejectedReq = {
      requestId: makeRequestID('REQ_REJECT_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'INVALID_STATE',
        transitionReason: 'Should fail'
      }
    };

    const res = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, rejectedReq);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.resultType, DomainResultType.REJECTED);
  });

  it('6. Handles BLOCKED result when domain conditions prevent execution', () => {
    const blockedReq = {
      requestId: makeRequestID('REQ_BLOCKED_01'),
      sourceSystem: dailyUniverse,
      targetDomain: LOCATION_DOMAIN_ID,
      operation: LocationOperation.REQUEST_TRANSITION,
      entityReference: 'LOC_ABSTRACT_01',
      payload: {
        locationId: 'LOC_ABSTRACT_01',
        targetLockStatus: 'SEALED',
        transitionReason: 'Cannot seal root zone'
      }
    };

    const res = DomainGateway.requestChange(dailyUniverse, LOCATION_DOMAIN_ID, blockedReq);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.resultType, DomainResultType.BLOCKED);
  });
});
