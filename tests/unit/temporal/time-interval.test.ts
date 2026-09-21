import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { TimeInterval } from '../../../core/temporal/time-interval.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 3 - TimeInterval Unit Tests', () => {
  it('1. Creates valid closed intervals', () => {
    const start = TimePoint.parse('2024-01-01').data!;
    const end = TimePoint.parse('2024-01-31').data!;
    const res = TimeInterval.create(start, end);

    assert.strictEqual(res.status, 'SUCCESS');
    assert.ok(res.data);
    assert.strictEqual(res.data.isOpenEnded(), false);
    assert.strictEqual(res.data.isPointInterval(), false);
  });

  it('2. Strictly rejects reversed intervals without auto-repair', () => {
    const start = TimePoint.parse('2024-02-01').data!;
    const end = TimePoint.parse('2024-01-01').data!;
    const res = TimeInterval.create(start, end);

    assert.strictEqual(res.status, 'FAILURE');
    assert.strictEqual(res.error, EngineErrorCode.INVALID_INTERVAL);
  });

  it('3. Supports open-ended intervals', () => {
    const start = TimePoint.parse('2024-05-01').data!;
    const openEnd = TimeInterval.fromStart(start);
    assert.strictEqual(openEnd.status, 'SUCCESS');
    assert.strictEqual(openEnd.data?.isOpenEnded(), true);

    const end = TimePoint.parse('2024-12-31').data!;
    const openStart = TimeInterval.toEnd(end);
    assert.strictEqual(openStart.status, 'SUCCESS');
    assert.strictEqual(openStart.data?.isOpenEnded(), true);
  });

  it('4. Supports degenerate point intervals', () => {
    const pt = TimePoint.parse('2024-06-15T12:00:00Z').data!;
    const ptInterval = TimeInterval.point(pt);
    assert.strictEqual(ptInterval.status, 'SUCCESS');
    assert.strictEqual(ptInterval.data?.isPointInterval(), true);
    assert.strictEqual(ptInterval.data?.isOpenEnded(), false);
  });

  it('5. Evaluates containsPoint deterministically', () => {
    const start = TimePoint.parse('2024-01-01').data!;
    const end = TimePoint.parse('2024-01-31').data!;
    const interval = TimeInterval.create(start, end).data!;

    const inside = TimePoint.parse('2024-01-15').data!;
    const before = TimePoint.parse('2023-12-31').data!;
    const after = TimePoint.parse('2024-02-01').data!;
    const unk = TimePoint.unknown();

    assert.strictEqual(interval.containsPoint(inside), true);
    assert.strictEqual(interval.containsPoint(before), false);
    assert.strictEqual(interval.containsPoint(after), false);
    assert.strictEqual(interval.containsPoint(unk), null);
  });
});
