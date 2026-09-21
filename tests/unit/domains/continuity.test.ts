/**
 * Phase 7: Domain Continuity Integration Unit Tests
 *
 * Verifies that domain transitions pass through and validate against the Continuity Engine.
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
import { ContinuityValidator } from '../../../core/universe/continuity/validator.ts';
import { TransitionType, Transition } from '../../../core/universe/continuity/transition.ts';
import { EffectiveTime, ContinuityStatus } from '../../../core/universe/continuity/continuity-model.ts';
import { ConditionReference } from '../../../core/universe/continuity/condition-reference.ts';

describe('Phase 7 - Domain Continuity Integration Unit Tests', () => {
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');

  beforeEach(() => {
    registerAllMockDomainAdapters();
  });

  it('1. Validates a domain change transition against the Continuity Engine', () => {
    // 1. Submit domain change request
    const changeReq = {
      requestId: makeRequestID('REQ_CONT_VALID_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      payload: {
        characterId: 'CHAR_ABSTRACT_01',
        targetCondition: 'ACTIVE_STUDY',
        transitionReason: 'Schedule change'
      }
    };

    const res = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, changeReq);
    assert.strictEqual(res.success, true);

    // 2. Validate continuity of the transition
    const prevRef: ConditionReference = {
      conditionId: 'COND_CHAR_01_INITIAL',
      entityRef: 'CHAR_ABSTRACT_01',
      domain: 'CHARACTER',
      temporalValidity: '2024-01-01T00:00:00Z/2024-01-01T12:00:00Z'
    };

    const currRef: ConditionReference = {
      conditionId: 'COND_CHAR_01_ACTIVE',
      entityRef: 'CHAR_ABSTRACT_01',
      domain: 'CHARACTER',
      temporalValidity: '2024-01-01T12:00:00Z'
    };

    const continuityTransition: Transition = {
      transitionId: 'TRANS_CHAR_01',
      type: TransitionType.CHANGE,
      continuityId: 'CONT_CHAR_01',
      previousConditionRef: prevRef,
      currentConditionRef: currRef,
      effectiveTime: EffectiveTime.create('2024-01-01T12:00:00Z')!
    };

    const contResult = ContinuityValidator.validateTransition({
      transition: continuityTransition
    });

    assert.strictEqual(contResult.allowed, true);
    assert.strictEqual(contResult.status, 'VALID');
  });

  it('2. Detects continuity violations when domain transition lacks required predecessor', () => {
    const invalidTransition: Transition = {
      transitionId: 'TRANS_CHAR_INVALID',
      type: TransitionType.CHANGE,
      continuityId: 'CONT_CHAR_01',
      previousConditionRef: null, // Missing predecessor for CHANGE
      currentConditionRef: null,
      effectiveTime: EffectiveTime.create('2024-01-01T12:00:00Z')!
    };

    const contResult = ContinuityValidator.validateTransition({
      transition: invalidTransition
    });

    assert.strictEqual(contResult.allowed, false);
    assert.strictEqual(contResult.status, 'INVALID');
  });
});
