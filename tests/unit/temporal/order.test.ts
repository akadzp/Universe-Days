import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { TimeInterval } from '../../../core/temporal/time-interval.ts';
import { TemporalOrderEngine } from '../../../core/temporal/order.ts';

describe('Phase 3 - TemporalOrderEngine Unit Tests', () => {
  it('1. Sorts items chronologically', () => {
    const items = [
      { id: 'ev3', temporal: TimePoint.parse('2024-03-01').data! },
      { id: 'ev1', temporal: TimePoint.parse('2024-01-01').data! },
      { id: 'ev2', temporal: TimePoint.parse('2024-02-01').data! }
    ];

    const result = TemporalOrderEngine.order(items);
    assert.strictEqual(result.isFullyOrdered, true);
    assert.deepStrictEqual(
      result.ordered.map(i => i.id),
      ['ev1', 'ev2', 'ev3']
    );
  });

  it('2. Groups simultaneous events without loss', () => {
    const items = [
      { id: 'a', temporal: TimePoint.parse('2024-01-01T10:00:00Z').data! },
      { id: 'b', temporal: TimePoint.parse('2024-01-01T10:00:00Z').data! },
      { id: 'c', temporal: TimePoint.parse('2024-01-02T10:00:00Z').data! }
    ];

    const result = TemporalOrderEngine.order(items);
    assert.strictEqual(result.simultaneousGroups.length, 1);
    assert.strictEqual(result.simultaneousGroups[0].length, 2);
    assert.deepStrictEqual(
      result.simultaneousGroups[0].map(i => i.id),
      ['a', 'b']
    );
  });

  it('3. Separates unknown/unresolvable items without guessing', () => {
    const items = [
      { id: 'known1', temporal: TimePoint.parse('2024-01-01').data! },
      { id: 'unknown1', temporal: TimePoint.unknown() },
      { id: 'known2', temporal: TimePoint.parse('2024-05-01').data! }
    ];

    const result = TemporalOrderEngine.order(items);
    assert.strictEqual(result.isFullyOrdered, false);
    assert.strictEqual(result.unresolved.length, 1);
    assert.strictEqual(result.unresolved[0].id, 'unknown1');
    assert.strictEqual(result.ordered.length, 2);
  });
});
