import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ContinuityChainValidator,
  ContinuityChainStep,
  TransitionType,
  EffectiveTime
} from '../../../core/universe/continuity/index.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 4 - Continuity Chain and Graph Unit Tests', () => {
  it('1. Validates an ordered linear chain (Condition A -> Transition 1 -> Condition B -> Transition 2 -> Condition C)', () => {
    const steps: ContinuityChainStep[] = [
      {
        fromCondition: { conditionId: 'COND-A', entityRef: 'ENTITY_X', domain: 'DEFAULT', temporalValidity: '2024-01-01' },
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-X',
          effectiveTime: EffectiveTime.create('2024-01-02')!
        },
        toCondition: { conditionId: 'COND-B', entityRef: 'ENTITY_X', domain: 'DEFAULT', temporalValidity: '2024-01-02' }
      },
      {
        fromCondition: { conditionId: 'COND-B', entityRef: 'ENTITY_X', domain: 'DEFAULT', temporalValidity: '2024-01-02' },
        transition: {
          type: TransitionType.CHANGE,
          continuityId: 'CONT-X',
          effectiveTime: EffectiveTime.create('2024-01-03')!
        },
        toCondition: { conditionId: 'COND-C', entityRef: 'ENTITY_X', domain: 'DEFAULT', temporalValidity: '2024-01-03' }
      }
    ];

    const result = ContinuityChainValidator.validateChain(steps, 'CHAIN-ABC');
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.status, 'VALID');
    assert.deepStrictEqual(result.nodes, ['COND-A', 'COND-B', 'COND-C']);
    assert.deepStrictEqual(result.transitions, [TransitionType.CHANGE, TransitionType.CHANGE]);
    assert.strictEqual(result.findings.length, 0);
  });

  it('2. Detects broken link in chain (fromCondition does not match previous toCondition)', () => {
    const steps: ContinuityChainStep[] = [
      {
        fromCondition: { conditionId: 'COND-A', entityRef: 'ENTITY_X', domain: 'DEFAULT' },
        transition: { type: TransitionType.CHANGE, continuityId: 'CONT-X', effectiveTime: EffectiveTime.create('2024-01-02')! },
        toCondition: { conditionId: 'COND-B', entityRef: 'ENTITY_X', domain: 'DEFAULT' }
      },
      {
        fromCondition: { conditionId: 'COND-DISCONNECTED', entityRef: 'ENTITY_X', domain: 'DEFAULT' }, // Broken
        transition: { type: TransitionType.CHANGE, continuityId: 'CONT-X', effectiveTime: EffectiveTime.create('2024-01-03')! },
        toCondition: { conditionId: 'COND-C', entityRef: 'ENTITY_X', domain: 'DEFAULT' }
      }
    ];

    const result = ContinuityChainValidator.validateChain(steps);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.brokenAt, 1);
    assert.ok(result.findings.some(f => f.code === EngineErrorCode.CONTINUITY_CONFLICT));
  });

  it('3. Detects circular reference in linear chain (A -> B -> A)', () => {
    const steps: ContinuityChainStep[] = [
      {
        fromCondition: { conditionId: 'COND-A', entityRef: 'ENTITY_X', domain: 'DEFAULT', temporalValidity: '2024-01-01' },
        transition: { type: TransitionType.CHANGE, continuityId: 'CONT-X', effectiveTime: EffectiveTime.create('2024-01-02')! },
        toCondition: { conditionId: 'COND-B', entityRef: 'ENTITY_X', domain: 'DEFAULT', temporalValidity: '2024-01-02' }
      },
      {
        fromCondition: { conditionId: 'COND-B', entityRef: 'ENTITY_X', domain: 'DEFAULT', temporalValidity: '2024-01-02' },
        transition: { type: TransitionType.CHANGE, continuityId: 'CONT-X', effectiveTime: EffectiveTime.create('2024-01-03')! },
        toCondition: { conditionId: 'COND-A', entityRef: 'ENTITY_X', domain: 'DEFAULT', temporalValidity: '2024-01-03' } // Cycle back to COND-A
      }
    ];

    const result = ContinuityChainValidator.validateChain(steps);
    assert.strictEqual(result.valid, false);
    assert.ok(result.findings.some(f => f.code === EngineErrorCode.CIRCULAR_CONTINUITY));
  });

  it('4. Detects cycles in branching graph', () => {
    const edgesWithCycle = [
      { from: 'NODE-1', to: 'NODE-2', transitionType: 'CHANGE' },
      { from: 'NODE-2', to: 'NODE-3', transitionType: 'CHANGE' },
      { from: 'NODE-3', to: 'NODE-1', transitionType: 'CHANGE' } // Cycle 1 -> 2 -> 3 -> 1
    ];

    const graphResult = ContinuityChainValidator.validateGraph(edgesWithCycle);
    assert.strictEqual(graphResult.valid, false);
    assert.ok(graphResult.cycles.length > 0);
    assert.ok(graphResult.findings.some(f => f.code === EngineErrorCode.CIRCULAR_CONTINUITY));
  });

  it('5. Validates acyclic branching graph (A -> B, A -> C)', () => {
    const acyclicEdges = [
      { from: 'NODE-A', to: 'NODE-B', transitionType: 'CHANGE' },
      { from: 'NODE-A', to: 'NODE-C', transitionType: 'CHANGE' }
    ];

    const graphResult = ContinuityChainValidator.validateGraph(acyclicEdges);
    assert.strictEqual(graphResult.valid, true);
    assert.strictEqual(graphResult.cycles.length, 0);
  });
});
