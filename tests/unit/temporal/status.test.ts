import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TemporalStatusManager,
  createTemporalStatusStateMachine
} from '../../../core/temporal/status.ts';
import { TemporalStatus } from '../../../core/types/temporal.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 3 - TemporalStatus Unit Tests', () => {
  it('1. Recognizes all 9 explicit TemporalStatus values', () => {
    const statuses = [
      TemporalStatus.ACTUAL,
      TemporalStatus.MEMORY,
      TemporalStatus.REPORT,
      TemporalStatus.IMAGINED,
      TemporalStatus.HYPOTHETICAL,
      TemporalStatus.PLAN,
      TemporalStatus.PREDICTION,
      TemporalStatus.POSSIBILITY,
      TemporalStatus.UNKNOWN
    ];

    for (const st of statuses) {
      assert.strictEqual(TemporalStatusManager.isValidStatus(st), true);
      const parsed = TemporalStatusManager.parseStatus(st);
      assert.strictEqual(parsed.status, 'SUCCESS');
      assert.strictEqual(parsed.data, st);
    }
  });

  it('2. Rejects invalid status strings', () => {
    const res = TemporalStatusManager.parseStatus('FICTION');
    assert.strictEqual(res.status, 'FAILURE');
    assert.strictEqual(res.error, EngineErrorCode.UNKNOWN_TEMPORAL_STATUS);
  });

  it('3. Validates legal and illegal status transitions without auto-transitioning', () => {
    // Valid: PLAN -> ACTUAL
    const validPlanToActual = TemporalStatusManager.validateTransition(
      TemporalStatus.PLAN,
      TemporalStatus.ACTUAL
    );
    assert.strictEqual(validPlanToActual.status, 'SUCCESS');

    // Valid: PREDICTION -> ACTUAL
    const validPredToActual = TemporalStatusManager.validateTransition(
      TemporalStatus.PREDICTION,
      TemporalStatus.ACTUAL
    );
    assert.strictEqual(validPredToActual.status, 'SUCCESS');

    // Invalid: ACTUAL -> PLAN (cannot un-actualize an event back into a plan)
    const invalidActualToPlan = TemporalStatusManager.validateTransition(
      TemporalStatus.ACTUAL,
      TemporalStatus.PLAN
    );
    assert.strictEqual(invalidActualToPlan.status, 'FAILURE');
    assert.strictEqual(invalidActualToPlan.error, EngineErrorCode.INVALID_TRANSITION);
  });

  it('4. Integrates seamlessly with GenericStateMachine', () => {
    const sm = createTemporalStatusStateMachine(TemporalStatus.PLAN);
    assert.strictEqual(sm.getCurrentState(), TemporalStatus.PLAN);

    // Transition PLAN -> ACTUAL via 'ACTUALIZE'
    const res1 = sm.transition(TemporalStatus.ACTUAL, 'ACTUALIZE');
    assert.strictEqual(res1.status, 'SUCCESS');
    assert.strictEqual(sm.getCurrentState(), TemporalStatus.ACTUAL);

    // Disallowed transition ACTUAL -> PLAN
    const res2 = sm.transition(TemporalStatus.PLAN);
    assert.strictEqual(res2.status, 'FAILURE');
    assert.strictEqual(sm.getCurrentState(), TemporalStatus.ACTUAL); // State remains intact
  });
});
