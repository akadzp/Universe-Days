import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PeriodInitializer,
  PeriodFinalizer,
  ProgressionEngine,
  createUniverseProcess,
  createUnresolvedCondition,
  UniverseProcessStatus,
  DailyUniverseStatus,
  TimePoint,
  Duration
} from '../../../core/universe/daily/index.ts';
import {
  ContinuityItem,
  ContinuityStatus,
  TransitionType,
  EffectiveTime
} from '../../../core/universe/continuity/index.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 5 - Finalization & Atomicity Unit Tests', () => {
  describe('Period Finalization Invariants (Section 63)', () => {
    it('1. Valid finalization preserves active processes, unresolved conditions, and creates NextPeriodContext', () => {
      const startTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
      const proc = createUniverseProcess({
        processId: 'P_ACTIVE',
        startReference: startTime.toCanonical(),
        initialStatus: UniverseProcessStatus.ACTIVE
      });
      const unres = createUnresolvedCondition({
        unresolvedId: 'U_OPEN',
        sourceReference: 'EV_X',
        temporalReference: startTime.toCanonical(),
        reason: 'Under observation'
      });

      const initRes = PeriodInitializer.initialize({
        startTime,
        previousProcesses: [proc],
        previousUnresolvedConditions: [unres]
      });
      assert.strictEqual(initRes.success, true);
      const ctx = initRes.data!;

      // Progress period
      const progRes = ProgressionEngine.step(ctx);
      assert.strictEqual(progRes.success, true);
      assert.strictEqual(ctx.period.status, DailyUniverseStatus.PROGRESSING);

      // Finalize period
      const finalRes = PeriodFinalizer.finalize(ctx);
      assert.strictEqual(finalRes.success, true);
      assert.strictEqual(ctx.period.status, DailyUniverseStatus.FINALIZED);
      assert.strictEqual(ctx.period.finalizationState, 'FINALIZED');

      // NextPeriodContext assertions
      const nextCtx = finalRes.data!.nextPeriodContext;
      assert.strictEqual(nextCtx.sourcePeriodId, ctx.period.periodId);
      assert.strictEqual(nextCtx.activeProcesses.length, 1);
      assert.strictEqual(nextCtx.activeProcesses[0].processId, 'P_ACTIVE');
      assert.strictEqual(nextCtx.unresolvedConditions.length, 1);
      assert.strictEqual(nextCtx.unresolvedConditions[0].unresolvedId, 'U_OPEN');

      // Universe Time is preserved (not reset)
      assert.strictEqual(ctx.clock.readCurrentTime().toCanonical(), '2024-01-01T00:00:00Z');

      // Invariants: No story or page generated
      assert.strictEqual((ctx as any).story, undefined);
      assert.strictEqual((ctx as any).page, undefined);
      assert.strictEqual((nextCtx as any).story, undefined);
      assert.strictEqual((nextCtx as any).page, undefined);
    });
  });

  describe('Progression Atomicity (Section 64)', () => {
    it('1. Failed continuity transition rejects entire step and leaves no partial state mutations', () => {
      const startTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
      const item1: ContinuityItem = {
        identity: { continuityId: 'ITEM-VALID', entityRef: 'E1', domainRef: 'D1', version: 1 },
        status: ContinuityStatus.ACTIVE,
        currentConditionRef: { conditionId: 'COND-1', entityRef: 'E1', domain: 'D1', temporalValidity: '2024-01-01' }
      };
      const item2: ContinuityItem = {
        identity: { continuityId: 'ITEM-INVALID', entityRef: 'E2', domainRef: 'D1', version: 1 },
        status: ContinuityStatus.ACTIVE,
        currentConditionRef: { conditionId: 'COND-2', entityRef: 'E2', domain: 'D1', temporalValidity: '2024-01-01' }
      };

      const initRes = PeriodInitializer.initialize({
        startTime,
        previousContinuityItems: [item1, item2]
      });
      assert.strictEqual(initRes.success, true);
      const ctx = initRes.data!;

      // Valid transition for item 1
      const validTrans = {
        type: TransitionType.CHANGE,
        continuityId: 'ITEM-VALID',
        previousConditionRef: item1.currentConditionRef,
        currentConditionRef: { conditionId: 'COND-1-NEW', entityRef: 'E1', domain: 'D1', temporalValidity: '2024-01-01T06:00:00Z' },
        effectiveTime: EffectiveTime.create('2024-01-01T06:00:00Z')!
      };

      // Invalid transition for item 2 (e.g. RESUME on already ACTIVE item is invalid)
      const invalidTrans = {
        type: TransitionType.RESUME,
        continuityId: 'ITEM-INVALID',
        currentConditionRef: { conditionId: 'COND-2-NEW', entityRef: 'E2', domain: 'D1', temporalValidity: '2024-01-01T06:00:00Z' },
        effectiveTime: EffectiveTime.create('2024-01-01T06:00:00Z')!
      };

      // Execute progression step with both transitions
      const stepRes = ProgressionEngine.step(ctx, {
        continuityTransitions: [validTrans, invalidTrans]
      });

      // The step must fail atomically
      assert.strictEqual(stepRes.success, false);
      assert.strictEqual(stepRes.error?.code, EngineErrorCode.ATOMIC_TRANSITION_FAILED);

      // Verify no partial state was applied to item1!
      const item1State = ctx.continuityItems.find(i => i.identity.continuityId === 'ITEM-VALID');
      assert.strictEqual(item1State?.identity.version, 1);
      assert.strictEqual(item1State?.currentConditionRef?.conditionId, 'COND-1'); // Not updated to COND-1-NEW
    });
  });
});
