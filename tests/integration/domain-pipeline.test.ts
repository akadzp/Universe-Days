/**
 * Phase 7: End-to-End Domain Integration Pipeline Test
 *
 * Full integration pipeline flow:
 * 1. Daily Universe queries Character domain
 * 2. Daily Universe queries Relationship domain
 * 3. Daily Universe queries Object domain
 * 4. Daily Universe issues an abstract change request
 * 5. Authority check validates REQUEST_CHANGE permission
 * 6. Correct domain owner receives request and validates invariants
 * 7. Owner returns ACCEPTED result (authoritatively isolated)
 * 8. Continuity Engine validates the prospective transition
 * 9. Temporal Engine validates time anchors
 * 10. Final deterministic orchestration result is produced.
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
  CharacterOperation,
  RelationshipOperation,
  ObjectOperation,
  DomainResultType,
  registerAllMockDomainAdapters
} from '../../core/domains/index.ts';
import { makeSystemID, makeRequestID } from '../../core/types/identifiers.ts';
import { TimePoint } from '../../core/temporal/time-point.ts';
import { ContinuityValidator } from '../../core/universe/continuity/validator.ts';
import { TransitionType, Transition } from '../../core/universe/continuity/transition.ts';
import { EffectiveTime } from '../../core/universe/continuity/continuity-model.ts';
import { ConditionReference } from '../../core/universe/continuity/condition-reference.ts';

describe('Phase 7 - End-to-End Domain Integration Pipeline Test', () => {
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');

  beforeEach(() => {
    registerAllMockDomainAdapters();
    DomainGateway.clearTraces();
  });

  it('Executes the complete Daily Universe domain orchestration pipeline', () => {
    // Step 1: Query Character Domain
    const charQuery = DomainGateway.query(dailyUniverse, CHARACTER_DOMAIN_ID, {
      requestId: makeRequestID('PIPE_CHAR_Q'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.GET_PROFILE_REF,
      entityReference: 'CHAR_ABSTRACT_01'
    });
    assert.strictEqual(charQuery.success, true);
    assert.strictEqual(charQuery.data?.owner, CHARACTER_OWNER_ID);
    const charId = (charQuery.data!.data as any).characterId;

    // Step 2: Query Relationship Domain
    const relQuery = DomainGateway.query(dailyUniverse, RELATIONSHIP_DOMAIN_ID, {
      requestId: makeRequestID('PIPE_REL_Q'),
      sourceSystem: dailyUniverse,
      targetDomain: RELATIONSHIP_DOMAIN_ID,
      operation: RelationshipOperation.GET_STATUS,
      entityReference: 'REL_ABSTRACT_01'
    });
    assert.strictEqual(relQuery.success, true);
    assert.strictEqual(relQuery.data?.owner, RELATIONSHIP_OWNER_ID);

    // Step 3: Query Object Domain
    const objQuery = DomainGateway.query(dailyUniverse, OBJECT_DOMAIN_ID, {
      requestId: makeRequestID('PIPE_OBJ_Q'),
      sourceSystem: dailyUniverse,
      targetDomain: OBJECT_DOMAIN_ID,
      operation: ObjectOperation.GET_POSSESSION_REF,
      entityReference: 'OBJ_ABSTRACT_01'
    });
    assert.strictEqual(objQuery.success, true);
    assert.strictEqual(objQuery.data?.owner, OBJECT_OWNER_ID);

    // Step 4 & 5: Daily Universe issues abstract Change Request (passes authority check)
    const timeAnchor = '2024-01-01T12:00:00Z';
    const changeReq = {
      requestId: makeRequestID('PIPE_CHANGE_REQ'),
      sourceSystem: dailyUniverse,
      targetDomain: OBJECT_DOMAIN_ID,
      operation: ObjectOperation.REQUEST_TRANSITION,
      entityReference: 'OBJ_ABSTRACT_01',
      effectiveTime: timeAnchor,
      payload: {
        objectId: 'OBJ_ABSTRACT_01',
        transferToHolderRef: charId,
        transitionReason: 'Daily universe orchestrated trade'
      }
    };

    // Step 6 & 7: Correct domain owner receives, validates, and returns ACCEPTED
    const changeResult = DomainGateway.requestChange(dailyUniverse, OBJECT_DOMAIN_ID, changeReq);
    assert.strictEqual(changeResult.success, true);
    assert.strictEqual(changeResult.data?.resultType, DomainResultType.ACCEPTED);
    assert.strictEqual(changeResult.data?.owner, OBJECT_OWNER_ID);

    // Step 8: Continuity Engine validates the prospective transition
    const prevRef: ConditionReference = {
      conditionId: 'COND_OBJ_01_PREV',
      entityRef: 'OBJ_ABSTRACT_01',
      domain: 'OBJECT',
      temporalValidity: `2024-01-01T00:00:00Z/${timeAnchor}`
    };
    const currRef: ConditionReference = {
      conditionId: 'COND_OBJ_01_CURR',
      entityRef: 'OBJ_ABSTRACT_01',
      domain: 'OBJECT',
      temporalValidity: timeAnchor
    };

    const transition: Transition = {
      transitionId: 'TRANS_PIPE_01',
      type: TransitionType.CHANGE,
      continuityId: 'CONT_OBJ_PIPE_01',
      previousConditionRef: prevRef,
      currentConditionRef: currRef,
      effectiveTime: EffectiveTime.create(timeAnchor)!
    };

    const continuityValidation = ContinuityValidator.validateTransition({ transition });
    assert.strictEqual(continuityValidation.allowed, true);
    assert.strictEqual(continuityValidation.status, 'VALID');

    // Step 9: Temporal Engine validation
    const temporalCheck = TimePoint.parse(timeAnchor);
    assert.strictEqual(temporalCheck.success, true);

    // Step 10: Authoritative owner applies mutation
    const applyResult = DomainGateway.applyChange(OBJECT_OWNER_ID, OBJECT_DOMAIN_ID, changeReq);
    assert.strictEqual(applyResult.success, true);
    assert.strictEqual(applyResult.data?.resultType, DomainResultType.APPLIED);

    // Verify all traces exist
    const traces = DomainGateway.getAllTraces();
    assert.ok(traces.length >= 4);
  });
});
