import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  UniverseDate,
  TimePoint,
  TimeInterval,
  Duration,
  UniverseClock,
  TemporalPositionClassifier,
  TemporalRelationEngine,
  TemporalQueryAPI
} from '../../core/temporal/index.ts';
import { TemporalPosition, TemporalRelation, TemporalConstraintType } from '../../core/types/temporal.ts';

describe('Phase 3 Golden Test - Deterministic Temporal Engine Foundation', () => {
  // Golden Fixture 1: Canonical Leap Year Table
  const GOLDEN_LEAP_YEAR_ASSERTIONS = [
    { year: 1900, isLeap: false, daysInFeb: 28 },
    { year: 2000, isLeap: true, daysInFeb: 29 },
    { year: 2020, isLeap: true, daysInFeb: 29 },
    { year: 2021, isLeap: false, daysInFeb: 28 },
    { year: 2024, isLeap: true, daysInFeb: 29 },
    { year: 2100, isLeap: false, daysInFeb: 28 }
  ];

  it('1. Verifies Golden Gregorian Calendar & Leap Year Rules', () => {
    for (const entry of GOLDEN_LEAP_YEAR_ASSERTIONS) {
      assert.strictEqual(
        UniverseDate.isLeapYear(entry.year),
        entry.isLeap,
        `Leap year rule failed for year ${entry.year}`
      );
      assert.strictEqual(
        UniverseDate.daysInMonth(entry.year, 2),
        entry.daysInFeb,
        `Days in Feb mismatch for year ${entry.year}`
      );
    }
  });

  // Golden Fixture 2: Boundary Crossing Assertions
  const GOLDEN_BOUNDARY_TRANSITIONS = [
    { from: '2023-12-31', advanceDays: 1, expected: '2024-01-01' },
    { from: '2024-02-28', advanceDays: 1, expected: '2024-02-29' },
    { from: '2024-02-29', advanceDays: 1, expected: '2024-03-01' },
    { from: '2023-02-28', advanceDays: 1, expected: '2023-03-01' },
    { from: '2024-04-30', advanceDays: 1, expected: '2024-05-01' }
  ];

  it('2. Verifies Golden Date Arithmetic and Boundary Transitions', () => {
    for (const transition of GOLDEN_BOUNDARY_TRANSITIONS) {
      const date = UniverseDate.parse(transition.from).data!;
      const advanced = date.advanceDays(transition.advanceDays);
      assert.strictEqual(
        advanced.toCanonical(),
        transition.expected,
        `Advance failed for ${transition.from} + ${transition.advanceDays} days`
      );
    }
  });

  // Golden Fixture 3: Frozen Clock and Position Evaluations
  it('3. Verifies Frozen Temporal Position Assertions', () => {
    const fixedClock = UniverseClock.create(TimePoint.parse('2024-07-04T12:00:00Z').data!).data!;

    const pastPoint = TimePoint.parse('2024-07-04T11:59:59Z').data!;
    const presentPoint = TimePoint.parse('2024-07-04T12:00:00Z').data!;
    const futurePoint = TimePoint.parse('2024-07-04T12:00:01Z').data!;

    assert.strictEqual(
      TemporalPositionClassifier.classify(pastPoint, fixedClock).position,
      TemporalPosition.PAST
    );
    assert.strictEqual(
      TemporalPositionClassifier.classify(presentPoint, fixedClock).position,
      TemporalPosition.PRESENT
    );
    assert.strictEqual(
      TemporalPositionClassifier.classify(futurePoint, fixedClock).position,
      TemporalPosition.FUTURE
    );
  });

  // Golden Fixture 4: Frozen Temporal Relations
  it('4. Verifies Frozen Temporal Relations Assertions', () => {
    const intA = TimeInterval.create(
      TimePoint.parse('2024-01-01').data!,
      TimePoint.parse('2024-01-10').data!
    ).data!;
    const intB = TimeInterval.create(
      TimePoint.parse('2024-01-15').data!,
      TimePoint.parse('2024-01-20').data!
    ).data!;
    const intC = TimeInterval.create(
      TimePoint.parse('2024-01-05').data!,
      TimePoint.parse('2024-01-15').data!
    ).data!;

    assert.strictEqual(TemporalRelationEngine.compareIntervals(intA, intB), TemporalRelation.BEFORE);
    assert.strictEqual(TemporalRelationEngine.compareIntervals(intB, intA), TemporalRelation.AFTER);
    assert.strictEqual(TemporalRelationEngine.compareIntervals(intA, intC), TemporalRelation.OVERLAPS);
    assert.strictEqual(TemporalRelationEngine.compareIntervals(intA, intA), TemporalRelation.SAME_TIME);
  });

  // Golden Fixture 5: Constraint Evaluation
  it('5. Verifies Golden Constraint API', () => {
    const clock = UniverseClock.create(TimePoint.parse('2024-06-01T00:00:00Z').data!).data!;

    const resBefore = TemporalQueryAPI.validateTemporalConstraint(
      {
        type: TemporalConstraintType.BEFORE,
        target: '2024-05-01',
        reference: '2024-06-01'
      },
      { clock }
    );
    assert.strictEqual(resBefore.satisfied, true);
    assert.strictEqual(resBefore.status, 'VALID');

    const resConflict = TemporalQueryAPI.validateTemporalConstraint(
      {
        type: TemporalConstraintType.BEFORE,
        target: '2024-07-01',
        reference: '2024-06-01'
      },
      { clock }
    );
    assert.strictEqual(resConflict.satisfied, false);
    assert.strictEqual(resConflict.status, 'CONFLICT');
  });
});
