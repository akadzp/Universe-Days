import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { TimeInterval } from '../../../core/temporal/time-interval.ts';
import { UniverseClock } from '../../../core/temporal/clock.ts';
import { TemporalPositionClassifier } from '../../../core/temporal/position.ts';
import { TemporalPosition } from '../../../core/types/temporal.ts';

describe('Phase 3 - TemporalPosition Unit Tests', () => {
  const clock = UniverseClock.create(TimePoint.parse('2024-06-01T12:00:00Z').data!).data!;

  it('1. Classifies TimePoints into PAST, PRESENT, FUTURE', () => {
    const pastPt = TimePoint.parse('2024-05-31T23:59:59Z').data!;
    const presentPt = TimePoint.parse('2024-06-01T12:00:00Z').data!;
    const futurePt = TimePoint.parse('2024-06-02T00:00:00Z').data!;

    assert.strictEqual(
      TemporalPositionClassifier.classify(pastPt, clock).position,
      TemporalPosition.PAST
    );
    assert.strictEqual(
      TemporalPositionClassifier.classify(presentPt, clock).position,
      TemporalPosition.PRESENT
    );
    assert.strictEqual(
      TemporalPositionClassifier.classify(futurePt, clock).position,
      TemporalPosition.FUTURE
    );
  });

  it('2. Classifies TimeIntervals relative to reference clock', () => {
    // Entirely past interval
    const pastInt = TimeInterval.create(
      TimePoint.parse('2024-01-01').data!,
      TimePoint.parse('2024-01-31').data!
    ).data!;
    assert.strictEqual(
      TemporalPositionClassifier.classify(pastInt, clock).position,
      TemporalPosition.PAST
    );

    // Interval spanning across current time
    const presentInt = TimeInterval.create(
      TimePoint.parse('2024-05-01').data!,
      TimePoint.parse('2024-07-01').data!
    ).data!;
    assert.strictEqual(
      TemporalPositionClassifier.classify(presentInt, clock).position,
      TemporalPosition.PRESENT
    );

    // Entirely future interval
    const futureInt = TimeInterval.create(
      TimePoint.parse('2024-08-01').data!,
      TimePoint.parse('2024-08-31').data!
    ).data!;
    assert.strictEqual(
      TemporalPositionClassifier.classify(futureInt, clock).position,
      TemporalPosition.FUTURE
    );
  });

  it('3. Returns UNKNOWN when target or reference is indeterminate', () => {
    const unk = TimePoint.unknown();
    assert.strictEqual(
      TemporalPositionClassifier.classify(unk, clock).position,
      TemporalPosition.UNKNOWN
    );
  });
});
