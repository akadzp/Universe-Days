/**
 * Phase 7: Domain System Integration - Golden Scenarios
 *
 * Covers the 8 foundational architectural golden paths:
 * 1. Authorized Read
 * 2. Unauthorized Mutation Prevention
 * 3. Correct Owner Routing
 * 4. Wrong Owner Routing Rejection
 * 5. Cross-Domain Request
 * 6. Conflict Routing & Non-Automatic Arbitration
 * 7. Temporal + Domain Request
 * 8. Continuity + Domain Transition
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  DomainGateway,
  CHARACTER_DOMAIN_ID,
  CHARACTER_OWNER_ID,
  RELATIONSHIP_DOMAIN_ID,
  RELATIONSHIP_OWNER_ID,
  OBJECT_DOMAIN_ID,
  OBJECT_OWNER_ID,
  KNOWLEDGE_DOMAIN_ID,
  KNOWLEDGE_OWNER_ID,
  STATE_DOMAIN_ID,
  STATE_OWNER_ID,
  LOCATION_DOMAIN_ID,
  LOCATION_OWNER_ID,
  CharacterOperation,
  ObjectOperation,
  LocationOperation,
  DomainResultType,
  registerAllMockDomainAdapters
} from '../../core/domains/index.ts';
import { makeSystemID, makeRequestID, makeDomainID } from '../../core/types/identifiers.ts';
import { ConflictDraft, ConflictStatus } from '../../core/architecture/conflict.ts';
import { EngineErrorCode } from '../../core/types/errors.ts';
import { TimePoint } from '../../core/temporal/time-point.ts';
import { ContinuityValidator } from '../../core/universe/continuity/validator.ts';
import { TransitionType, Transition } from '../../core/universe/continuity/transition.ts';
import { EffectiveTime } from '../../core/universe/continuity/continuity-model.ts';
import { ConditionReference } from '../../core/universe/continuity/condition-reference.ts';

describe('Phase 7 Golden Scenarios: Domain System Integration', () => {
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');
  const storyPipeline = makeSystemID('STORY_PIPELINE');
  const externalRogue = makeSystemID('EXTERNAL_ROGUE');

  beforeEach(() => {
    registerAllMockDomainAdapters();
    DomainGateway.clearTraces();
  });

  it('Golden Scenario 1: Authorized Read - Consumer reads domain data successfully and receives immutable reference', () => {
    const queryReq = {
      requestId: makeRequestID('GOLDEN_READ_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.GET_PROFILE_REF,
      entityReference: 'CHAR_ABSTRACT_01'
    };

    const res = DomainGateway.query(dailyUniverse, CHARACTER_DOMAIN_ID, queryReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    assert.strictEqual(res.data.owner, CHARACTER_OWNER_ID);
    assert.strictEqual(res.data.data.characterId, 'CHAR_ABSTRACT_01');

    // Immutability verified
    assert.throws(() => {
      (res.data!.data as any).canonicalName = 'HACKED';
    }, /TypeError/);
  });

  it('Golden Scenario 2: Unauthorized Mutation - Direct mutation by non-owner consumer is strictly blocked', () => {
    const applyReq = {
      requestId: makeRequestID('GOLDEN_MUTATION_01'),
      sourceSystem: dailyUniverse,
      targetDomain: OBJECT_DOMAIN_ID,
      operation: ObjectOperation.REQUEST_TRANSITION,
      entityReference: 'OBJ_ABSTRACT_01',
      payload: {
        objectId: 'OBJ_ABSTRACT_01',
        targetStatus: 'DESTROYED',
        transitionReason: 'Unauthorized overwrite'
      }
    };

    const res = DomainGateway.applyChange(dailyUniverse, OBJECT_DOMAIN_ID, applyReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
  });

  it('Golden Scenario 3: Correct Owner Routing - Change request is routed to domain owner who returns authoritative decision', () => {
    const changeReq = {
      requestId: makeRequestID('GOLDEN_ROUTING_01'),
      sourceSystem: storyPipeline,
      targetDomain: LOCATION_DOMAIN_ID,
      operation: LocationOperation.REQUEST_TRANSITION,
      entityReference: 'LOC_ABSTRACT_01',
      payload: {
        locationId: 'LOC_ABSTRACT_01',
        targetLockStatus: 'LOCKED' as const,
        transitionReason: 'Scene restriction'
      }
    };

    const res = DomainGateway.requestChange(storyPipeline, LOCATION_DOMAIN_ID, changeReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    assert.strictEqual(res.data.owner, LOCATION_OWNER_ID);
    assert.strictEqual(res.data.resultType, DomainResultType.ACCEPTED);
  });

  it('Golden Scenario 4: Wrong Owner Routing - Attempt to apply changes across domain boundaries is rejected', () => {
    const crossApplyReq = {
      requestId: makeRequestID('GOLDEN_WRONG_ROUTING_01'),
      sourceSystem: CHARACTER_OWNER_ID,
      targetDomain: STATE_DOMAIN_ID,
      operation: 'REQUEST_TRANSITION',
      entityReference: 'STATE_ABSTRACT_01',
      payload: {}
    };

    const res = DomainGateway.applyChange(CHARACTER_OWNER_ID, STATE_DOMAIN_ID, crossApplyReq);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
  });

  it('Golden Scenario 5: Cross-Domain Request - Multi-domain operation dispatches cleanly with isolated authorities', () => {
    const charReq = {
      requestId: makeRequestID('GOLDEN_CROSS_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      payload: { characterId: 'CHAR_ABSTRACT_01', targetCondition: 'TRAVELING', transitionReason: 'Cross domain journey' }
    };

    const locReq = {
      requestId: makeRequestID('GOLDEN_CROSS_02'),
      sourceSystem: dailyUniverse,
      targetDomain: LOCATION_DOMAIN_ID,
      operation: LocationOperation.REQUEST_TRANSITION,
      entityReference: 'LOC_ABSTRACT_01',
      payload: { locationId: 'LOC_ABSTRACT_01', transitionReason: 'Arrival in zone' }
    };

    const multiRes = DomainGateway.requestMultiDomainChange(dailyUniverse, [charReq, locReq]);
    assert.strictEqual(multiRes.allSucceeded, true);
    assert.strictEqual(multiRes.results[String(CHARACTER_DOMAIN_ID)].owner, CHARACTER_OWNER_ID);
    assert.strictEqual(multiRes.results[String(LOCATION_DOMAIN_ID)].owner, LOCATION_OWNER_ID);
  });

  it('Golden Scenario 6: Conflict Routing - Domain conflict routes to owner, requiring explicit revalidation', () => {
    const draft: ConflictDraft = {
      conflictId: 'CONF_REL_01',
      domain: RELATIONSHIP_DOMAIN_ID,
      sourceSystem: dailyUniverse,
      conflictingReferences: ['REL_ABSTRACT_01_OBS_ALPHA', 'REL_ABSTRACT_01_OBS_BETA'],
      severity: 'HIGH',
      traceability: {
        requestId: makeRequestID('REQ_REL_CONF'),
        sourceSystem: dailyUniverse,
        timestamp: Date.now(),
        version: '1.0.0'
      },
      description: 'Divergent relationship status observations'
    };

    const routeRes = DomainGateway.routeConflict(draft);
    assert.strictEqual(routeRes.success, true);
    assert.strictEqual(routeRes.data?.targetOwner, RELATIONSHIP_OWNER_ID);
    assert.strictEqual(routeRes.data?.status, ConflictStatus.ROUTED);

    const resolveRes = DomainGateway.resolveConflict(RELATIONSHIP_OWNER_ID, RELATIONSHIP_DOMAIN_ID, {
      conflictId: routeRes.data!.conflictId,
      domain: RELATIONSHIP_DOMAIN_ID,
      resolverActor: RELATIONSHIP_OWNER_ID,
      resolutionDecision: 'CUSTOM',
      rationale: 'Arbitrated by authoritative relationship engine'
    });

    assert.strictEqual(resolveRes.success, true);
    assert.strictEqual(resolveRes.data?.revalidationRequired, true);
  });

  it('Golden Scenario 7: Temporal + Domain Request - Temporal bounds are checked by Temporal Engine', () => {
    const validTp = TimePoint.parse('2024-01-01T15:30:00Z');
    assert.strictEqual(validTp.success, true);

    const timeReq = {
      requestId: makeRequestID('GOLDEN_TEMPORAL_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.REQUEST_TRANSITION,
      entityReference: 'CHAR_ABSTRACT_01',
      effectiveTime: validTp.data,
      payload: { characterId: 'CHAR_ABSTRACT_01', targetCondition: 'ACTIVE', transitionReason: 'Temporal event' }
    };

    const validRes = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, timeReq);
    assert.strictEqual(validRes.success, true);

    const invalidTimeReq = {
      ...timeReq,
      requestId: makeRequestID('GOLDEN_TEMPORAL_02'),
      effectiveTime: 'ILLEGAL_TIMESTAMP'
    };
    const invalidRes = DomainGateway.requestChange(dailyUniverse, CHARACTER_DOMAIN_ID, invalidTimeReq);
    assert.strictEqual(invalidRes.success, false);
    assert.strictEqual(invalidRes.error, EngineErrorCode.INVALID_TIME_POINT);
  });

  it('Golden Scenario 8: Continuity + Domain Transition - Transition passes through Continuity Engine validation', () => {
    const prevRef: ConditionReference = {
      conditionId: 'COND_OBJ_01_INITIAL',
      entityRef: 'OBJ_ABSTRACT_01',
      domain: 'OBJECT',
      temporalValidity: '2024-01-01T00:00:00Z/2024-01-01T12:00:00Z'
    };

    const currRef: ConditionReference = {
      conditionId: 'COND_OBJ_01_NEW_HOLDER',
      entityRef: 'OBJ_ABSTRACT_01',
      domain: 'OBJECT',
      temporalValidity: '2024-01-01T12:00:00Z'
    };

    const transition: Transition = {
      transitionId: 'TRANS_OBJ_01',
      type: TransitionType.CHANGE,
      continuityId: 'CONT_OBJ_01',
      previousConditionRef: prevRef,
      currentConditionRef: currRef,
      effectiveTime: EffectiveTime.create('2024-01-01T12:00:00Z')!
    };

    const validation = ContinuityValidator.validateTransition({ transition });
    assert.strictEqual(validation.allowed, true);
    assert.strictEqual(validation.status, 'VALID');
  });
});
