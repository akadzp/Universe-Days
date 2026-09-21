import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DecisionActionManager,
  DecisionStatus,
  ActionStatus,
  FutureInfoType,
  UniverseDecision,
  FutureInformation,
  PeriodInitializer,
  ProgressionEngine,
  TimePoint,
  Duration
} from '../../../core/universe/daily/index.ts';

describe('Phase 5 - Decision/Action & Future Information Unit Tests', () => {
  describe('Decision vs Action Separation (Section 61)', () => {
    it('1. Decision != Action: registering a decision does NOT create or execute an action', () => {
      const mgr = new DecisionActionManager();
      const decision: UniverseDecision = {
        decisionId: 'DEC-01',
        status: DecisionStatus.PLANNED,
        intent: 'Plan to transport supplies',
        traceability: {
          requestId: 'REQ_D1' as any,
          sourceSystem: 'TEST' as any,
          timestamp: 0,
          version: '1.0.0'
        }
      };

      mgr.registerDecision(decision);
      assert.strictEqual(mgr.getDecision('DEC-01')?.status, DecisionStatus.PLANNED);
      // No actions exist automatically
      assert.strictEqual(mgr.getAction('ACT-01'), undefined);
    });

    it('2. Approved decision creates Action only through explicit method', () => {
      const mgr = new DecisionActionManager();
      const decision: UniverseDecision = {
        decisionId: 'DEC-02',
        status: DecisionStatus.PENDING,
        intent: 'Build sensor array',
        traceability: {
          requestId: 'REQ_D2' as any,
          sourceSystem: 'TEST' as any,
          timestamp: 0,
          version: '1.0.0'
        }
      };
      mgr.registerDecision(decision);

      const actionRes = mgr.approveAndCreateAction('DEC-02', 'ACT-02', '2024-01-01T12:00:00Z');
      assert.strictEqual(actionRes.success, true);
      assert.strictEqual(mgr.getDecision('DEC-02')?.status, DecisionStatus.APPROVED);
      assert.strictEqual(mgr.getAction('ACT-02')?.status, ActionStatus.PENDING);
    });

    it('3. Rejects action creation from rejected decision', () => {
      const mgr = new DecisionActionManager();
      const decision: UniverseDecision = {
        decisionId: 'DEC-03',
        status: DecisionStatus.REJECTED,
        intent: 'Unsafe operation',
        traceability: {
          requestId: 'REQ_D3' as any,
          sourceSystem: 'TEST' as any,
          timestamp: 0,
          version: '1.0.0'
        }
      };
      mgr.registerDecision(decision);

      const actionRes = mgr.approveAndCreateAction('DEC-03', 'ACT-03', '2024-01-01T12:00:00Z');
      assert.strictEqual(actionRes.success, false);
    });
  });

  describe('Future Information Preservation (Section 62)', () => {
    it('1. Plans, Predictions, and Possibilities remain non-actualized even if Universe Time advances', () => {
      const startTime = TimePoint.parse('2024-01-01T00:00:00Z').data!;
      const futurePlan: FutureInformation = {
        futureId: 'FUT-PLAN-01',
        type: FutureInfoType.PLAN,
        description: 'Scheduled maintenance at noon',
        temporalHorizon: '2024-01-01T12:00:00Z',
        actualized: false,
        traceability: {
          requestId: 'REQ_F1' as any,
          sourceSystem: 'TEST' as any,
          timestamp: 0,
          version: '1.0.0'
        }
      };

      const futurePrediction: FutureInformation = {
        futureId: 'FUT-PRED-01',
        type: FutureInfoType.PREDICTION,
        description: 'Atmospheric pressure will rise by 15:00',
        temporalHorizon: '2024-01-01T15:00:00Z',
        actualized: false,
        traceability: {
          requestId: 'REQ_F2' as any,
          sourceSystem: 'TEST' as any,
          timestamp: 0,
          version: '1.0.0'
        }
      };

      const initRes = PeriodInitializer.initialize({
        startTime,
        previousFutureInfo: [futurePlan, futurePrediction]
      });
      assert.strictEqual(initRes.success, true);
      const ctx = initRes.data!;

      // Advance clock past the planned and predicted horizon (e.g. advance 18 hours to 18:00)
      const dur = Duration.create({ hours: 18 }).data!;
      const stepRes = ProgressionEngine.step(ctx, { advanceTimeBy: dur });
      assert.strictEqual(stepRes.success, true);
      assert.strictEqual(ctx.clock.readCurrentTime().toCanonical(), '2024-01-01T18:00:00Z');

      // The future plans MUST NOT be automatically actualized!
      assert.strictEqual(ctx.futureInfo[0].actualized, false);
      assert.strictEqual(ctx.futureInfo[1].actualized, false);
    });

    it('2. Future information is only actualized via explicit occurrence registration', () => {
      const mgr = new DecisionActionManager();
      const plan: FutureInformation = {
        futureId: 'PLAN-02',
        type: FutureInfoType.PLAN,
        description: 'Launch probe',
        temporalHorizon: '2024-01-01T12:00:00Z',
        actualized: false,
        traceability: {
          requestId: 'REQ_P2' as any,
          sourceSystem: 'TEST' as any,
          timestamp: 0,
          version: '1.0.0'
        }
      };
      mgr.registerFutureInfo(plan);

      const actualizeRes = mgr.explicitlyActualizeFutureInfo('PLAN-02', 'EVENT-PROBE-LAUNCH');
      assert.strictEqual(actualizeRes.success, true);
      const updated = mgr.getAllFutureInfo().find(f => f.futureId === 'PLAN-02');
      assert.strictEqual(updated?.actualized, true);
      assert.strictEqual(updated?.actualizedEventRef, 'EVENT-PROBE-LAUNCH');
    });
  });
});
