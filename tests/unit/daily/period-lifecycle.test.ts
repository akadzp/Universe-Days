import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PeriodLifecycleManager,
  PeriodLifecycleEvent,
  DailyUniverseStatus,
  createUniversePeriod,
  PeriodInitializer,
  TimePoint,
  Duration
} from '../../../core/universe/daily/index.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 5 - Period Lifecycle & First Period Unit Tests', () => {
  describe('Period Lifecycle State Machine (Section 53)', () => {
    it('1. Transitions cleanly through full normal lifecycle: UNINITIALIZED -> INITIALIZING -> INITIALIZED -> PROGRESSING -> FINALIZING -> FINALIZED', () => {
      const lifecycle = new PeriodLifecycleManager();
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.UNINITIALIZED);

      // UNINITIALIZED -> INITIALIZING
      let res = lifecycle.transition(PeriodLifecycleEvent.START_INIT);
      assert.strictEqual(res.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.INITIALIZING);

      // INITIALIZING -> INITIALIZED
      res = lifecycle.transition(PeriodLifecycleEvent.COMPLETE_INIT);
      assert.strictEqual(res.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.INITIALIZED);

      // INITIALIZED -> PROGRESSING
      res = lifecycle.transition(PeriodLifecycleEvent.START_PROGRESSION);
      assert.strictEqual(res.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.PROGRESSING);

      // PROGRESSING -> PROGRESSING (internal step)
      res = lifecycle.transition(PeriodLifecycleEvent.STEP_PROGRESSION);
      assert.strictEqual(res.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.PROGRESSING);

      // PROGRESSING -> FINALIZING
      res = lifecycle.transition(PeriodLifecycleEvent.START_FINALIZATION);
      assert.strictEqual(res.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.FINALIZING);

      // FINALIZING -> FINALIZED
      res = lifecycle.transition(PeriodLifecycleEvent.COMPLETE_FINALIZATION);
      assert.strictEqual(res.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.FINALIZED);
    });

    it('2. Strictly rejects invalid transitions (e.g. UNINITIALIZED directly to FINALIZED or PROGRESSING)', () => {
      const lifecycle = new PeriodLifecycleManager();
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.UNINITIALIZED);

      const invalidDirectFinal = lifecycle.transition(PeriodLifecycleEvent.COMPLETE_FINALIZATION);
      assert.strictEqual(invalidDirectFinal.success, false);
      assert.strictEqual(invalidDirectFinal.error?.code, EngineErrorCode.INVALID_PERIOD_LIFECYCLE);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.UNINITIALIZED);

      const invalidDirectProg = lifecycle.transition(PeriodLifecycleEvent.START_PROGRESSION);
      assert.strictEqual(invalidDirectProg.success, false);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.UNINITIALIZED);
    });

    it('3. Supports BLOCKED status and unblocking', () => {
      const lifecycle = new PeriodLifecycleManager(DailyUniverseStatus.INITIALIZING);

      const blockRes = lifecycle.transition(PeriodLifecycleEvent.BLOCK, { periodId: 'P1', reason: 'Missing dependency' });
      assert.strictEqual(blockRes.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.BLOCKED);

      const unblockRes = lifecycle.transition(PeriodLifecycleEvent.UNBLOCK);
      assert.strictEqual(unblockRes.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.PROGRESSING);
    });

    it('4. Supports FAILED status during initialization or progression', () => {
      const lifecycle = new PeriodLifecycleManager(DailyUniverseStatus.INITIALIZING);
      const failRes = lifecycle.transition(PeriodLifecycleEvent.FAIL);
      assert.strictEqual(failRes.success, true);
      assert.strictEqual(lifecycle.getStatus(), DailyUniverseStatus.FAILED);
    });
  });

  describe('First Period Initialization (Section 54)', () => {
    it('1. Successfully initializes a FIRST_PERIOD without requiring previous period reference', () => {
      const startTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
      const initRes = PeriodInitializer.initialize({
        startTime,
        universeScope: 'TEST_UNIVERSE',
        sequenceNumber: 1
      });

      assert.strictEqual(initRes.success, true);
      const ctx = initRes.data!;

      assert.strictEqual(ctx.initializationMode, 'FIRST_PERIOD');
      assert.strictEqual(ctx.period.isFirstPeriod, true);
      assert.strictEqual(ctx.period.previousPeriodRef, undefined);
      assert.strictEqual(ctx.period.status, DailyUniverseStatus.INITIALIZED);
      assert.strictEqual(ctx.period.initializationState, 'INITIALIZED');
      assert.strictEqual(ctx.clock.readCurrentTime().toCanonical(), '2024-01-01T00:00:00Z');
      assert.strictEqual(ctx.continuityItems.length, 0); // No fabricated history!
      assert.strictEqual(ctx.processes.length, 0);
      assert.strictEqual(ctx.unresolvedConditions.length, 0);
    });

    it('2. Distinguishes NORMAL_CONTINUATION when previous period reference is provided', () => {
      const startTime = TimePoint.parse('2024-01-02T00:00:00Z').data!;
      const initRes = PeriodInitializer.initialize({
        startTime,
        previousPeriodRef: 'PERIOD_TEST_UNIVERSE_20240101T000000Z_S0001',
        sequenceNumber: 2
      });

      assert.strictEqual(initRes.success, true);
      const ctx = initRes.data!;

      assert.strictEqual(ctx.initializationMode, 'NORMAL_CONTINUATION');
      assert.strictEqual(ctx.period.isFirstPeriod, false);
      assert.strictEqual(ctx.period.previousPeriodRef, 'PERIOD_TEST_UNIVERSE_20240101T000000Z_S0001');
      assert.strictEqual(ctx.period.status, DailyUniverseStatus.INITIALIZED);
    });
  });
});
