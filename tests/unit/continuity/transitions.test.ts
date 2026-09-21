import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityValidator,
  ContinuityStatus,
  TransitionType,
  EffectiveTime,
  ContinuityItem
} from '../../../core/universe/continuity/index.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 4 - Continuity Transitions Unit Tests', () => {
  const baseItem: ContinuityItem = {
    identity: {
      continuityId: 'CONT-ITEM-001',
      entityRef: 'ENTITY_ALPHA',
      domainRef: 'DOMAIN_DEFAULT',
      version: 1
    },
    status: ContinuityStatus.ACTIVE,
    currentConditionRef: {
      conditionId: 'COND-PREV-01',
      entityRef: 'ENTITY_ALPHA',
      domain: 'DOMAIN_DEFAULT',
      temporalValidity: '2024-01-01'
    }
  };

  // Section 51: CONTINUE
  describe('CONTINUE', () => {
    it('1. Validates a legitimate CONTINUE transition', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.CONTINUE,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 'VALID');
      assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
    });

    it('2. Strictly rejects CONTINUE when predecessor is missing', () => {
      const res = ContinuityValidator.validateTransition({
        item: {
          ...baseItem,
          currentConditionRef: null,
          previousConditionRef: null
        },
        transition: {
          type: TransitionType.CONTINUE,
          continuityId: 'CONT-ITEM-001',
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.MISSING_PREDECESSOR));
    });

    it('3. Strictly rejects CONTINUE after an item has ENDED', () => {
      const endedItem: ContinuityItem = {
        ...baseItem,
        status: ContinuityStatus.ENDED
      };

      const res = ContinuityValidator.validateTransition({
        item: endedItem,
        transition: {
          type: TransitionType.CONTINUE,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.INVALID_CONTINUITY_TRANSITION));
    });

    it('4. Rejects direct CONTINUE when item is SUSPENDED (must use RESUME)', () => {
      const suspendedItem: ContinuityItem = {
        ...baseItem,
        status: ContinuityStatus.SUSPENDED
      };

      const res = ContinuityValidator.validateTransition({
        item: suspendedItem,
        transition: {
          type: TransitionType.CONTINUE,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.INVALID_CONTINUITY_TRANSITION));
    });
  });

  // Section 52: CHANGE
  describe('CHANGE', () => {
    it('1. Validates a legitimate CHANGE transition', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          currentConditionRef: {
            conditionId: 'COND-CURR-02',
            entityRef: 'ENTITY_ALPHA',
            domain: 'DOMAIN_DEFAULT',
            temporalValidity: '2024-01-02'
          },
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 'VALID');
      assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
    });

    it('2. Strictly rejects CHANGE when current condition is missing', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.MISSING_CURRENT_CONDITION));
    });

    it('3. Strictly rejects CHANGE on temporal inversion (effective time earlier than previous condition)', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef, // 2024-01-01
          currentConditionRef: {
            conditionId: 'COND-CURR-02',
            entityRef: 'ENTITY_ALPHA',
            domain: 'DOMAIN_DEFAULT',
            temporalValidity: '2023-12-31'
          },
          effectiveTime: EffectiveTime.create('2023-12-31')! // Inversion: earlier than 2024-01-01
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.TEMPORAL_CONFLICT));
    });

    it('4. Rejects CHANGE if entityRef mismatches between previous and item identity', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: {
            conditionId: 'COND-PREV-01',
            entityRef: 'DIFFERENT_ENTITY_BETA',
            domain: 'DOMAIN_DEFAULT'
          },
          currentConditionRef: {
            conditionId: 'COND-CURR-02',
            entityRef: 'ENTITY_ALPHA',
            domain: 'DOMAIN_DEFAULT'
          },
          effectiveTime: EffectiveTime.create('2024-01-02')!
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.INVALID_CONTINUITY_IDENTITY));
    });
  });

  // Section 53: END
  describe('END', () => {
    it('1. Validates a legitimate END transition', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.END,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          terminationBasis: 'EXPLICIT_CONCLUSION',
          effectiveTime: EffectiveTime.create('2024-01-05')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 'VALID');
      assert.strictEqual(res.resultingStatus, ContinuityStatus.ENDED);
    });

    it('2. Strictly rejects reopening ENDED continuity without explicit authorization', () => {
      const endedItem: ContinuityItem = {
        ...baseItem,
        status: ContinuityStatus.ENDED
      };

      const res = ContinuityValidator.validateTransition({
        item: endedItem,
        transition: {
          type: TransitionType.NEW,
          continuityId: 'CONT-ITEM-001',
          effectiveTime: EffectiveTime.create('2024-01-06')!
        },
        context: {
          allowReopen: false
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.INVALID_TRANSITION));
    });
  });

  // Section 54: SUSPEND & RESUME
  describe('SUSPEND / RESUME', () => {
    it('1. Validates ACTIVE -> SUSPENDED transition', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.SUSPEND,
          continuityId: 'CONT-ITEM-001',
          effectiveTime: EffectiveTime.create('2024-01-03')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.resultingStatus, ContinuityStatus.SUSPENDED);
    });

    it('2. Validates SUSPENDED -> ACTIVE via RESUME', () => {
      const suspendedItem: ContinuityItem = {
        ...baseItem,
        status: ContinuityStatus.SUSPENDED
      };

      const res = ContinuityValidator.validateTransition({
        item: suspendedItem,
        transition: {
          type: TransitionType.RESUME,
          continuityId: 'CONT-ITEM-001',
          effectiveTime: EffectiveTime.create('2024-01-04')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
    });

    it('3. Rejects RESUME when item is NOT suspended', () => {
      // Trying to RESUME an already active item
      const res = ContinuityValidator.validateTransition({
        item: baseItem, // ACTIVE
        transition: {
          type: TransitionType.RESUME,
          continuityId: 'CONT-ITEM-001',
          effectiveTime: EffectiveTime.create('2024-01-04')!
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.INVALID_CONTINUITY_TRANSITION));
    });

    it('4. Allows END while suspended', () => {
      const suspendedItem: ContinuityItem = {
        ...baseItem,
        status: ContinuityStatus.SUSPENDED
      };

      const res = ContinuityValidator.validateTransition({
        item: suspendedItem,
        transition: {
          type: TransitionType.END,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          effectiveTime: EffectiveTime.create('2024-01-05')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.resultingStatus, ContinuityStatus.ENDED);
    });
  });

  // Section 55: TRANSFORM & Section 56: REPLACE
  describe('TRANSFORM & REPLACE', () => {
    it('1. Validates TRANSFORM with predecessor and successor preserving history', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.TRANSFORM,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          currentConditionRef: {
            conditionId: 'COND-TRANSFORMED-01',
            entityRef: 'ENTITY_ALPHA_PRIME',
            domain: 'DOMAIN_DEFAULT',
            temporalValidity: '2024-01-05'
          },
          effectiveTime: EffectiveTime.create('2024-01-05')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 'VALID');
      assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
    });

    it('2. Validates REPLACE with predecessor and successor preserving previous condition', () => {
      const res = ContinuityValidator.validateTransition({
        item: baseItem,
        transition: {
          type: TransitionType.REPLACE,
          continuityId: 'CONT-ITEM-001',
          previousConditionRef: baseItem.currentConditionRef,
          currentConditionRef: {
            conditionId: 'COND-REPLACEMENT-01',
            entityRef: 'ENTITY_ALPHA',
            domain: 'DOMAIN_DEFAULT',
            temporalValidity: '2024-01-06'
          },
          effectiveTime: EffectiveTime.create('2024-01-06')!
        }
      });

      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.status, 'VALID');
      assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
    });

    it('3. Rejects REPLACE when predecessor is missing', () => {
      const res = ContinuityValidator.validateTransition({
        item: {
          ...baseItem,
          currentConditionRef: null
        },
        transition: {
          type: TransitionType.REPLACE,
          continuityId: 'CONT-ITEM-001',
          currentConditionRef: {
            conditionId: 'COND-REPLACEMENT-01',
            entityRef: 'ENTITY_ALPHA',
            domain: 'DOMAIN_DEFAULT'
          },
          effectiveTime: EffectiveTime.create('2024-01-06')!
        }
      });

      assert.strictEqual(res.allowed, false);
      assert.ok(res.findings.some(f => f.code === EngineErrorCode.MISSING_PREDECESSOR));
    });
  });
});
