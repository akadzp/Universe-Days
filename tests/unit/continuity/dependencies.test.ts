import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityDependencyEvaluator,
  ContinuityStatus,
  ContinuityValidator,
  TransitionType,
  EffectiveTime,
  ContinuityItem
} from '../../../core/universe/continuity/index.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 4 - Continuity Dependencies Unit Tests', () => {
  it('1. Evaluates valid item dependency successfully', () => {
    const contextItems = new Map<string, { status: ContinuityStatus; entityRef?: string }>();
    contextItems.set('CONT-DEP-REQ', { status: ContinuityStatus.ACTIVE, entityRef: 'ENTITY_REQUIRED' });

    const result = ContinuityDependencyEvaluator.evaluateAll(
      [
        {
          type: 'CONTINUITY_ITEM',
          targetId: 'CONT-DEP-REQ',
          expectedStatus: ContinuityStatus.ACTIVE,
          severity: 'CRITICAL'
        }
      ],
      { items: contextItems }
    );

    assert.strictEqual(result.satisfied, true);
    assert.strictEqual(result.status, 'VALID');
    assert.strictEqual(result.findings.length, 0);
  });

  it('2. Reports missing dependency and marks status as BLOCKED', () => {
    const contextItems = new Map<string, { status: ContinuityStatus }>();

    const result = ContinuityDependencyEvaluator.evaluateAll(
      [
        {
          type: 'CONTINUITY_ITEM',
          targetId: 'CONT-MISSING-ITEM',
          severity: 'CRITICAL'
        }
      ],
      { items: contextItems }
    );

    assert.strictEqual(result.satisfied, false);
    assert.strictEqual(result.status, 'BLOCKED');
    assert.ok(result.findings.some(f => f.code === EngineErrorCode.MISSING_DEPENDENCY));
  });

  it('3. Reports failed dependency when target status does not match expectation', () => {
    const contextItems = new Map<string, { status: ContinuityStatus }>();
    contextItems.set('CONT-DEP-REQ', { status: ContinuityStatus.ENDED });

    const result = ContinuityDependencyEvaluator.evaluateAll(
      [
        {
          type: 'CONTINUITY_ITEM',
          targetId: 'CONT-DEP-REQ',
          expectedStatus: ContinuityStatus.ACTIVE,
          severity: 'CRITICAL'
        }
      ],
      { items: contextItems }
    );

    assert.strictEqual(result.satisfied, false);
    assert.strictEqual(result.status, 'BLOCKED');
    assert.ok(result.findings.some(f => f.code === EngineErrorCode.DEPENDENCY_FAILED));
  });

  it('4. Detects circular / duplicate dependency in dependency list', () => {
    const result = ContinuityDependencyEvaluator.evaluateAll([
      { type: 'CONTINUITY_ITEM', targetId: 'CONT-CYCLE-A' },
      { type: 'CONTINUITY_ITEM', targetId: 'CONT-CYCLE-A' }
    ]);

    assert.strictEqual(result.satisfied, false);
    assert.strictEqual(result.status, 'BLOCKED');
    assert.ok(result.findings.some(f => f.code === EngineErrorCode.CIRCULAR_DEPENDENCY));
  });

  it('5. Blocks continuity transition when dependency evaluation fails', () => {
    const item: ContinuityItem = {
      identity: {
        continuityId: 'CONT-MAIN-001',
        entityRef: 'ENTITY_MAIN',
        domainRef: 'DOMAIN_DEFAULT',
        version: 1
      },
      status: ContinuityStatus.ACTIVE,
      currentConditionRef: {
        conditionId: 'COND-MAIN-01',
        entityRef: 'ENTITY_MAIN',
        domain: 'DOMAIN_DEFAULT'
      }
    };

    const res = ContinuityValidator.validateTransition({
      item,
      transition: {
        type: TransitionType.CHANGE,
        continuityId: 'CONT-MAIN-001',
        previousConditionRef: item.currentConditionRef,
        currentConditionRef: {
          conditionId: 'COND-MAIN-02',
          entityRef: 'ENTITY_MAIN',
          domain: 'DOMAIN_DEFAULT'
        },
        effectiveTime: EffectiveTime.create('2024-01-02')!,
        dependencies: [
          {
            type: 'CONTINUITY_ITEM',
            targetId: 'NON_EXISTENT_PREREQUISITE',
            severity: 'CRITICAL'
          }
        ]
      },
      context: {
        items: new Map() // Empty items => missing dependency
      }
    });

    assert.strictEqual(res.allowed, false);
    assert.ok(res.findings.some(f => f.code === EngineErrorCode.MISSING_DEPENDENCY));
  });
});
