import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { TimeInterval } from '../../../core/temporal/time-interval.ts';
import { TemporalRelationEngine } from '../../../core/temporal/relations.ts';
import { TemporalRelation } from '../../../core/types/temporal.ts';

describe('Phase 3 - TemporalRelationEngine Unit Tests', () => {
  it('1. Compares TimePoints: BEFORE, AFTER, SAME_TIME, UNKNOWN', () => {
    const t1 = TimePoint.parse('2024-01-01T10:00:00Z').data!;
    const t2 = TimePoint.parse('2024-01-01T12:00:00Z').data!;
    const t3 = TimePoint.parse('2024-01-01T10:00:00Z').data!;
    const unk = TimePoint.unknown();

    assert.strictEqual(
      TemporalRelationEngine.compareTimePoints(t1, t2),
      TemporalRelation.BEFORE
    );
    assert.strictEqual(
      TemporalRelationEngine.compareTimePoints(t2, t1),
      TemporalRelation.AFTER
    );
    assert.strictEqual(
      TemporalRelationEngine.compareTimePoints(t1, t3),
      TemporalRelation.SAME_TIME
    );
    assert.strictEqual(
      TemporalRelationEngine.compareTimePoints(t1, unk),
      TemporalRelation.UNKNOWN
    );
  });

  it('2. Compares TimePoint to TimeInterval: BEFORE, AFTER, DURING, UNKNOWN', () => {
    const interval = TimeInterval.create(
      TimePoint.parse('2024-01-10').data!,
      TimePoint.parse('2024-01-20').data!
    ).data!;

    const beforePt = TimePoint.parse('2024-01-05').data!;
    const duringPt = TimePoint.parse('2024-01-15').data!;
    const afterPt = TimePoint.parse('2024-01-25').data!;

    assert.strictEqual(
      TemporalRelationEngine.comparePointToInterval(beforePt, interval),
      TemporalRelation.BEFORE
    );
    assert.strictEqual(
      TemporalRelationEngine.comparePointToInterval(duringPt, interval),
      TemporalRelation.DURING
    );
    assert.strictEqual(
      TemporalRelationEngine.comparePointToInterval(afterPt, interval),
      TemporalRelation.AFTER
    );
  });

  it('3. Compares TimeIntervals: BEFORE, AFTER, SAME_TIME, CONTAINS, DURING, OVERLAPS', () => {
    const intA = TimeInterval.create(
      TimePoint.parse('2024-01-01').data!,
      TimePoint.parse('2024-01-10').data!
    ).data!;

    const intB = TimeInterval.create(
      TimePoint.parse('2024-01-15').data!,
      TimePoint.parse('2024-01-20').data!
    ).data!;

    // A is before B
    assert.strictEqual(
      TemporalRelationEngine.compareIntervals(intA, intB),
      TemporalRelation.BEFORE
    );
    // B is after A
    assert.strictEqual(
      TemporalRelationEngine.compareIntervals(intB, intA),
      TemporalRelation.AFTER
    );

    // Identical intervals -> SAME_TIME
    assert.strictEqual(
      TemporalRelationEngine.compareIntervals(intA, intA),
      TemporalRelation.SAME_TIME
    );

    // Enclosing interval -> CONTAINS
    const bigInt = TimeInterval.create(
      TimePoint.parse('2024-01-01').data!,
      TimePoint.parse('2024-01-31').data!
    ).data!;
    const smallInt = TimeInterval.create(
      TimePoint.parse('2024-01-05').data!,
      TimePoint.parse('2024-01-15').data!
    ).data!;

    assert.strictEqual(
      TemporalRelationEngine.compareIntervals(bigInt, smallInt),
      TemporalRelation.CONTAINS
    );
    assert.strictEqual(
      TemporalRelationEngine.compareIntervals(smallInt, bigInt),
      TemporalRelation.DURING
    );

    // Overlapping intervals
    const overlap1 = TimeInterval.create(
      TimePoint.parse('2024-01-01').data!,
      TimePoint.parse('2024-01-10').data!
    ).data!;
    const overlap2 = TimeInterval.create(
      TimePoint.parse('2024-01-05').data!,
      TimePoint.parse('2024-01-15').data!
    ).data!;

    assert.strictEqual(
      TemporalRelationEngine.compareIntervals(overlap1, overlap2),
      TemporalRelation.OVERLAPS
    );
  });
});
