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
  PeriodValidator,
  TimePoint,
  Duration
} from '../../core/universe/daily/index.ts';
import {
  ContinuityItem,
  ContinuityStatus,
  TransitionType,
  EffectiveTime
} from '../../core/universe/continuity/index.ts';

describe('Phase 5 - Daily Universe Integration Test (Section 65)', () => {
  it('Executes complete generic end-to-end period lifecycle cleanly', () => {
    // 1. Initial Period Setup (t0 = 2024-03-01T00:00:00Z)
    const t0 = TimePoint.parse('2024-03-01T00:00:00Z').data!;

    const prevContinuityItem: ContinuityItem = {
      identity: { continuityId: 'CONT-GENERIC-01', entityRef: 'GEN-E1', domainRef: 'GEN-DOM', version: 1 },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: {
        conditionId: 'COND-GEN-INIT',
        entityRef: 'GEN-E1',
        domain: 'GEN-DOM',
        temporalValidity: '2024-03-01'
      }
    };

    const prevProcess = createUniverseProcess({
      processId: 'PROC-GENERIC-RUNNING',
      startReference: t0.toCanonical(),
      initialStatus: UniverseProcessStatus.ACTIVE
    });

    const prevUnresolved = createUnresolvedCondition({
      unresolvedId: 'UNRES-GENERIC-01',
      sourceReference: 'EVENT-PREV-00',
      temporalReference: t0.toCanonical(),
      reason: 'Awaiting signal verification'
    });

    // 2. Initialize Period (with Carryover)
    const initRes = PeriodInitializer.initialize({
      startTime: t0,
      previousPeriodRef: 'PERIOD_GENERIC_PREV',
      previousContinuityItems: [prevContinuityItem],
      previousProcesses: [prevProcess],
      previousUnresolvedConditions: [prevUnresolved],
      sequenceNumber: 2,
      universeScope: 'GENERIC_TEST_SCOPE'
    });

    assert.strictEqual(initRes.success, true);
    const ctx = initRes.data!;

    // Validate Initialization Report
    const valInit = PeriodValidator.validateInitialization(ctx.period, ctx);
    assert.strictEqual(valInit.valid, true);
    assert.strictEqual(ctx.initializationMode, 'NORMAL_CONTINUATION');
    assert.strictEqual(ctx.carryoverResult?.allowed, true);

    // 3. Register Event & Consequence in Context
    const eventTime = '2024-03-01T08:00:00Z';
    const genericEvent = createUniverseEvent({
      eventId: 'EV-GENERIC-01',
      temporalReference: eventTime,
      prerequisites: [{ type: 'TEMPORAL', description: 'Clock reaches 08:00', satisfied: false }]
    });
    ctx.events.push(genericEvent);

    const genericConsequence = createUniverseConsequence({
      consequenceId: 'CNSQ-GENERIC-01',
      sourceEventRef: 'EV-GENERIC-01',
      temporalActivation: '2024-03-01T08:00:00Z',
      consequenceType: 'DIRECT'
    }).data!;

    // 4. Progression Step 1: Advance clock to 08:00 and Trigger Event
    const advance8h = Duration.create({ hours: 8 }).data!;
    const step1Res = ProgressionEngine.step(ctx, {
      advanceTimeBy: advance8h,
      triggerEventIds: ['EV-GENERIC-01']
    });

    assert.strictEqual(step1Res.success, true);
    assert.strictEqual(ctx.clock.readCurrentTime().toCanonical(), '2024-03-01T08:00:00Z');
    assert.strictEqual(ctx.events[0].status, UniverseEventStatus.OCCURRED);

    // 5. Progression Step 2: Apply Continuity Transition & Advance to 16:00
    const contTransition = {
      type: TransitionType.CHANGE,
      continuityId: 'CONT-GENERIC-01',
      previousConditionRef: prevContinuityItem.currentConditionRef,
      currentConditionRef: {
        conditionId: 'COND-GEN-UPDATED',
        entityRef: 'GEN-E1',
        domain: 'GEN-DOM',
        temporalValidity: '2024-03-01T16:00:00Z'
      },
      effectiveTime: EffectiveTime.create('2024-03-01T16:00:00Z')!
    };

    const advance8hMore = Duration.create({ hours: 8 }).data!;
    const step2Res = ProgressionEngine.step(ctx, {
      advanceTimeBy: advance8hMore,
      continuityTransitions: [contTransition]
    });

    assert.strictEqual(step2Res.success, true);
    assert.strictEqual(ctx.clock.readCurrentTime().toCanonical(), '2024-03-01T16:00:00Z');
    assert.strictEqual(ctx.continuityItems[0].currentConditionRef?.conditionId, 'COND-GEN-UPDATED');
    assert.strictEqual(ctx.continuityItems[0].identity.version, 2);

    // 6. Progression Step 3: Add new unresolved condition arising during day
    const newUnres = createUnresolvedCondition({
      unresolvedId: 'UNRES-GENERIC-02',
      sourceReference: 'EV-GENERIC-01',
      temporalReference: '2024-03-01T16:00:00Z',
      reason: 'Anomaly recorded at 16:00'
    });
    ctx.unresolvedConditions.push(newUnres);

    // Explicitly resolve the previous unresolved condition
    const step3Res = ProgressionEngine.step(ctx, {
      resolveUnresolvedIds: [{ unresolvedId: 'UNRES-GENERIC-01', resolutionRef: 'Verified at 16:00' }]
    });
    assert.strictEqual(step3Res.success, true);
    assert.strictEqual(ctx.unresolvedConditions[0].lifecycleStatus, UnresolvedStatus.RESOLVED);
    assert.strictEqual(ctx.unresolvedConditions[1].lifecycleStatus, UnresolvedStatus.UNRESOLVED);

    // 7. Finalize Period
    const finalRes = PeriodFinalizer.finalize(ctx);
    assert.strictEqual(finalRes.success, true);
    assert.strictEqual(ctx.period.status, DailyUniverseStatus.FINALIZED);

    const valFinal = PeriodValidator.validateFinalization(ctx.period, finalRes.data!);
    assert.strictEqual(valFinal.valid, true);

    // 8. Next Period Context Validation
    const nextCtx = finalRes.data!.nextPeriodContext;
    const valNext = PeriodValidator.validateNextPeriodContext(nextCtx);
    assert.strictEqual(valNext.valid, true);

    assert.strictEqual(nextCtx.sourcePeriodId, ctx.period.periodId);
    assert.strictEqual(nextCtx.continuityReferences.length, 1);
    assert.strictEqual(nextCtx.continuityReferences[0].currentConditionRef?.conditionId, 'COND-GEN-UPDATED');
    assert.strictEqual(nextCtx.activeProcesses.length, 1);
    assert.strictEqual(nextCtx.activeProcesses[0].currentStatus, UniverseProcessStatus.ACTIVE);
    assert.strictEqual(nextCtx.unresolvedConditions.length, 2);

    // Verify Traces were generated
    const traces = ctx.traces.getAll();
    assert.ok(traces.length >= 5);
  });
});
