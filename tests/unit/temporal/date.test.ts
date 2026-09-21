import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UniverseDate } from '../../../core/temporal/date.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 3 - UniverseDate Unit Tests', () => {
  it('1. Creates valid calendar dates', () => {
    const res = UniverseDate.create(2024, 5, 12);
    assert.strictEqual(res.status, 'SUCCESS');
    assert.ok(res.data);
    assert.strictEqual(res.data.year, 2024);
    assert.strictEqual(res.data.month, 5);
    assert.strictEqual(res.data.day, 12);
    assert.strictEqual(res.data.toCanonical(), '2024-05-12');
  });

  it('2. Rejects invalid calendar dates', () => {
    // April only has 30 days
    const apr31 = UniverseDate.create(2024, 4, 31);
    assert.strictEqual(apr31.status, 'FAILURE');
    assert.strictEqual(apr31.error, EngineErrorCode.INVALID_DATE);

    // Month out of range
    const month13 = UniverseDate.create(2024, 13, 1);
    assert.strictEqual(month13.status, 'FAILURE');

    // Day 0
    const dayZero = UniverseDate.create(2024, 1, 0);
    assert.strictEqual(dayZero.status, 'FAILURE');
  });

  it('3. Enforces Gregorian leap year rules deterministically', () => {
    // 2000 is leap (divisible by 400)
    assert.strictEqual(UniverseDate.isLeapYear(2000), true);
    // 1900 is NOT leap (divisible by 100 but not 400)
    assert.strictEqual(UniverseDate.isLeapYear(1900), false);
    // 2024 is leap (divisible by 4)
    assert.strictEqual(UniverseDate.isLeapYear(2024), true);
    // 2023 is NOT leap
    assert.strictEqual(UniverseDate.isLeapYear(2023), false);
    // 2100 is NOT leap
    assert.strictEqual(UniverseDate.isLeapYear(2100), false);
  });

  it('4. Handles Feb 29 strictly according to leap year rules', () => {
    const leapDay2024 = UniverseDate.create(2024, 2, 29);
    assert.strictEqual(leapDay2024.status, 'SUCCESS');

    const invalidLeapDay2023 = UniverseDate.create(2023, 2, 29);
    assert.strictEqual(invalidLeapDay2023.status, 'FAILURE');

    const invalidLeapDay1900 = UniverseDate.create(1900, 2, 29);
    assert.strictEqual(invalidLeapDay1900.status, 'FAILURE');
  });

  it('5. Advances days crossing month boundaries correctly', () => {
    const jan30 = UniverseDate.create(2024, 1, 30).data!;
    const feb1 = jan30.advanceDays(2);
    assert.strictEqual(feb1.toCanonical(), '2024-02-01');

    // Leap year Feb 28 + 1 -> Feb 29
    const feb28_2024 = UniverseDate.create(2024, 2, 28).data!;
    assert.strictEqual(feb28_2024.advanceDays(1).toCanonical(), '2024-02-29');
    assert.strictEqual(feb28_2024.advanceDays(2).toCanonical(), '2024-03-01');

    // Non-leap year Feb 28 + 1 -> Mar 01
    const feb28_2023 = UniverseDate.create(2023, 2, 28).data!;
    assert.strictEqual(feb28_2023.advanceDays(1).toCanonical(), '2023-03-01');
  });

  it('6. Advances days crossing year boundaries correctly', () => {
    const dec31 = UniverseDate.create(2023, 12, 31).data!;
    const jan1 = dec31.advanceDays(1);
    assert.strictEqual(jan1.toCanonical(), '2024-01-01');
  });

  it('7. Parses canonical ISO YYYY-MM-DD string and rejects invalid formats', () => {
    const parsed = UniverseDate.parse('2024-11-25');
    assert.strictEqual(parsed.status, 'SUCCESS');
    assert.strictEqual(parsed.data?.toCanonical(), '2024-11-25');

    // Rejects slash format
    const slash = UniverseDate.parse('2024/11/25');
    assert.strictEqual(slash.status, 'FAILURE');

    // Rejects invalid calendar day
    const badDay = UniverseDate.parse('2024-02-30');
    assert.strictEqual(badDay.status, 'FAILURE');
  });

  it('8. Compares and calculates day differences deterministically', () => {
    const d1 = UniverseDate.parse('2024-01-01').data!;
    const d2 = UniverseDate.parse('2024-01-10').data!;
    assert.strictEqual(d1.compare(d2), -1);
    assert.strictEqual(d2.compare(d1), 1);
    assert.strictEqual(d1.compare(d1), 0);
    assert.strictEqual(d2.diffDays(d1), 9);
    assert.strictEqual(d1.diffDays(d2), -9);
  });
});
