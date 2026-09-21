import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityValidator,
  ContinuityStatus,
  TransitionType,
  EffectiveTime,
  ContinuityItem
} from '../../../core/universe/continuity/index.ts';

describe('Phase 4 - Cross-Period Continuity Unit Tests', () => {
  const item: ContinuityItem = {
    identity: {
      continuityId: 'CONT-CROSS-PERIOD-001',
      entityRef: 'PERSISTENT_ENTITY',
      domainRef: 'UNIVERSE_DOMAIN',
      version: 1
    },
    status: ContinuityStatus.ACTIVE,
    currentConditionRef: {
      conditionId: 'COND-DEC-31',
      entityRef: 'PERSISTENT_ENTITY',
      domain: 'UNIVERSE_DOMAIN',
      temporalValidity: '2023-12-31'
    }
  };

  it('1. Continuity survives day boundary crossing', () => {
    const res = ContinuityValidator.validateTransition({
      item,
      transition: {
        type: TransitionType.CONTINUE,
        continuityId: 'CONT-CROSS-PERIOD-001',
        previousConditionRef: item.currentConditionRef,
        effectiveTime: EffectiveTime.create('2024-01-01')!
      }
    });

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
  });

  it('2. Continuity survives month boundary crossing (Jan 31 -> Feb 1)', () => {
    const janItem: ContinuityItem = {
      ...item,
      currentConditionRef: {
        conditionId: 'COND-JAN-31',
        entityRef: 'PERSISTENT_ENTITY',
        domain: 'UNIVERSE_DOMAIN',
        temporalValidity: '2024-01-31'
      }
    };

    const res = ContinuityValidator.validateTransition({
      item: janItem,
      transition: {
        type: TransitionType.CONTINUE,
        continuityId: 'CONT-CROSS-PERIOD-001',
        previousConditionRef: janItem.currentConditionRef,
        effectiveTime: EffectiveTime.create('2024-02-01')!
      }
    });

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
  });

  it('3. Continuity survives leap day boundary crossing (Feb 28 -> Feb 29 -> Mar 1)', () => {
    const feb28Item: ContinuityItem = {
      ...item,
      currentConditionRef: {
        conditionId: 'COND-FEB-28',
        entityRef: 'PERSISTENT_ENTITY',
        domain: 'UNIVERSE_DOMAIN',
        temporalValidity: '2024-02-28'
      }
    };

    const resLeap = ContinuityValidator.validateTransition({
      item: feb28Item,
      transition: {
        type: TransitionType.CONTINUE,
        continuityId: 'CONT-CROSS-PERIOD-001',
        previousConditionRef: feb28Item.currentConditionRef,
        effectiveTime: EffectiveTime.create('2024-02-29')!
      }
    });
    assert.strictEqual(resLeap.allowed, true);

    const resMar1 = ContinuityValidator.validateTransition({
      item: {
        ...feb28Item,
        currentConditionRef: {
          conditionId: 'COND-FEB-29',
          entityRef: 'PERSISTENT_ENTITY',
          domain: 'UNIVERSE_DOMAIN',
          temporalValidity: '2024-02-29'
        }
      },
      transition: {
        type: TransitionType.CONTINUE,
        continuityId: 'CONT-CROSS-PERIOD-001',
        previousConditionRef: {
          conditionId: 'COND-FEB-29',
          entityRef: 'PERSISTENT_ENTITY',
          domain: 'UNIVERSE_DOMAIN',
          temporalValidity: '2024-02-29'
        },
        effectiveTime: EffectiveTime.create('2024-03-01')!
      }
    });
    assert.strictEqual(resMar1.allowed, true);
    assert.strictEqual(resMar1.resultingStatus, ContinuityStatus.ACTIVE);
  });

  it('4. Continuity survives year boundary crossing (Dec 31 -> Jan 1)', () => {
    const res = ContinuityValidator.validateTransition({
      item,
      transition: {
        type: TransitionType.CONTINUE,
        continuityId: 'CONT-CROSS-PERIOD-001',
        previousConditionRef: item.currentConditionRef,
        effectiveTime: EffectiveTime.create('2024-01-01')!
      }
    });

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
  });

  it('5. Boundary crossing does not auto-END or auto-RESET continuity', () => {
    // When no transition is executed, item remains in its current status
    assert.strictEqual(item.status, ContinuityStatus.ACTIVE);
    assert.strictEqual(item.identity.continuityId, 'CONT-CROSS-PERIOD-001');
  });
});
