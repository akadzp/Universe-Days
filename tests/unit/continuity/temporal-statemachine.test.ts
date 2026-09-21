import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityValidator,
  ContinuityStatus,
  TransitionType,
  EffectiveTime,
  ContinuityItem,
  ContinuityLifecycleManager
} from '../../../core/universe/continuity/index.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 4 - Temporal Integration, State Machine & Determinism Unit Tests', () => {
  const baseItem: ContinuityItem = {
    identity: {
      continuityId: 'CONT-DET-001',
      entityRef: 'ENTITY_TEMPORAL',
      domainRef: 'DOMAIN_DEFAULT',
      version: 1
    },
    status: ContinuityStatus.ACTIVE,
    currentConditionRef: {
      conditionId: 'COND-TEMP-01',
      entityRef: 'ENTITY_TEMPORAL',
      domain: 'DOMAIN_DEFAULT',
      temporalValidity: '2024-01-01T10:00:00Z'
    }
  };

  // Section 61: Temporal Integration
  describe('Temporal Integration', () => {
    it('1. Valid chronological progression is accepted', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-DET-001',
          previousConditionRef: baseItem.currentConditionRef,
          currentConditionRef: {
            conditionId: 'COND-TEMP-02',
            entityRef: 'ENTITY_TEMPORAL',
            domain: 'DOMAIN_DEFAULT',
            temporalValidity: '2024-01-01T11:00:00Z'
          },
          effectiveTime: EffectiveTime.create('2024-01-01T11:00:00Z')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 'VALID');
    });

    it('2. Strictly rejects temporal reversal (temporal inversion)', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-DET-001',
          previousConditionRef: baseItem.currentConditionRef, // 10:00:00Z
          currentConditionRef: {
            conditionId: 'COND-TEMP-02',
            entityRef: 'ENTITY_TEMPORAL',
            domain: 'DOMAIN_DEFAULT',
            temporalValidity: '2024-01-01T09:00:00Z'
          },
          effectiveTime: EffectiveTime.create('2024-01-01T09:00:00Z')! // Earlier!
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.TEMPORAL_CONFLICT));
    });

    it('3. Handles interval effective times properly without error', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-DET-001',
          previousConditionRef: baseItem.currentConditionRef,
          currentConditionRef: {
            conditionId: 'COND-INTERVAL-01',
            entityRef: 'ENTITY_TEMPORAL',
            domain: 'DOMAIN_DEFAULT',
            temporalValidity: '2024-01-02'
          },
          effectiveTime: EffectiveTime.create('2024-01-02/2024-01-05')!
        }
      });

      assert.strictEqual(res.allowed, true);
    });
  });

  // Section 62: Generic State Machine Integration
  describe('State Machine Integration', () => {
    it('1. Valid transition updates lifecycle state and produces traceable history', () => {
      const lifecycle = new ContinuityLifecycleManager(ContinuityStatus.ACTIVE);
      const res = lifecycle.applyTransition({
        type: TransitionType.SUSPEND,
        continuityId: 'CONT-001',
        effectiveTime: EffectiveTime.create('2024-01-02')!
      });

      assert.strictEqual(res.status, 'SUCCESS');
      assert.strictEqual(lifecycle.getStatus(), ContinuityStatus.SUSPENDED);

      const history = lifecycle.getHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].from, ContinuityStatus.ACTIVE);
      assert.strictEqual(history[0].to, ContinuityStatus.SUSPENDED);
    });

    it('2. Invalid transition leaves lifecycle state completely unmutated', () => {
      const lifecycle = new ContinuityLifecycleManager(ContinuityStatus.ENDED);
      const originalStatus = lifecycle.getStatus();

      const res = lifecycle.applyTransition({
        type: TransitionType.CONTINUE, // Cannot continue ended item
        continuityId: 'CONT-001',
        effectiveTime: EffectiveTime.create('2024-01-02')!
      });

      assert.strictEqual(res.status, 'FAILURE');
      assert.strictEqual(lifecycle.getStatus(), originalStatus); // State did not mutate!
    });
  });

  // Section 63: Determinism
  describe('Determinism', () => {
    it('1. Produces identical results given identical inputs across 50 iterations', () => {
      const input = {
        item: baseItem,
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-DET-001',
          previousConditionRef: baseItem.currentConditionRef,
          currentConditionRef: {
            conditionId: 'COND-TEMP-02',
            entityRef: 'ENTITY_TEMPORAL',
            domain: 'DOMAIN_DEFAULT',
            temporalValidity: '2024-01-02'
          },
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      };

      const firstResult = ContinuityValidator.validateTransition(input);

      for (let i = 0; i < 50; i++) {
        const nextResult = ContinuityValidator.validateTransition(input);
        assert.strictEqual(nextResult.status, firstResult.status);
        assert.strictEqual(nextResult.allowed, firstResult.allowed);
        assert.strictEqual(nextResult.resultingStatus, firstResult.resultingStatus);
        assert.strictEqual(nextResult.findings.length, firstResult.findings.length);
      }
    });
  });
});
