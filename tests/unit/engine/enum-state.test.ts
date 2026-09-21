import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EnumStateManager } from '../../../core/engine/state/enum-state.ts';
import { ResultStatus } from '../../../core/types/result.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 2 - Enum State Architecture', () => {
  let manager: EnumStateManager;

  beforeEach(() => {
    manager = new EnumStateManager();
    manager.registerEnum({
      name: 'TASK_LIFECYCLE',
      allowedValues: ['PENDING', 'ROUTED', 'EVALUATING', 'COMPLETED', 'FAILED'],
      defaultValue: 'PENDING',
      allowedTransitions: {
        PENDING: ['ROUTED', 'FAILED'],
        ROUTED: ['EVALUATING', 'FAILED'],
        EVALUATING: ['COMPLETED', 'FAILED'],
        COMPLETED: [],
        FAILED: ['PENDING']
      }
    });
  });

  it('1. Initializes enum with default value', () => {
    assert.strictEqual(manager.getEnum('TASK_LIFECYCLE'), 'PENDING');
  });

  it('2. Sets valid enum value and rejects unknown enum value', () => {
    const valid = manager.setEnum('TASK_LIFECYCLE', 'ROUTED');
    assert.strictEqual(valid.status, ResultStatus.SUCCESS);
    assert.strictEqual(manager.getEnum('TASK_LIFECYCLE'), 'ROUTED');

    const invalid = manager.setEnum('TASK_LIFECYCLE', 'ARBITRARY_CUSTOM_VALUE');
    assert.strictEqual(invalid.status, ResultStatus.FAILURE);
    assert.strictEqual(invalid.error, EngineErrorCode.UNKNOWN_ENUM_VALUE);
  });

  it('3. Enforces valid enum transitions', () => {
    // PENDING -> ROUTED is allowed
    const t1 = manager.transitionEnum('TASK_LIFECYCLE', 'ROUTED');
    assert.strictEqual(t1.status, ResultStatus.SUCCESS);
    assert.strictEqual(manager.getEnum('TASK_LIFECYCLE'), 'ROUTED');

    // ROUTED -> COMPLETED is NOT allowed directly (must go through EVALUATING)
    const t2 = manager.transitionEnum('TASK_LIFECYCLE', 'COMPLETED');
    assert.strictEqual(t2.status, ResultStatus.FAILURE);
    assert.strictEqual(t2.error, EngineErrorCode.INVALID_TRANSITION);
    // State remains unchanged
    assert.strictEqual(manager.getEnum('TASK_LIFECYCLE'), 'ROUTED');
  });

  it('4. Rejects duplicate values during enum definition', () => {
    const res = manager.registerEnum({
      name: 'INVALID_ENUM',
      allowedValues: ['ONE', 'TWO', 'ONE']
    });
    assert.strictEqual(res.status, ResultStatus.FAILURE);
    assert.strictEqual(res.error, EngineErrorCode.INVALID_STATE);
  });
});
