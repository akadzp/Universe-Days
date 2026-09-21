import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { UniverseClock } from '../../../core/temporal/clock.ts';
import { Duration } from '../../../core/temporal/duration.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 3 - UniverseClock Unit Tests', () => {
  it('1. Initializes clock with validated Universe Time', () => {
    const initTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
    const clockRes = UniverseClock.create(initTime);
    assert.strictEqual(clockRes.status, 'SUCCESS');
    assert.ok(clockRes.data);
    assert.strictEqual(clockRes.data.readCurrentTime().toCanonical(), '2024-01-01T00:00:00Z');
  });

  it('2. Pure read operation never mutates clock', () => {
    const initTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
    const clock = UniverseClock.create(initTime).data!;

    const read1 = clock.readCurrentTime();
    const read2 = clock.readCurrentTime();

    assert.strictEqual(read1.toCanonical(), read2.toCanonical());
    // Initial trace only
    assert.strictEqual(clock.getTraceCount(), 1);
  });

  it('3. Advances time forward explicitly crossing month and leap year boundaries', () => {
    const initTime = TimePoint.parse('2024-02-28T12:00:00Z').data!;
    const clock = UniverseClock.create(initTime).data!;

    // Advance 1 day: should be 2024-02-29 (leap year)
    const adv1 = clock.advanceTime(Duration.fromDays(1), 'Daily cycle step');
    assert.strictEqual(adv1.status, 'SUCCESS');
    assert.strictEqual(clock.readCurrentTime().toCanonical(), '2024-02-29T12:00:00Z');

    // Advance 1 more day: should cross into 2024-03-01
    const adv2 = clock.advanceTime(Duration.fromDays(1), 'Daily cycle step');
    assert.strictEqual(adv2.status, 'SUCCESS');
    assert.strictEqual(clock.readCurrentTime().toCanonical(), '2024-03-01T12:00:00Z');
  });

  it('4. Explicitly separates Universe Time from Engine Time', () => {
    const initTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
    const clock = UniverseClock.create(initTime).data!;

    clock.advanceTime(Duration.fromHours(4), 'Routine advance');
    const history = clock.getHistory();

    assert.strictEqual(history.length, 2);
    const trace = history[1];

    // Engine Execution Timestamp is a real timestamp (Date.now())
    assert.ok(typeof trace.engineExecutionTimestamp === 'number');
    assert.ok(trace.engineExecutionTimestamp > 1700000000000); // Year 2023+ epoch

    // Universe Time is strictly the Universe's canonical timeline
    assert.strictEqual(trace.previousUniverseTime, '2024-01-01T00:00:00Z');
    assert.strictEqual(trace.newUniverseTime, '2024-01-01T04:00:00Z');
  });

  it('5. Rejects retrograde temporal movement unless explicitly allowed', () => {
    const initTime = TimePoint.parse('2024-05-10T12:00:00Z').data!;
    const clock = UniverseClock.create(initTime).data!;

    const earlierTime = TimePoint.parse('2024-05-01T00:00:00Z').data!;
    const setRes = clock.setTime(earlierTime, 'Attempting rewind', false);

    assert.strictEqual(setRes.status, 'FAILURE');
    assert.strictEqual(setRes.error, EngineErrorCode.CLOCK_RETROGRADE_REJECTED);
    // Clock remains unchanged
    assert.strictEqual(clock.readCurrentTime().toCanonical(), '2024-05-10T12:00:00Z');

    // Explicit override allowed
    const overrideRes = clock.setTime(earlierTime, 'Authorized timeline rewind', true);
    assert.strictEqual(overrideRes.status, 'SUCCESS');
    assert.strictEqual(clock.readCurrentTime().toCanonical(), '2024-05-01T00:00:00Z');
  });

  it('6. Rejects initializing or setting clock with unknown time', () => {
    const unk = TimePoint.unknown();
    const initRes = UniverseClock.create(unk);
    assert.strictEqual(initRes.status, 'FAILURE');

    const validClock = UniverseClock.create(TimePoint.parse('2024-01-01').data!).data!;
    const setRes = validClock.setTime(unk);
    assert.strictEqual(setRes.status, 'FAILURE');
  });
});
