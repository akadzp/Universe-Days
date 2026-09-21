import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { TimeInterval } from '../../../core/temporal/time-interval.ts';
import { TemporalConsistencyValidator } from '../../../core/temporal/consistency.ts';
import { TemporalRelation } from '../../../core/types/temporal.ts';

describe('Phase 3 - TemporalConsistencyValidator Unit Tests', () => {
  it('1. Validates consistent TimeInterval and confirms no auto-repair', () => {
    const valid = TimeInterval.create(
      TimePoint.parse('2024-01-01').data!,
      TimePoint.parse('2024-01-31').data!
    ).data!;

    const result = TemporalConsistencyValidator.validateInterval(valid);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.status, 'VALID');
    assert.strictEqual(result.findings.length, 0);
    assert.strictEqual(result.repaired, false); // Strict invariant
  });

  it('2. Flags contradiction when actual relation opposes dependency assertion', () => {
    const tpAlpha = TimePoint.parse('2024-05-10').data!;
    const tpBeta = TimePoint.parse('2024-05-01').data!; // Alpha is AFTER Beta

    const dep = {
      sourceId: 'alpha',
      targetId: 'beta',
      relation: TemporalRelation.BEFORE // Contradiction!
    };

    const res = TemporalConsistencyValidator.validateDependencies([dep], {
      alpha: tpAlpha,
      beta: tpBeta
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, 'CONFLICT');
    assert.strictEqual(res.findings.length, 1);
    assert.strictEqual(res.findings[0].code, 'TEMPORAL_CONTRADICTION');
    assert.strictEqual(res.repaired, false); // Strict invariant
  });

  it('3. Flags missing entities gracefully', () => {
    const dep = {
      sourceId: 'alpha',
      targetId: 'missingEntity',
      relation: TemporalRelation.BEFORE
    };

    const res = TemporalConsistencyValidator.validateDependencies([dep], {
      alpha: TimePoint.parse('2024-01-01').data!
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.status, 'BLOCKED');
    assert.strictEqual(res.findings[0].code, 'MISSING_TEMPORAL_ENTITY');
  });
});
