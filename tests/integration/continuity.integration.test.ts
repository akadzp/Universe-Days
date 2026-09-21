import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityQueryAPI,
  ContinuityStatus,
  TransitionType,
  EffectiveTime,
  ContinuityItem,
  ConditionReference
} from '../../core/universe/continuity/index.ts';
import { UniverseClock, TimePoint, Duration } from '../../core/temporal/index.ts';

describe('Phase 4 - Continuity Engine End-to-End Integration Test', () => {
  it('Executes complete end-to-end generic continuity workflow', () => {
    const api = new ContinuityQueryAPI();
    const clockRes = UniverseClock.create(TimePoint.parse('2024-01-01T12:00:00Z').data!);
    assert.strictEqual(clockRes.status, 'SUCCESS');
    const clock = clockRes.data!;

    // 1. Create previous condition
    const prevCondition: ConditionReference = {
      conditionId: 'COND-INIT-001',
      entityRef: 'GENERIC_E2E_SUBJECT',
      domain: 'GENERIC_DOMAIN',
      version: 1,
      temporalValidity: '2024-01-01T12:00:00Z'
    };

    // Initial continuity item
    const initialItem: ContinuityItem = {
      identity: {
        continuityId: 'CONT-E2E-001',
        entityRef: 'GENERIC_E2E_SUBJECT',
        domainRef: 'GENERIC_DOMAIN',
        version: 1
      },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: prevCondition,
      effectiveTime: EffectiveTime.create('2024-01-01T12:00:00Z')!
    };

    api.registerItem(initialItem);

    // 2. Register a prerequisite dependency
    api.registerItem({
      identity: {
        continuityId: 'CONT-PREREQ-999',
        entityRef: 'GENERIC_PREREQ_SUBJECT',
        domainRef: 'GENERIC_DOMAIN',
        version: 1
      },
      status: ContinuityStatus.ACTIVE
    });

    // 3. Create current condition
    const nextCondition: ConditionReference = {
      conditionId: 'COND-NEXT-002',
      entityRef: 'GENERIC_E2E_SUBJECT',
      domain: 'GENERIC_DOMAIN',
      version: 2,
      temporalValidity: '2024-01-02T12:00:00Z'
    };

    // 4. Advance clock & query Temporal Engine
    clock.advanceTime(Duration.create({ days: 1 }).data!);
    const currentClockTime = clock.readCurrentTime();
    assert.strictEqual(currentClockTime.toCanonical(), '2024-01-02T12:00:00Z');

    // 5. Build transition with dependencies
    const transition = {
      type: TransitionType.CHANGE,
      continuityId: 'CONT-E2E-001',
      previousConditionRef: prevCondition,
      currentConditionRef: nextCondition,
      effectiveTime: EffectiveTime.fromPoint(currentClockTime),
      dependencies: [
        {
          type: 'CONTINUITY_ITEM' as const,
          targetId: 'CONT-PREREQ-999',
          expectedStatus: ContinuityStatus.ACTIVE
        }
      ],
      sourceReference: 'SOURCE-GENERIC-PIPELINE'
    };

    // 6. Validate & Apply Transition through ContinuityQueryAPI
    const transitionResult = api.applyTransition({
      transition,
      context: { clock }
    });

    // 7. Verify result and trace
    assert.strictEqual(transitionResult.allowed, true);
    assert.strictEqual(transitionResult.status, 'VALID');
    assert.strictEqual(transitionResult.resultingStatus, ContinuityStatus.ACTIVE);
    assert.ok(transitionResult.trace);
    assert.strictEqual(transitionResult.trace.operation, 'VALIDATE_TRANSITION');
    assert.strictEqual(transitionResult.trace.success, true);

    // 8. Verify state and history in Query API
    const updatedStatus = api.getContinuityStatus('CONT-E2E-001');
    assert.strictEqual(updatedStatus.success, true);
    assert.strictEqual(updatedStatus.data, ContinuityStatus.ACTIVE);

    const currentCondition = api.getCurrentCondition('CONT-E2E-001');
    assert.strictEqual(currentCondition.success, true);
    assert.strictEqual(currentCondition.data?.conditionId, 'COND-NEXT-002');

    const historyResult = api.getContinuityHistory('CONT-E2E-001');
    assert.strictEqual(historyResult.success, true);
    assert.strictEqual(historyResult.data?.length, 1);
    assert.strictEqual(historyResult.data?.[0].previousConditionRef?.conditionId, 'COND-INIT-001');
    assert.strictEqual(historyResult.data?.[0].currentConditionRef?.conditionId, 'COND-NEXT-002');
  });
});
