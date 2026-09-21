import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  UniverseClock,
  TimePoint,
  TimeInterval,
  Duration,
  TemporalPositionClassifier,
  createTemporalStatusStateMachine,
  TemporalQueryAPI
} from '../../core/temporal/index.ts';
import { TemporalPosition, TemporalStatus, TemporalRelation } from '../../core/types/temporal.ts';

describe('Phase 3 - Temporal Cycle Integration Scenario', () => {
  it('Executes end-to-end multi-step temporal scenario with clock progression and state transitions', () => {
    // 1. Initialize clock at 2024-01-01T00:00:00Z
    const clock = UniverseClock.create(TimePoint.parse('2024-01-01T00:00:00Z').data!).data!;
    assert.strictEqual(TemporalQueryAPI.getCurrentUniverseTime(clock).toCanonical(), '2024-01-01T00:00:00Z');

    // 2. Define historical event (MEMORY) in PAST
    const historicMemory = TimePoint.parse('2023-12-25T12:00:00Z').data!;
    const pastPos = TemporalPositionClassifier.classify(historicMemory, clock);
    assert.strictEqual(pastPos.position, TemporalPosition.PAST);

    // 3. Define scheduled event (PLAN) in FUTURE
    const scheduledTime = TimePoint.parse('2024-01-02T00:00:00Z').data!;
    const planSM = createTemporalStatusStateMachine(TemporalStatus.PLAN);
    assert.strictEqual(planSM.getCurrentState(), TemporalStatus.PLAN);

    const initialScheduledPos = TemporalPositionClassifier.classify(scheduledTime, clock);
    assert.strictEqual(initialScheduledPos.position, TemporalPosition.FUTURE);

    // 4. Advance clock by 24 hours -> 2024-01-02T00:00:00Z
    const advRes = clock.advanceTime(Duration.fromHours(24), 'Advancing to next daily cycle');
    assert.strictEqual(advRes.status, 'SUCCESS');
    assert.strictEqual(clock.readCurrentTime().toCanonical(), '2024-01-02T00:00:00Z');

    // 5. Verify scheduled event is now PRESENT
    const reachedPos = TemporalPositionClassifier.classify(scheduledTime, clock);
    assert.strictEqual(reachedPos.position, TemporalPosition.PRESENT);

    // 6. Transition status: PLAN -> ACTUAL (ACTUALIZE)
    const transRes = planSM.transition(TemporalStatus.ACTUAL, 'ACTUALIZE');
    assert.strictEqual(transRes.status, 'SUCCESS');
    assert.strictEqual(planSM.getCurrentState(), TemporalStatus.ACTUAL);

    // 7. Advance clock again by 24 hours -> 2024-01-03T00:00:00Z
    clock.advanceTime(Duration.fromHours(24), 'Advancing another day');
    const pastNowPos = TemporalPositionClassifier.classify(scheduledTime, clock);
    assert.strictEqual(pastNowPos.position, TemporalPosition.PAST);

    // 8. Test interval containment during progression
    const interval = TimeInterval.create(
      TimePoint.parse('2024-01-01').data!,
      TimePoint.parse('2024-01-05').data!
    ).data!;
    const rel = TemporalQueryAPI.getTemporalRelation(clock.readCurrentTime(), interval);
    assert.strictEqual(rel, TemporalRelation.DURING);

    // 9. Jump clock to Leap Year boundary: 2024-02-28T23:00:00Z
    clock.setTime(TimePoint.parse('2024-02-28T23:00:00Z').data!, 'Jump to leap year test');
    clock.advanceTime(Duration.fromHours(2), 'Advance across leap day');
    assert.strictEqual(clock.readCurrentTime().toCanonical(), '2024-02-29T01:00:00Z');

    // Advance 24 hours to cross into March
    clock.advanceTime(Duration.fromHours(24), 'Advance across month end');
    assert.strictEqual(clock.readCurrentTime().toCanonical(), '2024-03-01T01:00:00Z');

    // 10. Verify audit trail consistency
    const traces = clock.getHistory();
    assert.ok(traces.length >= 5);
    for (const tr of traces) {
      assert.strictEqual(tr.success, true);
      assert.ok(typeof tr.engineExecutionTimestamp === 'number');
    }
  });
});
