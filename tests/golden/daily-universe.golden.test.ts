import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PeriodInitializer,
  PeriodFinalizer,
  ProgressionEngine,
  createUniverseProcess,
  createUnresolvedCondition,
  createUniverseEvent,
  createUniverseConsequence,
  UniverseProcessStatus,
  UniverseEventStatus,
  UniverseConsequenceStatus,
  UnresolvedStatus,
  DailyUniverseStatus,
  TimePoint,
  Duration,
  FutureInfoType,
  FutureInformation,
  CarryoverManager
} from '../../core/universe/daily/index.ts';
import {
  ContinuityItem,
  ContinuityStatus,
  TransitionType,
  EffectiveTime
} from '../../core/universe/continuity/index.ts';
import { EngineErrorCode } from '../../core/types/errors.ts';

describe('Phase 5 - Daily Universe Golden Tests (Section 66)', () => {
  it('Scenario 1: First Period Golden Execution', () => {
    const startTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
    const initRes = PeriodInitializer.initialize({
      startTime,
      universeScope: 'GOLDEN_SCOPE',
      sequenceNumber: 1
    });

    assert.strictEqual(initRes.success, true);
    const ctx = initRes.data;

    assert.strictEqual(ctx.initializationMode, 'FIRST_PERIOD');
    assert.strictEqual(ctx.period.periodId, 'PERIOD_GOLDEN_SCOPE_20240101T000000Z_S0001');
    assert.strictEqual(ctx.period.status, DailyUniverseStatus.INITIALIZED);
    assert.strictEqual(ctx.continuityItems.length, 0);

    const finalRes = PeriodFinalizer.finalize(ctx);
    assert.strictEqual(finalRes.success, true);
    assert.strictEqual(finalRes.data.finalStatus, DailyUniverseStatus.FINALIZED);
  });

  it('Scenario 2: Normal Carryover Golden Execution', () => {
    const t0 = TimePoint.parse('2024-01-02T00:00:00Z').data!;
    const prevItem: ContinuityItem = {
      identity: { continuityId: 'GOLDEN-CONT-1', entityRef: 'E_G1', domainRef: 'D_G', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C_G1', entityRef: 'E_G1', domain: 'D_G', temporalValidity: '2024-01-01' }
    };

    const initRes = PeriodInitializer.initialize({
      startTime: t0,
      previousPeriodRef: 'PERIOD_GOLDEN_SCOPE_20240101T000000Z_S0001',
      previousContinuityItems: [prevItem],
      sequenceNumber: 2,
      universeScope: 'GOLDEN_SCOPE'
    });

    assert.strictEqual(initRes.success, true);
    assert.strictEqual(initRes.data.initializationMode, 'NORMAL_CONTINUATION');
    assert.strictEqual(initRes.data.continuityItems.length, 1);
    assert.strictEqual(initRes.data.continuityItems[0].status, ContinuityStatus.ACTIVE);
  });

  it('Scenario 3: Continuing Process Golden Execution across Boundaries', () => {
    const t0 = TimePoint.parse('2024-01-02T00:00:00Z').data!;
    const runningProc = createUniverseProcess({
      processId: 'PROC-CONTINUOUS',
      startReference: '2024-01-01T00:00:00Z',
      initialStatus: UniverseProcessStatus.ACTIVE
    });

    const initRes = PeriodInitializer.initialize({
      startTime: t0,
      previousPeriodRef: 'PERIOD_PREV',
      previousProcesses: [runningProc]
    });
    assert.strictEqual(initRes.success, true);
    const ctx = initRes.data;

    // Finalize without completing process
    const finalRes = PeriodFinalizer.finalize(ctx);
    assert.strictEqual(finalRes.success, true);
    assert.strictEqual(finalRes.data.activeProcessCount, 1);
    assert.strictEqual(
      finalRes.data.nextPeriodContext.activeProcesses[0].currentStatus,
      UniverseProcessStatus.ACTIVE
    );
  });

  it('Scenario 4: Event + Consequence Golden Execution', () => {
    const t0 = TimePoint.parse('2024-01-02T00:00:00Z').data!;
    const initRes = PeriodInitializer.initialize({ startTime: t0 });
    const ctx = initRes.data!;

    const event = createUniverseEvent({
      eventId: 'EV-GOLDEN-01',
      temporalReference: '2024-01-02T06:00:00Z',
      prerequisites: []
    });
    ctx.events.push(event);

    const consequence = createUniverseConsequence({
      consequenceId: 'CNSQ-GOLDEN-01',
      sourceEventRef: 'EV-GOLDEN-01',
      temporalActivation: '2024-01-02T06:00:00Z'
    });
    assert.strictEqual(consequence.success, true);

    const progRes = ProgressionEngine.step(ctx, {
      advanceTimeBy: Duration.create({ hours: 6 }).data!,
      triggerEventIds: ['EV-GOLDEN-01']
    });
    assert.strictEqual(progRes.success, true);
    assert.strictEqual(ctx.events[0].status, UniverseEventStatus.OCCURRED);
  });

  it('Scenario 5: Unresolved Condition Golden Execution', () => {
    const t0 = TimePoint.parse('2024-01-02T00:00:00Z').data!;
    const unres = createUnresolvedCondition({
      unresolvedId: 'UNRES-GOLDEN',
      sourceReference: 'EV-PREV',
      temporalReference: t0.toCanonical(),
      reason: 'Incomplete chemical analysis'
    });

    const initRes = PeriodInitializer.initialize({
      startTime: t0,
      previousUnresolvedConditions: [unres]
    });
    const ctx = initRes.data!;

    assert.strictEqual(ctx.unresolvedConditions[0].lifecycleStatus, UnresolvedStatus.UNRESOLVED);

    const finalRes = PeriodFinalizer.finalize(ctx);
    assert.strictEqual(finalRes.success, true);
    assert.strictEqual(finalRes.data.openUnresolvedCount, 1);
    assert.strictEqual(
      finalRes.data.nextPeriodContext.unresolvedConditions[0].unresolvedId,
      'UNRES-GOLDEN'
    );
  });

  it('Scenario 6: Future Plan Golden Execution', () => {
    const t0 = TimePoint.parse('2024-01-02T00:00:00Z').data!;
    const plan: FutureInformation = {
      futureId: 'PLAN-GOLDEN',
      type: FutureInfoType.PLAN,
      description: 'Scheduled orbital survey',
      temporalHorizon: '2024-01-02T12:00:00Z',
      actualized: false,
      traceability: {
        requestId: 'REQ_G' as any,
        sourceSystem: 'TEST' as any,
        timestamp: 0,
        version: '1.0.0'
      }
    };

    const initRes = PeriodInitializer.initialize({
      startTime: t0,
      previousFutureInfo: [plan]
    });
    const ctx = initRes.data!;

    // Advance past plan horizon
    ProgressionEngine.step(ctx, { advanceTimeBy: Duration.create({ hours: 14 }).data! });

    // Plan must remain not actualized automatically
    assert.strictEqual(ctx.futureInfo[0].actualized, false);
  });

  it('Scenario 7: Failed Transition Golden Execution', () => {
    const t0 = TimePoint.parse('2024-01-02T00:00:00Z').data!;
    const item: ContinuityItem = {
      identity: { continuityId: 'GOLDEN-FAIL-ITEM', entityRef: 'E_F', domainRef: 'D_F', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C_F', entityRef: 'E_F', domain: 'D_F', temporalValidity: '2024-01-02' }
    };

    const initRes = PeriodInitializer.initialize({
      startTime: t0,
      previousContinuityItems: [item]
    });
    const ctx = initRes.data!;

    // Attempt invalid transition
    const stepRes = ProgressionEngine.step(ctx, {
      continuityTransitions: [
        {
          type: TransitionType.RESUME, // Invalid on ACTIVE
          continuityId: 'GOLDEN-FAIL-ITEM',
          currentConditionRef: { conditionId: 'C_F2', entityRef: 'E_F', domain: 'D_F', temporalValidity: '2024-01-02' },
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      ]
    });

    assert.strictEqual(stepRes.success, false);
    assert.strictEqual(stepRes.error.code, EngineErrorCode.ATOMIC_TRANSITION_FAILED);
    assert.strictEqual(ctx.continuityItems[0].identity.version, 1);
  });

  it('Scenario 8: Cross-Year Continuity Golden Execution', () => {
    const tEnd2024 = TimePoint.parse('2024-12-31T00:00:00Z').data!;
    const tStart2025 = TimePoint.parse('2025-01-01T00:00:00Z').data!;

    const item: ContinuityItem = {
      identity: { continuityId: 'CROSS-YEAR-ITEM', entityRef: 'E_YEAR', domainRef: 'D_YEAR', version: 5 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: { conditionId: 'C_2024', entityRef: 'E_YEAR', domain: 'D_YEAR', temporalValidity: '2024-12-31' }
    };

    // Carryover across the year boundary
    const carryoverRes = CarryoverManager.processCarryover([item], tStart2025);
    assert.strictEqual(carryoverRes.allowed, true);
    assert.strictEqual(carryoverRes.items[0].continuityItem.status, ContinuityStatus.ACTIVE);
    assert.strictEqual(carryoverRes.items[0].continuityItem.currentConditionRef?.conditionId, 'C_2024');

    // Initialize new period in 2025
    const init2025 = PeriodInitializer.initialize({
      startTime: tStart2025,
      previousPeriodRef: 'PERIOD_2024_FINAL',
      previousContinuityItems: [item]
    });
    assert.strictEqual(init2025.success, true);
    assert.strictEqual(init2025.data.continuityItems[0].identity.continuityId, 'CROSS-YEAR-ITEM');
    assert.strictEqual(init2025.data.continuityItems[0].status, ContinuityStatus.ACTIVE);
  });
});
