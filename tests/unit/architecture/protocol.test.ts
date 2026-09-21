import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  MessageType,
  ProtocolStatus,
  createProtocolMessage,
  validateProtocolMessage
} from '../../../core/architecture/protocol.ts';
import { makeSystemID, makeRequestID } from '../../../core/types/identifiers.ts';
import { ResultStatus } from '../../../core/types/result.ts';

describe('Architecture Core - Protocol', () => {
  it('1. Valid READ message accepted', () => {
    const msg = createProtocolMessage(
      MessageType.READ,
      makeSystemID('CONSUMER_A'),
      makeSystemID('TEMPORAL_SYSTEM'),
      { query: 'current_epoch' }
    );

    const validation = validateProtocolMessage(msg);
    assert.strictEqual(validation.status, ResultStatus.SUCCESS);
    assert.ok(validation.data);
    assert.strictEqual(validation.data.type, MessageType.READ);
    assert.strictEqual(validation.data.source, 'CONSUMER_A');
    assert.strictEqual(validation.data.target, 'TEMPORAL_SYSTEM');
  });

  it('2. Valid REQUEST message accepted', () => {
    const msg = createProtocolMessage(
      MessageType.REQUEST,
      makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      makeSystemID('CHARACTER_SYSTEM'),
      { intent: 'request_vitality_drain', amount: 10 }
    );

    const validation = validateProtocolMessage(msg);
    assert.strictEqual(validation.status, ResultStatus.SUCCESS);
    assert.ok(validation.data);
    assert.strictEqual(validation.data.type, MessageType.REQUEST);
  });

  it('3. Invalid message type rejected', () => {
    const invalidMsg = {
      requestId: makeRequestID('REQ-001'),
      type: 'TELEPORT_MAGIC', // Invalid message type
      source: makeSystemID('SYSTEM_A'),
      target: makeSystemID('SYSTEM_B'),
      status: ProtocolStatus.PENDING,
      timestamp: Date.now()
    };

    const validation = validateProtocolMessage(invalidMsg);
    assert.strictEqual(validation.status, ResultStatus.FAILURE);
    assert.match(validation.error as string, /Invalid message type/);
  });

  it('4. Missing source rejected', () => {
    const missingSourceMsg = {
      requestId: makeRequestID('REQ-002'),
      type: MessageType.READ,
      target: makeSystemID('TEMPORAL_SYSTEM'),
      status: ProtocolStatus.PENDING,
      timestamp: Date.now()
    };

    const validation = validateProtocolMessage(missingSourceMsg);
    assert.strictEqual(validation.status, ResultStatus.FAILURE);
    assert.match(validation.error as string, /Missing required field: source system/);
  });

  it('5. Missing target rejected', () => {
    const missingTargetMsg = {
      requestId: makeRequestID('REQ-003'),
      type: MessageType.REQUEST,
      source: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      status: ProtocolStatus.PENDING,
      timestamp: Date.now()
    };

    const validation = validateProtocolMessage(missingTargetMsg);
    assert.strictEqual(validation.status, ResultStatus.FAILURE);
    assert.match(validation.error as string, /Missing required field: target system/);
  });
});
