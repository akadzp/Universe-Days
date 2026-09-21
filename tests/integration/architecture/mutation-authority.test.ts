import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getOwner } from '../../../core/architecture/ownership.ts';
import { canPerformAction, ArchitectureAction } from '../../../core/architecture/authority.ts';
import {
  MessageType,
  ProtocolStatus,
  createProtocolMessage,
  validateProtocolMessage
} from '../../../core/architecture/protocol.ts';
import { makeSystemID, makeDomainID, makeCorrelationID } from '../../../core/types/identifiers.ts';
import { ResultStatus } from '../../../core/types/result.ts';

describe('Architecture Integration - Mutation Authority and Inter-System Request Flow', () => {
  it('Proves consumer cannot directly mutate domain and must route REQUEST to authoritative owner', () => {
    // 1. SETUP: Abstract Consumer and Abstract Target Domain
    // Consumer: "ORCHESTRATOR_CONSUMER"
    // Target Domain: "STATE" (Authoritative owner: "STATE_SYSTEM")
    const consumerSystem = makeSystemID('ORCHESTRATOR_CONSUMER');
    const targetDomain = makeDomainID('STATE');

    // Abstract simulated domain state maintained only by its owner
    const domainState = {
      version: 1,
      metricValue: 100,
      lastModifiedBy: 'STATE_SYSTEM'
    };

    // 2. REQUEST: Consumer desires a mutation (e.g. increment metricValue by 25)
    const mutationPayload = { change: 'INCREMENT', amount: 25 };

    // Step A: Identify Domain and Authoritative Owner
    const owner = getOwner(targetDomain);
    assert.ok(owner, 'Target domain must have an authoritative owner registered');
    assert.strictEqual(owner.ownerId, 'STATE_SYSTEM');
    assert.notStrictEqual(consumerSystem, owner.ownerId, 'Consumer must not be the authoritative owner');

    // Step B: Attempt direct APPLY by consumer -> MUST BE DETERMINISTICALLY REJECTED
    const directApplyDecision = canPerformAction(
      consumerSystem,
      targetDomain,
      ArchitectureAction.APPLY_CHANGE
    );

    assert.strictEqual(
      directApplyDecision.status,
      ResultStatus.FAILURE,
      'Direct APPLY by a non-owner consumer must be rejected'
    );
    assert.strictEqual(directApplyDecision.message, 'UNAUTHORIZED_MUTATION');

    // Verify domain state remains strictly untouched after illegal attempt
    assert.strictEqual(domainState.metricValue, 100);
    assert.strictEqual(domainState.lastModifiedBy, 'STATE_SYSTEM');

    // Step C: Verify consumer CAN perform REQUEST_CHANGE
    const requestDecision = canPerformAction(
      consumerSystem,
      targetDomain,
      ArchitectureAction.REQUEST_CHANGE
    );

    assert.strictEqual(
      requestDecision.status,
      ResultStatus.SUCCESS,
      'Consumer must be authorized to issue a REQUEST_CHANGE'
    );
    assert.strictEqual(requestDecision.data?.allowed, true);

    // Step D: Format protocol message from Consumer to Target Owner
    const requestMessage = createProtocolMessage(
      MessageType.REQUEST,
      consumerSystem,
      owner.ownerId,
      mutationPayload
    );

    const messageValidation = validateProtocolMessage(requestMessage);
    assert.strictEqual(messageValidation.status, ResultStatus.SUCCESS);
    assert.strictEqual(requestMessage.source, consumerSystem);
    assert.strictEqual(requestMessage.target, owner.ownerId);

    // Step E: Route to Authoritative Owner for evaluation & application
    // The authoritative owner receives the message, verifies its own authority, and applies the change
    const ownerApplyDecision = canPerformAction(
      owner.ownerId,
      targetDomain,
      ArchitectureAction.APPLY_CHANGE
    );

    assert.strictEqual(
      ownerApplyDecision.status,
      ResultStatus.SUCCESS,
      'Authoritative owner must have authority to APPLY_CHANGE'
    );
    assert.strictEqual(ownerApplyDecision.data?.allowed, true);

    // Owner applies the change in its own domain memory
    if (ownerApplyDecision.status === ResultStatus.SUCCESS) {
      domainState.metricValue += mutationPayload.amount;
      domainState.version += 1;
      domainState.lastModifiedBy = owner.ownerId;
    }

    // Step F: Return deterministic result protocol message back to consumer
    const responseMessage = createProtocolMessage(
      MessageType.RESULT,
      owner.ownerId,
      consumerSystem,
      { success: true, newVersion: domainState.version, metricValue: domainState.metricValue },
      makeCorrelationID(requestMessage.requestId)
    );
    responseMessage.status = ProtocolStatus.PROCESSED;

    assert.strictEqual(responseMessage.type, MessageType.RESULT);
    assert.strictEqual(responseMessage.target, consumerSystem);
    assert.strictEqual(responseMessage.source, owner.ownerId);

    // FINAL PROOF: State was ONLY updated by the authoritative owner, never by the consumer
    assert.strictEqual(domainState.metricValue, 125);
    assert.strictEqual(domainState.version, 2);
    assert.strictEqual(domainState.lastModifiedBy, 'STATE_SYSTEM');
  });
});
