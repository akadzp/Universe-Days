import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  UnresolvedConditionRegistry,
  UnresolvedStatus,
  createUnresolvedCondition,
  PeriodInitializer,
  PeriodFinalizer,
  TimePoint
} from '../../../core/universe/daily/index.ts';

describe('Phase 5 - Unresolved Conditions Unit Tests (Section 60)', () => {
  it('1. Creates unresolved condition and carries it forward without automatic deletion', () => {
    const reg = new UnresolvedConditionRegistry();
    const cond = createUnresolvedCondition({
      unresolvedId: 'UNRES-01',
      sourceReference: 'EVENT-42',
      temporalReference: '2024-01-01T00:00:00Z',
      reason: 'Missing evidence'
    });
    reg.register(cond);

    assert.strictEqual(reg.get('UNRES-01')?.lifecycleStatus, UnresolvedStatus.UNRESOLVED);
    assert.strictEqual(reg.getOpenConditions().length, 1);
  });

  it('2. Unresolved conditions survive period boundaries into NextPeriodContext', () => {
    const startTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
    const unres = createUnresolvedCondition({
      unresolvedId: 'UNRES-SURVIVOR',
      sourceReference: 'EVENT-BOUNDARY',
      temporalReference: startTime.toCanonical(),
      reason: 'Awaiting laboratory inspection'
    });

    // Initialize period with unresolved condition
    const initRes = PeriodInitializer.initialize({
      startTime,
      previousUnresolvedConditions: [unres]
    });
    assert.strictEqual(initRes.success, true);
    const ctx = initRes.data!;

    assert.strictEqual(ctx.unresolvedConditions.length, 1);

    // Finalize period
    const finalRes = PeriodFinalizer.finalize(ctx);
    assert.strictEqual(finalRes.success, true);

    // Survives in NextPeriodContext!
    assert.strictEqual(finalRes.data!.nextPeriodContext.unresolvedConditions.length, 1);
    assert.strictEqual(
      finalRes.data!.nextPeriodContext.unresolvedConditions[0].unresolvedId,
      'UNRES-SURVIVOR'
    );
    assert.strictEqual(
      finalRes.data!.nextPeriodContext.unresolvedConditions[0].lifecycleStatus,
      UnresolvedStatus.UNRESOLVED
    );
    assert.strictEqual(finalRes.data!.openUnresolvedCount, 1);
  });

  it('3. Explicitly resolves unresolved condition and closes it', () => {
    const reg = new UnresolvedConditionRegistry();
    const cond = createUnresolvedCondition({
      unresolvedId: 'UNRES-02',
      sourceReference: 'EVENT-43',
      temporalReference: '2024-01-01T00:00:00Z',
      reason: 'Needs confirmation'
    });
    reg.register(cond);

    // Explicit resolution
    const resRes = reg.resolve('UNRES-02', 'Inspection Report #99');
    assert.strictEqual(resRes.success, true);
    assert.strictEqual(reg.get('UNRES-02')?.lifecycleStatus, UnresolvedStatus.RESOLVED);
    assert.strictEqual(reg.get('UNRES-02')?.resolutionReference, 'Inspection Report #99');

    // Close after resolution
    const closeRes = reg.close('UNRES-02');
    assert.strictEqual(closeRes.success, true);
    assert.strictEqual(reg.get('UNRES-02')?.lifecycleStatus, UnresolvedStatus.CLOSED);

    // No longer an open condition
    assert.strictEqual(reg.getOpenConditions().length, 0);
  });

  it('4. Rejects closing an unresolved condition that has not been resolved first', () => {
    const reg = new UnresolvedConditionRegistry();
    const cond = createUnresolvedCondition({
      unresolvedId: 'UNRES-03',
      sourceReference: 'EVENT-44',
      temporalReference: '2024-01-01T00:00:00Z',
      reason: 'Pending check'
    });
    reg.register(cond);

    const closeRes = reg.close('UNRES-03');
    assert.strictEqual(closeRes.success, false);
    assert.strictEqual(reg.get('UNRES-03')?.lifecycleStatus, UnresolvedStatus.UNRESOLVED);
  });
});
