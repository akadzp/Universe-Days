/**
 * Phase 7: Domain Read Path Unit Tests
 *
 * Verifies read operations across domains, authorization, error handling,
 * and immutability of returned data.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  DomainGateway,
  CHARACTER_DOMAIN_ID,
  RELATIONSHIP_DOMAIN_ID,
  OBJECT_DOMAIN_ID,
  KNOWLEDGE_DOMAIN_ID,
  STATE_DOMAIN_ID,
  LOCATION_DOMAIN_ID,
  CharacterOperation,
  RelationshipOperation,
  ObjectOperation,
  KnowledgeOperation,
  StateOperation,
  LocationOperation,
  registerAllMockDomainAdapters,
  EpistemicModality
} from '../../../core/domains/index.ts';
import { makeSystemID, makeRequestID, makeDomainID } from '../../../core/types/identifiers.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 7 - Domain Read Path Unit Tests', () => {
  const orchestrator = makeSystemID('ORCHESTRATOR');
  const dailyUniverse = makeSystemID('DAILY_UNIVERSE');

  beforeEach(() => {
    registerAllMockDomainAdapters();
    DomainGateway.clearTraces();
  });

  it('1. Successfully queries Character domain profile and state references', () => {
    const queryReq = {
      requestId: makeRequestID('REQ_CHAR_Q_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.GET_PROFILE_REF,
      entityReference: 'CHAR_ABSTRACT_01'
    };

    const res = DomainGateway.query(dailyUniverse, CHARACTER_DOMAIN_ID, queryReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    const data = res.data.data as any;
    assert.strictEqual(data.characterId, 'CHAR_ABSTRACT_01');
    assert.strictEqual(data.status, 'ACTIVE');
  });

  it('2. Successfully queries Relationship domain status and participants', () => {
    const queryReq = {
      requestId: makeRequestID('REQ_REL_Q_01'),
      sourceSystem: dailyUniverse,
      targetDomain: RELATIONSHIP_DOMAIN_ID,
      operation: RelationshipOperation.GET_STATUS,
      entityReference: 'REL_ABSTRACT_01'
    };

    const res = DomainGateway.query(dailyUniverse, RELATIONSHIP_DOMAIN_ID, queryReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    const data = res.data.data as any;
    assert.strictEqual(data.relationshipId, 'REL_ABSTRACT_01');
    assert.strictEqual(data.status, 'ACTIVE');
  });

  it('3. Successfully queries Object domain possession and location references', () => {
    const queryReq = {
      requestId: makeRequestID('REQ_OBJ_Q_01'),
      sourceSystem: dailyUniverse,
      targetDomain: OBJECT_DOMAIN_ID,
      operation: ObjectOperation.GET_POSSESSION_REF,
      entityReference: 'OBJ_ABSTRACT_01'
    };

    const res = DomainGateway.query(dailyUniverse, OBJECT_DOMAIN_ID, queryReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    const data = res.data.data as any;
    assert.strictEqual(data.objectId, 'OBJ_ABSTRACT_01');
    assert.strictEqual(data.possessionType, 'HELD');
  });

  it('4. Preserves epistemic distinctions when querying Knowledge domain', () => {
    const knowReq = {
      requestId: makeRequestID('REQ_KNOW_Q_01'),
      sourceSystem: dailyUniverse,
      targetDomain: KNOWLEDGE_DOMAIN_ID,
      operation: KnowledgeOperation.QUERY_KNOWLEDGE,
      entityReference: 'KNOW_ABSTRACT_01'
    };

    const res = DomainGateway.query(dailyUniverse, KNOWLEDGE_DOMAIN_ID, knowReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    const data = res.data.data as any;
    assert.strictEqual(data.modality, EpistemicModality.KNOWLEDGE);
    assert.strictEqual(data.certaintyLevel, 1.0);

    const beliefReq = {
      requestId: makeRequestID('REQ_BELIEF_Q_01'),
      sourceSystem: dailyUniverse,
      targetDomain: KNOWLEDGE_DOMAIN_ID,
      operation: KnowledgeOperation.QUERY_KNOWLEDGE,
      entityReference: 'BELIEF_ABSTRACT_01'
    };

    const beliefRes = DomainGateway.query(dailyUniverse, KNOWLEDGE_DOMAIN_ID, beliefReq);
    assert.strictEqual(beliefRes.success, true);
    assert.ok(beliefRes.data);
    const bData = beliefRes.data.data as any;
    assert.strictEqual(bData.modality, EpistemicModality.BELIEF);
    assert.strictEqual(bData.certaintyLevel, 0.7);
  });

  it('5. Successfully queries State domain vectors and historical previous state references', () => {
    const stateReq = {
      requestId: makeRequestID('REQ_STATE_Q_01'),
      sourceSystem: dailyUniverse,
      targetDomain: STATE_DOMAIN_ID,
      operation: StateOperation.GET_PREVIOUS_STATE_REF,
      entityReference: 'STATE_ABSTRACT_01'
    };

    const res = DomainGateway.query(dailyUniverse, STATE_DOMAIN_ID, stateReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    const data = res.data.data as any;
    assert.strictEqual(data.stateId, 'STATE_ABSTRACT_01');
    assert.strictEqual(data.previousState, 'INITIALIZING');
  });

  it('6. Successfully queries Location domain occupancy and availability', () => {
    const locReq = {
      requestId: makeRequestID('REQ_LOC_Q_01'),
      sourceSystem: dailyUniverse,
      targetDomain: LOCATION_DOMAIN_ID,
      operation: LocationOperation.GET_OCCUPANCY_REF,
      entityReference: 'LOC_ABSTRACT_01'
    };

    const res = DomainGateway.query(dailyUniverse, LOCATION_DOMAIN_ID, locReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    const data = res.data.data as any;
    assert.strictEqual(data.locationId, 'LOC_ABSTRACT_01');
    assert.strictEqual(data.occupancyCount, 1);
  });

  it('7. Fails gracefully when querying an unregistered domain', () => {
    const unregDomain = makeDomainID('UNREGISTERED_DOMAIN');
    const queryReq = {
      requestId: makeRequestID('REQ_UNREG_01'),
      sourceSystem: dailyUniverse,
      targetDomain: unregDomain,
      operation: 'GET_DATA'
    };

    const res = DomainGateway.query(dailyUniverse, unregDomain, queryReq);
    assert.strictEqual(res.success, false);
  });

  it('8. Enforces immutability on returned data to prevent consumer mutation bypasses', () => {
    const queryReq = {
      requestId: makeRequestID('REQ_IMMUTABLE_01'),
      sourceSystem: dailyUniverse,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: CharacterOperation.GET_PROFILE_REF,
      entityReference: 'CHAR_ABSTRACT_01'
    };

    const res = DomainGateway.query(dailyUniverse, CHARACTER_DOMAIN_ID, queryReq);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);

    // Attempting to mutate returned frozen object must throw in strict mode
    assert.throws(() => {
      (res.data!.data as any).status = 'CORRUPTED_BY_CONSUMER';
    }, /TypeError/);
  });
});
