import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RuleEvaluator } from '../../../core/engine/rule-evaluator.ts';
import {
  RuntimeRule,
  RuleType,
  RuleSeverity,
  RuleEvaluationStatus,
  ConditionOperator,
  ActionType
} from '../../../core/types/rules.ts';
import { ExecutionContextData } from '../../../core/types/execution-context.ts';

describe('Phase 2 - Deterministic Rule Evaluator', () => {
  const baseContext: ExecutionContextData = {
    flags: {
      IS_INITIALIZED: true,
      IS_CORRUPT: false
    },
    enums: {
      ENVIRONMENT: 'TEST'
    },
    values: {
      sequenceNumber: 10
    },
    references: [],
    constraints: [],
    metadata: {}
  };

  it('1. Returns NOT_APPLICABLE if rule is disabled', () => {
    const disabledRule: RuntimeRule = {
      ruleId: 'RULE-DISABLED-1',
      version: '1.0.0',
      owner: 'TEST_SYSTEM',
      domain: 'STATE',
      type: RuleType.DETERMINISTIC,
      enabled: false
    };

    const res = RuleEvaluator.evaluate(disabledRule, baseContext);
    assert.strictEqual(res.status, RuleEvaluationStatus.NOT_APPLICABLE);
    assert.strictEqual(res.error, 'Rule is disabled');
  });

  it('2. Returns BLOCKED if a required dependency was not PASSED', () => {
    const dependentRule: RuntimeRule = {
      ruleId: 'RULE-DEP-TEST',
      version: '1.0.0',
      owner: 'TEST_SYSTEM',
      domain: 'STATE',
      type: RuleType.VALIDATION,
      enabled: true,
      dependencies: ['RULE-PARENT']
    };

    const depResults = {
      'RULE-PARENT': RuleEvaluationStatus.FAILED
    };

    const res = RuleEvaluator.evaluate(dependentRule, baseContext, depResults);
    assert.strictEqual(res.status, RuleEvaluationStatus.BLOCKED);
    assert.match(res.error as string, /Dependency "RULE-PARENT" was not passed/);
  });

  it('3. Returns NOT_APPLICABLE if precondition is unsatisfied', () => {
    const ruleWithPrecond: RuntimeRule = {
      ruleId: 'RULE-PRECOND',
      version: '1.0.0',
      owner: 'TEST_SYSTEM',
      domain: 'STATE',
      type: RuleType.VALIDATION,
      enabled: true,
      preconditions: [
        {
          operator: ConditionOperator.EQ,
          field: 'enums.ENVIRONMENT',
          value: 'PRODUCTION' // Context has TEST
        }
      ],
      conditions: [
        {
          operator: ConditionOperator.GT,
          field: 'values.sequenceNumber',
          value: 0
        }
      ]
    };

    const res = RuleEvaluator.evaluate(ruleWithPrecond, baseContext);
    assert.strictEqual(res.status, RuleEvaluationStatus.NOT_APPLICABLE);
    assert.strictEqual(res.trace.preconditionsPassed, false);
  });

  it('4. Returns BLOCKED if forbidden condition is triggered', () => {
    const ruleWithForbidden: RuntimeRule = {
      ruleId: 'RULE-FORBIDDEN',
      version: '1.0.0',
      owner: 'TEST_SYSTEM',
      domain: 'STATE',
      type: RuleType.VALIDATION,
      enabled: true,
      forbiddenConditions: [
        {
          operator: ConditionOperator.EQ,
          field: 'flags.IS_INITIALIZED',
          value: true,
          description: 'Initialization already complete'
        }
      ],
      conditions: []
    };

    const res = RuleEvaluator.evaluate(ruleWithForbidden, baseContext);
    assert.strictEqual(res.status, RuleEvaluationStatus.BLOCKED);
    assert.match(res.error as string, /Forbidden condition/);
  });

  it('5. Successfully evaluates conditions and produces actions on PASS', () => {
    const passingRule: RuntimeRule = {
      ruleId: 'RULE-PASSING',
      version: '1.0.0',
      owner: 'TEST_SYSTEM',
      domain: 'STATE',
      type: RuleType.DETERMINISTIC,
      enabled: true,
      conditions: [
        {
          operator: ConditionOperator.EQ,
          field: 'flags.IS_INITIALIZED',
          value: true
        },
        {
          operator: ConditionOperator.GT,
          field: 'values.sequenceNumber',
          value: 5
        }
      ],
      actions: [
        {
          type: ActionType.SET_FLAG,
          target: 'CAN_PRODUCE',
          value: true
        }
      ],
      severity: RuleSeverity.HIGH
    };

    const res = RuleEvaluator.evaluate(passingRule, baseContext);
    assert.strictEqual(res.status, RuleEvaluationStatus.PASSED);
    assert.strictEqual(res.matchedConditions.length, 2);
    assert.strictEqual(res.producedActions?.length, 1);
    assert.strictEqual(res.producedActions[0].target, 'CAN_PRODUCE');
    assert.strictEqual(res.trace.conditionTraces.length, 2);
  });

  it('6. Returns FAILED when conditions are not met', () => {
    const failingRule: RuntimeRule = {
      ruleId: 'RULE-FAILING',
      version: '1.0.0',
      owner: 'TEST_SYSTEM',
      domain: 'STATE',
      type: RuleType.VALIDATION,
      enabled: true,
      conditions: [
        {
          operator: ConditionOperator.LT,
          field: 'values.sequenceNumber',
          value: 5 // sequenceNumber is 10
        }
      ]
    };

    const res = RuleEvaluator.evaluate(failingRule, baseContext);
    assert.strictEqual(res.status, RuleEvaluationStatus.FAILED);
    assert.strictEqual(res.failedConditions.length, 1);
    assert.strictEqual(res.producedActions?.length, 0);
  });
});
