/**
 * Phase 7: Domain Temporal Integration Unit Tests
 *
 * Verifies that domain requests validate effective time and intervals using Temporal Engine.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  DomainGateway,
  CHARACTER_DOMAIN_ID,
  CharacterOperation,
  registerAllMockDomainAdapters
} from '../../../core/domains/index.ts';
import { makeSystemID, makeRequestID } from '../../../core/types/identifiers.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';
import { TimePoint } from '../../../core/temporal/time-point.ts';

describe('Phase 7 - Domain Temporal Integration Unit Tests', () => {
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');

  beforeEach(() => {
    registerAllMockDomainAdapters();
  });

  it('1. Accepts change request with valid ISO temporal anchor', () => {
    const changeReq = {
      requestId: makeRequestID('REQ_TIME_VALID_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      effectiveTime: '2024-01-01T12:00:00Z',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'ACTIVE',
        transitionReason: 'Scheduled transition'
      }
    };

    const res = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, changeReq);
    assert.strictEqual(res.success, true);
  });

  it('2. Accepts change request with valid TimePoint object', () => {
    const tpRes = TimePoint.parse('2024-01-01T12:00:00Z');
    assert.strictEqual(tpRes.success, true);

    const changeReq = {
      requestId: makeRequestID('REQ_TIME_TP_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      effectiveTime: tpRes.data,
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'ACTIVE',
        transitionReason: 'TimePoint scheduled transition'
      }
    };

    const res = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, changeReq);
    assert.strictEqual(res.success, true);
  });

  it('3. Rejects change request with malformed temporal anchor string', () => {
    const changeReq = {
      requestId: makeRequestID('REQ_TIME_INVALID_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      effectiveTime: 'NOT_A_VALID_ISO_TIMESTAMP_OR_DATE',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'ACTIVE',
        transitionReason: 'Bad time string'
      }
    };

    const res = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, changeReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.INVALID_TIME_POINT);
  });
});
