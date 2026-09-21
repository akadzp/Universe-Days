import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GenericStateMachine } from '../../../core/engine/state-machine.ts';
import { ResultStatus } from '../../../core/types/result.ts';

type TestState = 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

describe('Core Engine - State Machine', () => {
  const setupMachine = () => {
    const sm = new GenericStateMachine<TestState>('IDLE');
    sm.addTransition('IDLE', 'PROCESSING')
      .addTransition('PROCESSING', 'COMPLETED')
      .addTransition('PROCESSING', 'FAILED')
      .addTransition('FAILED', 'IDLE');
    return sm;
  };

  it('1. Valid transition succeeds', () => {
    const sm = setupMachine();
    const res = sm.transition('PROCESSING');

    assert.strictEqual(res.status, ResultStatus.SUCCESS);
    assert.strictEqual(res.data, 'PROCESSING');
    assert.strictEqual(sm.getCurrentState(), 'PROCESSING');
  });

  it('2. Invalid transition is rejected', () => {
    const sm = setupMachine();
    // From IDLE, direct transition to COMPLETED is forbidden
    const res = sm.transition('COMPLETED');

    assert.strictEqual(res.status, ResultStatus.FAILURE);
    assert.strictEqual(res.message, 'INVALID_STATE_TRANSITION');
  });

  it('3. Current state changes only after valid transition', () => {
    const sm = setupMachine();
    assert.strictEqual(sm.getCurrentState(), 'IDLE');

    sm.transition('PROCESSING');
    assert.strictEqual(sm.getCurrentState(), 'PROCESSING');

    sm.transition('COMPLETED');
    assert.strictEqual(sm.getCurrentState(), 'COMPLETED');
  });

  it('4. Invalid transition does not mutate state', () => {
    const sm = setupMachine();
    assert.strictEqual(sm.getCurrentState(), 'IDLE');

    // Attempt invalid transition
    sm.transition('COMPLETED');
    // State MUST remain strictly IDLE
    assert.strictEqual(sm.getCurrentState(), 'IDLE');

    // Attempt another invalid transition
    sm.transition('FAILED');
    assert.strictEqual(sm.getCurrentState(), 'IDLE');
  });
});
