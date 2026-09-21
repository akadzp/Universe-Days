import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UniverseDate } from '../../../core/temporal/date.ts';
import { TimePoint } from '../../../core/temporal/time-point.ts';
import { Duration } from '../../../core/temporal/duration.ts';
import { TimePrecision } from '../../../core/types/temporal.ts';

describe('Phase 3 - TimePoint Unit Tests', () => {
  it('1. Preserves DATE precision without coercion to DATETIME', () => {
    const d = UniverseDate.create(2024, 6, 15).data!;
    const tp = TimePoint.fromDate(d);
    assert.strictEqual(tp.precision, TimePrecision.DATE);
    assert.strictEqual(tp.timeOfDay, undefined);
    assert.strictEqual(tp.toCanonical(), '2024-06-15');
  });

  it('2. Supports DATETIME precision with exact time of day', () => {
    const d = UniverseDate.create(2024, 6, 15).data!;
    const res = TimePoint.fromDateTime(d, { hour: 14, minute: 30, second: 45, millisecond: 120 });
    assert.strictEqual(res.status, 'SUCCESS');
    assert.ok(res.data);
    assert.strictEqual(res.data.precision, TimePrecision.DATETIME);
    assert.strictEqual(res.data.timeOfDay?.hour, 14);
    assert.strictEqual(res.data.toCanonical(), '2024-06-15T14:30:45.120Z');
  });

  it('3. Rejects invalid time-of-day values', () => {
    const d = UniverseDate.create(2024, 6, 15).data!;
    // Hour 24 is illegal in 0-23
    const badHour = TimePoint.fromDateTime(d, { hour: 24, minute: 0, second: 0 });
    assert.strictEqual(badHour.status, 'FAILURE');

    // Minute 60 is illegal in 0-59
    const badMin = TimePoint.fromDateTime(d, { hour: 12, minute: 60, second: 0 });
    assert.strictEqual(badMin.status, 'FAILURE');

    // Second negative
    const badSec = TimePoint.fromDateTime(d, { hour: 12, minute: 0, second: -1 });
    assert.strictEqual(badSec.status, 'FAILURE');
  });

  it('4. Parses canonical string representations and round-trips correctly', () => {
    const parsedDate = TimePoint.parse('2024-08-20');
    assert.strictEqual(parsedDate.status, 'SUCCESS');
    assert.strictEqual(parsedDate.data?.precision, TimePrecision.DATE);
    assert.strictEqual(parsedDate.data?.toCanonical(), '2024-08-20');

    const parsedDateTime = TimePoint.parse('2024-08-20T10:15:30Z');
    assert.strictEqual(parsedDateTime.status, 'SUCCESS');
    assert.strictEqual(parsedDateTime.data?.precision, TimePrecision.DATETIME);
    assert.strictEqual(parsedDateTime.data?.toCanonical(), '2024-08-20T10:15:30Z');
  });

  it('5. Compares TimePoints deterministically', () => {
    const tp1 = TimePoint.parse('2024-01-01T10:00:00Z').data!;
    const tp2 = TimePoint.parse('2024-01-01T11:00:00Z').data!;
    const tp3 = TimePoint.parse('2024-01-02T09:00:00Z').data!;

    assert.strictEqual(tp1.isBefore(tp2), true);
    assert.strictEqual(tp2.isAfter(tp1), true);
    assert.strictEqual(tp2.isBefore(tp3), true);
    assert.strictEqual(tp1.equals(tp1), true);
  });

  it('6. Explicitly represents and preserves UNKNOWN time points', () => {
    const unk = TimePoint.unknown();
    assert.strictEqual(unk.isUnknown, true);
    assert.strictEqual(unk.precision, TimePrecision.UNKNOWN);
    assert.strictEqual(unk.toCanonical(), 'UNKNOWN');

    const known = TimePoint.parse('2024-01-01').data!;
    assert.strictEqual(unk.compare(known), null);
    assert.strictEqual(unk.equals(known), false);
  });

  it('7. Advances TimePoint by duration rolling through seconds, minutes, hours, and days', () => {
    const tp = TimePoint.parse('2024-02-28T23:59:30Z').data!;
    const dur = Duration.fromSeconds(60); // 1 minute: crosses to 00:00:30 and advances day to 2024-02-29 (leap)
    const advanced = tp.advance(dur);
    assert.strictEqual(advanced.toCanonical(), '2024-02-29T00:00:30Z');
  });
});
