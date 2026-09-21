import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateCondition } from '../../../core/engine/conditions.ts';
import { ConditionOperator, Condition } from '../../../core/types/rules.ts';
import { ExecutionContextData } from '../../../core/types/execution-context.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 2 - Condition Evaluator', () => {
  const sampleContext: ExecutionContextData = {
    flags: {
      CAN_CONTINUE: true,
      HAS_ERROR: false,
      CORRUPTED: false
    },
    enums: {
      PHASE: 'PHASE_2',
      STATUS: 'READY'
    },
    values: {
      count: 42,
      score: 95.5,
      role: 'ADMIN',
      tags: ['alpha', 'beta', 'gamma'],
      nested: {
        deepValue: 100,
        name: 'PocerEngine'
      }
    },
    references: [],
    constraints: [],
    metadata: {}
  };

  it('1. Evaluates EQ and NEQ conditions', () => {
    const eqCond: Condition = {
      operator: ConditionOperator.EQ,
      field: 'enums.STATUS',
      value: 'READY'
    };
    const res1 = evaluateCondition(eqCond, sampleContext);
    assert.strictEqual(res1.matched, true);

    const neqCond: Condition = {
      operator: ConditionOperator.NEQ,
      field: 'enums.STATUS',
      value: 'BLOCKED'
    };
    const res2 = evaluateCondition(neqCond, sampleContext);
    assert.strictEqual(res2.matched, true);

    const failEq: Condition = {
      operator: ConditionOperator.EQ,
      field: 'values.count',
      value: 999
    };
    const res3 = evaluateCondition(failEq, sampleContext);
    assert.strictEqual(res3.matched, false);
  });

  it('2. Evaluates GT, GTE, LT, LTE comparisons', () => {
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.GT, field: 'values.count', value: 40 }, sampleContext).matched,
      true
    );
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.GT, field: 'values.count', value: 42 }, sampleContext).matched,
      false
    );
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.GTE, field: 'values.count', value: 42 }, sampleContext).matched,
      true
    );
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.LT, field: 'values.score', value: 100 }, sampleContext).matched,
      true
    );
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.LTE, field: 'values.score', value: 95.5 }, sampleContext).matched,
      true
    );
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.LT, field: 'values.score', value: 90 }, sampleContext).matched,
      false
    );
  });

  it('3. Evaluates IN and NOT_IN array operations', () => {
    const inCond: Condition = {
      operator: ConditionOperator.IN,
      field: 'values.role',
      value: ['USER', 'ADMIN', 'MODERATOR']
    };
    assert.strictEqual(evaluateCondition(inCond, sampleContext).matched, true);

    const notInCond: Condition = {
      operator: ConditionOperator.NOT_IN,
      field: 'values.role',
      value: ['GUEST', 'ANONYMOUS']
    };
    assert.strictEqual(evaluateCondition(notInCond, sampleContext).matched, true);

    const inCondFail: Condition = {
      operator: ConditionOperator.IN,
      field: 'values.role',
      value: ['GUEST']
    };
    assert.strictEqual(evaluateCondition(inCondFail, sampleContext).matched, false);
  });

  it('4. Evaluates EXISTS and NOT_EXISTS conditions', () => {
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.EXISTS, field: 'values.nested.deepValue' }, sampleContext).matched,
      true
    );
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.NOT_EXISTS, field: 'values.nested.missing' }, sampleContext).matched,
      true
    );
    assert.strictEqual(
      evaluateCondition({ operator: ConditionOperator.EXISTS, field: 'values.nonExistent' }, sampleContext).matched,
      false
    );
  });

  it('5. Evaluates composite AND, OR, NOT condition trees', () => {
    const compositeTree: Condition = {
      operator: ConditionOperator.AND,
      children: [
        { operator: ConditionOperator.EQ, field: 'flags.CAN_CONTINUE', value: true },
        {
          operator: ConditionOperator.OR,
          children: [
            { operator: ConditionOperator.EQ, field: 'values.count', value: 10 },
            { operator: ConditionOperator.GT, field: 'values.count', value: 20 }
          ]
        },
        {
          operator: ConditionOperator.NOT,
          children: [
            { operator: ConditionOperator.EQ, field: 'flags.HAS_ERROR', value: true }
          ]
        }
      ]
    };

    const res = evaluateCondition(compositeTree, sampleContext);
    assert.strictEqual(res.matched, true);
  });

  it('6. Rejects unsupported operators gracefully with error code', () => {
    const invalidCond = {
      operator: 'REGEX_MATCH' as ConditionOperator,
      field: 'values.role',
      value: '.*'
    };
    const res = evaluateCondition(invalidCond, sampleContext);
    assert.strictEqual(res.matched, false);
    assert.strictEqual(res.error, EngineErrorCode.UNSUPPORTED_OPERATOR);
  });
});
