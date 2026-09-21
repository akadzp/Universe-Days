import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GenericStateMachine } from '../../../core/engine/state-machine.ts';
import { ResultStatus } from '../../../core/types/result.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

type EngineState = 'INIT' | 'READY' | 'EXECUTING' | 'HALTED';

describe('Phase 2 - State Machine Guard & Traceability', () => {
  it('1. Transition guard allows transition when condition is met', () => {
    const sm = new GenericStateMachine<EngineState>('INIT');
    sm.addTransition(
      'INIT',
      'READY',
      'INITIALIZE',
      undefined,
      (payload?: any) => payload?.authorized === true
    );

    // Fail guard
    const failRes = sm.transition('READY', { authorized: false });
    assert.strictEqual(failRes.status, ResultStatus.FAILURE);
    assert.strictEqual(sm.getCurrentState(), 'INIT');

    // Pass guard
    const passRes = sm.transition('READY', { authorized: true });
    assert.strictEqual(passRes.status, ResultStatus.SUCCESS);
    assert.strictEqual(sm.getCurrentState(), 'READY');
  });

  it('2. Records complete transition history', () => {
    const sm = new GenericStateMachine<EngineState>('INIT');
    sm.addTransition('INIT', 'READY', 'BOOT')
      .addTransition('READY', 'EXECUTING', 'RUN')
      .addTransition('EXECUTING', 'HALTED', 'STOP');

    sm.transition('READY', { step: 1 }, 'BOOT');
    sm.transition('EXECUTING', { step: 2 }, 'RUN');

    const history = sm.getHistory();
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].from, 'INIT');
    assert.strictEqual(history[0].to, 'READY');
    assert.strictEqual(history[0].event, 'BOOT');
    assert.strictEqual(history[1].from, 'READY');
    assert.strictEqual(history[1].to, 'EXECUTING');
    assert.strictEqual(history[1].event, 'RUN');
  });

  it('3. Resets state machine back to initial state', () => {
    const sm = new GenericStateMachine<EngineState>('INIT');
    sm.addTransition('INIT', 'READY');
    sm.transition('READY');
    assert.strictEqual(sm.getCurrentState(), 'READY');

    sm.reset();
    assert.strictEqual(sm.getCurrentState(), 'INIT');
    assert.strictEqual(sm.getHistory().length, 0);
  });
});
