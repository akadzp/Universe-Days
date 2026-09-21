import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CarryoverManager,
  CarryoverDecisionType,
  PeriodInitializer,
  TimePoint,
  Duration
} from '../../../core/universe/daily/index.ts';
import {
  ContinuityItem,
  ContinuityStatus,
  TransitionType,
  EffectiveTime
} from '../../../core/universe/continuity/index.ts';

describe('Phase 5 - Carryover & Period Boundary Unit Tests', () => {
  const baseActiveItem: ContinuityItem = {
    identity: { continuityId: 'CONT-CO-01', entityRef: 'E1', domainRef: 'D1', version: 1 },
    status: ContinuityStatus.ACTIVE,
    currentConditionRef: { conditionId: 'COND-1', entityRef: 'E1', domain: 'D1', temporalValidity: '2024-01-01' }
  };

  describe('Carryover Decisions & Transitions (Section 55)', () => {
    it('1. Carry-forward active condition into target period', () => {
      const targetTime = TimePoint.parse('2024-01-02T00:00:00Z').data!;
      const result = CarryoverManager.processCarryover([baseActiveItem], targetTime);

      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.items.length, 1);
      assert.strictEqual(result.items[0].decision, CarryoverDecisionType.CARRY_FORWARD);
      assert.strictEqual(result.items[0].severity, 'VALID');
      assert.strictEqual(result.items[0].validationResult.allowed, true);
    });

    it('2. Appropriately categorizes ENDED condition as COMPLETED', () => {
      const endedItem: ContinuityItem = {
        identity: { continuityId: 'CONT-CO-ENDED', entityRef: 'E2', domainRef: 'D1', version: 2 },
        status: ContinuityStatus.ENDED,
        currentConditionRef: null
      };

      const targetTime = TimePoint.parse('2024-01-02T00:00:00Z').data!;
      const result = CarryoverManager.processCarryover([endedItem], targetTime);

      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.items[0].decision, CarryoverDecisionType.COMPLETED);
      assert.strictEqual(result.items[0].severity, 'VALID');
    });

    it('3. Appropriately categorizes SUSPENDED and UNKNOWN conditions', () => {
      const suspendedItem: ContinuityItem = {
        identity: { continuityId: 'CONT-SUSPENDED', entityRef: 'E3', domainRef: 'D1', version: 1 },
        status: ContinuityStatus.SUSPENDED,
        currentConditionRef: { conditionId: 'COND-3', entityRef: 'E3', domain: 'D1', temporalValidity: '2024-01-01' }
      };

      const unknownItem: ContinuityItem = {
        identity: { continuityId: 'CONT-UNKNOWN', entityRef: 'E4', domainRef: 'D1', version: 1 },
        status: ContinuityStatus.UNKNOWN,
        currentConditionRef: null
      };

      const targetTime = TimePoint.parse('2024-01-02T00:00:00Z').data!;
      const result = CarryoverManager.processCarryover([suspendedItem, unknownItem], targetTime);

      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.items[0].decision, CarryoverDecisionType.SUSPENDED);
      assert.strictEqual(result.items[1].decision, CarryoverDecisionType.UNKNOWN);
    });

    it('4. Supports explicit RESUME transition during carryover', () => {
      const suspendedItem: ContinuityItem = {
        identity: { continuityId: 'CONT-RESUME-ME', entityRef: 'E5', domainRef: 'D1', version: 1 },
        status: ContinuityStatus.SUSPENDED,
        currentConditionRef: { conditionId: 'COND-5', entityRef: 'E5', domain: 'D1', temporalValidity: '2024-01-01' }
      };

      const explicitTransitions = new Map();
      explicitTransitions.set('CONT-RESUME-ME', {
        type: TransitionType.RESUME,
        continuityId: 'CONT-RESUME-ME',
        currentConditionRef: { conditionId: 'COND-5', entityRef: 'E5', domain: 'D1', temporalValidity: '2024-01-02' },
        effectiveTime: EffectiveTime.create('2024-01-02')!
      });

      const targetTime = TimePoint.parse('2024-01-02T00:00:00Z').data!;
      const result = CarryoverManager.processCarryover([suspendedItem], targetTime, explicitTransitions);

      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.items[0].validationResult.resultingStatus, ContinuityStatus.ACTIVE);
    });

    it('5. Blocks carryover when transition is invalid (temporal inversion or broken invariant)', () => {
      const targetTime = TimePoint.parse('2024-01-02T00:00:00Z').data!;
      const explicitTransitions = new Map();

      // Transition effective time is in the future beyond target period start
      explicitTransitions.set('CONT-CO-01', {
        type: TransitionType.CHANGE,
        continuityId: 'CONT-CO-01',
        previousConditionRef: baseActiveItem.currentConditionRef,
        currentConditionRef: { conditionId: 'COND-FUTURE', entityRef: 'E1', domain: 'D1', temporalValidity: '2024-01-10' },
        effectiveTime: EffectiveTime.create('2024-01-10')! // After targetPeriodStartTime (Jan 2)
      });

      const result = CarryoverManager.processCarryover([baseActiveItem], targetTime, explicitTransitions);
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.severity, 'BLOCKED');
      assert.ok(result.blockedReasons.length > 0);
    });
  });

  describe('Period Boundaries (Section 56)', () => {
    it('1. Preserves continuity across day boundary without auto-reset', () => {
      const t1 = TimePoint.parse('2024-01-01T23:59:00Z').data!;
      const t2 = TimePoint.parse('2024-01-02T00:01:00Z').data!;

      const item: ContinuityItem = {
        identity: { continuityId: 'CONT-DAY-BOUNDARY', entityRef: 'E_DAY', domainRef: 'D1', version: 1 },
        status: ContinuityStatus.ACTIVE,
        currentConditionRef: { conditionId: 'C_NIGHT', entityRef: 'E_DAY', domain: 'D1', temporalValidity: t1.toCanonical() }
      };

      const result = CarryoverManager.processCarryover([item], t2);
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.items[0].continuityItem.status, ContinuityStatus.ACTIVE);
      assert.strictEqual(result.items[0].continuityItem.currentConditionRef?.conditionId, 'C_NIGHT');
    });

    it('2. Preserves continuity across month boundary (Jan 31 -> Feb 01) without auto-reset', () => {
      const tJan = TimePoint.parse('2024-01-31T23:00:00Z').data!;
      const tFeb = TimePoint.parse('2024-02-01T01:00:00Z').data!;

      const item: ContinuityItem = {
        identity: { continuityId: 'CONT-MONTH-BOUNDARY', entityRef: 'E_MONTH', domainRef: 'D1', version: 1 },
        status: ContinuityStatus.ACTIVE,
        currentConditionRef: { conditionId: 'C_JAN', entityRef: 'E_MONTH', domain: 'D1', temporalValidity: tJan.toCanonical() }
      };

      const result = CarryoverManager.processCarryover([item], tFeb);
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.items[0].continuityItem.status, ContinuityStatus.ACTIVE);
    });

    it('3. Preserves continuity across year boundary (Dec 31, 2024 -> Jan 01, 2025) without auto-reset', () => {
      const tDec = TimePoint.parse('2024-12-31T23:59:59Z').data!;
      const tJan = TimePoint.parse('2025-01-01T00:00:01Z').data!;

      const item: ContinuityItem = {
        identity: { continuityId: 'CONT-YEAR-BOUNDARY', entityRef: 'E_YEAR', domainRef: 'D1', version: 1 },
        status: ContinuityStatus.ACTIVE,
        currentConditionRef: { conditionId: 'C_DEC_31', entityRef: 'E_YEAR', domain: 'D1', temporalValidity: tDec.toCanonical() }
      };

      const result = CarryoverManager.processCarryover([item], tJan);
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.items[0].continuityItem.status, ContinuityStatus.ACTIVE);
      assert.strictEqual(result.items[0].continuityItem.currentConditionRef?.conditionId, 'C_DEC_31');
    });
  });
});
