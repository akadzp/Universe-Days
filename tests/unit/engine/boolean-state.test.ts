import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BooleanStateManager } from '../../../core/engine/state/boolean-state.ts';
import { ResultStatus } from '../../../core/types/result.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 2 - Boolean State Architecture', () => {
  let manager: BooleanStateManager;

  beforeEach(() => {
    manager = new BooleanStateManager(['READY', 'ACTIVE', 'BLOCKED', 'CAN_CONTINUE', 'ERROR']);
  });

  it('1. Sets and gets explicit boolean flags', () => {
    const res = manager.setFlag('READY', true);
    assert.strictEqual(res.status, ResultStatus.SUCCESS);
    assert.strictEqual(manager.getFlag('READY'), true);

    manager.setFlag('ACTIVE', false);
    assert.strictEqual(manager.getFlag('ACTIVE'), false);
  });

  it('2. Rejects non-boolean values without implicit truthy coercion', () => {
    // @ts-expect-error Testing runtime non-boolean rejection
    const res = manager.setFlag('READY', 'true');
    assert.strictEqual(res.status, ResultStatus.FAILURE);
    assert.strictEqual(res.error, EngineErrorCode.INVALID_STATE);
  });

  it('3. Rejects undeclared flag when restricted', () => {
    const res = manager.setFlag('UNDECLARED_RANDOM_FLAG', true);
    assert.strictEqual(res.status, ResultStatus.FAILURE);
    assert.strictEqual(res.error, EngineErrorCode.UNKNOWN_FLAG);
  });

  it('4. Asserts required flags via requireFlag and evaluateFlag', () => {
    manager.setFlag('CAN_CONTINUE', true);

    const reqSuccess = manager.requireFlag('CAN_CONTINUE');
    assert.strictEqual(reqSuccess.status, ResultStatus.SUCCESS);
    assert.strictEqual(reqSuccess.data, true);

    const evalSuccess = manager.evaluateFlag('CAN_CONTINUE');
    assert.strictEqual(evalSuccess.status, ResultStatus.SUCCESS);
    assert.strictEqual(evalSuccess.data, true);

    const unsetReq = manager.requireFlag('BLOCKED');
    assert.strictEqual(unsetReq.status, ResultStatus.FAILURE);
    assert.strictEqual(unsetReq.error, EngineErrorCode.INVALID_STATE);
  });

  it('5. Enforces mutually exclusive flag groups', () => {
    manager.defineMutuallyExclusiveGroup(['READY', 'BLOCKED']);

    // Set READY to true
    const res1 = manager.setFlag('READY', true);
    assert.strictEqual(res1.status, ResultStatus.SUCCESS);

    // Attempt to set mutually exclusive BLOCKED to true
    const res2 = manager.setFlag('BLOCKED', true);
    assert.strictEqual(res2.status, ResultStatus.FAILURE);
    assert.strictEqual(res2.error, EngineErrorCode.INVALID_STATE);
    assert.match(res2.message as string, /Conflicting flag update/);

    // Clearing READY allows BLOCKED to be set
    manager.setFlag('READY', false);
    const res3 = manager.setFlag('BLOCKED', true);
    assert.strictEqual(res3.status, ResultStatus.SUCCESS);
  });

  it('6. Derives flag deterministically without mutating permanent state', () => {
    manager.setFlag('READY', true);
    manager.setFlag('CAN_CONTINUE', true);

    const derived = manager.derive('CAN_EXECUTE', (m) => {
      return m.getFlag('READY') === true && m.getFlag('CAN_CONTINUE') === true;
    });

    assert.strictEqual(derived.status, ResultStatus.SUCCESS);
    assert.strictEqual(derived.data, true);

    // Derived flag is not stored in state map unless explicitly set
    assert.strictEqual(manager.getFlag('CAN_EXECUTE'), undefined);
  });
});
