import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityValidator,
  ContinuityStatus,
  TransitionType,
  EffectiveTime,
  ContinuityItem
} from '../../../core/universe/continuity/index.ts';

describe('Phase 4 - UNKNOWN & UNRESOLVED Unit Tests', () => {
  const baseItem: ContinuityItem = {
    identity: {
      continuityId: 'CONT-UNKNOWN-001',
      entityRef: 'ENTITY_MYSTERY',
      domainRef: 'DOMAIN_DEFAULT',
      version: 1
    },
    status: ContinuityStatus.UNKNOWN,
    currentConditionRef: null
  };

  it('1. Preserves UNKNOWN status explicitly without auto-converting to NEW or ACTIVE', () => {
    const res = ContinuityValidator.validateTransition({
      item: baseItem,
      transition: {
        type: TransitionType.UNKNOWN,
        continuityId: 'CONT-UNKNOWN-001',
        effectiveTime: EffectiveTime.create('2024-01-01')!
      }
    });

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.resultingStatus, ContinuityStatus.UNKNOWN);
  });

  it('2. Preserves UNRESOLVED status explicitly without converting to CONTINUE or CANCELLED', () => {
    const activeItem: ContinuityItem = {
      ...baseItem,
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: {
        conditionId: 'COND-DISPUTED-01',
        entityRef: 'ENTITY_MYSTERY',
        domain: 'DOMAIN_DEFAULT',
        temporalValidity: '2024-01-01'
      }
    };

    const res = ContinuityValidator.validateTransition({
      item: activeItem,
      transition: {
        type: TransitionType.UNRESOLVED,
        continuityId: 'CONT-UNKNOWN-001',
        previousConditionRef: activeItem.currentConditionRef,
        effectiveTime: EffectiveTime.create('2024-01-02')!,
        metadata: { conflictReason: 'Two conflicting sources detected' }
      }
    });

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.resultingStatus, ContinuityStatus.UNRESOLVED);
  });

  it('3. Does NOT convert UNKNOWN to NEW automatically unless an explicit NEW transition is provided', () => {
    const res = ContinuityValidator.validateTransition({
      item: baseItem,
      transition: {
        type: TransitionType.CONTINUE, // Cannot continue without predecessor
        continuityId: 'CONT-UNKNOWN-001',
        effectiveTime: EffectiveTime.create('2024-01-02')!
      }
    });

    assert.strictEqual(res.allowed, false);
    // Did not silently assume NEW
    assert.strictEqual(res.resultingStatus, ContinuityStatus.UNKNOWN);
  });

  it('4. Requires an explicit authorized transition to resolve an UNRESOLVED item', () => {
    const unresolvedItem: ContinuityItem = {
      ...baseItem,
      status: ContinuityStatus.UNRESOLVED,
      currentConditionRef: {
        conditionId: 'COND-DISPUTED-01',
        entityRef: 'ENTITY_MYSTERY',
        domain: 'DOMAIN_DEFAULT',
        temporalValidity: '2024-01-01'
      }
    };

    // Transition with explicit CHANGE resolves it
    const res = ContinuityValidator.validateTransition({
      item: unresolvedItem,
      transition: {
        type: TransitionType.CHANGE,
        continuityId: 'CONT-UNKNOWN-001',
        previousConditionRef: unresolvedItem.currentConditionRef,
        currentConditionRef: {
          conditionId: 'COND-RESOLVED-02',
          entityRef: 'ENTITY_MYSTERY',
          domain: 'DOMAIN_DEFAULT',
          temporalValidity: '2024-01-03'
        },
        effectiveTime: EffectiveTime.create('2024-01-03')!
      }
    });

    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.resultingStatus, ContinuityStatus.ACTIVE);
  });
});
