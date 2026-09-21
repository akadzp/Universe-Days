import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RuleEvaluator } from '../../core/engine/rule-evaluator.ts';
import { GateEngine } from '../../core/engine/gate-engine.ts';
import {
  RuntimeRule,
  RuleType,
  RuleSeverity,
  ConditionOperator,
  ActionType,
  GateMode,
  RuleEvaluationStatus
} from '../../core/types/rules.ts';
import { ExecutionContextData } from '../../core/types/execution-context.ts';

describe('Phase 2 Golden Test - Deterministic Rule & Gate Evaluation', () => {
  // Golden Fixture: Static context with deterministic values
  const goldenContext: ExecutionContextData = {
    flags: {
      FLAG_READY: true,
      FLAG_INITIALIZED: true,
      FLAG_CORRUPTED: false
    },
    enums: {
      RUN_MODE: 'STRICT_DETERMINISTIC',
      STATUS: 'STABLE'
    },
    values: {
      cycleIndex: 10,
      threshold: 100,
      errorCount: 0
    },
    references: [],
    constraints: ['NO_RETROGRADE'],
    metadata: {
      seed: 12345
    }
  };

  const goldenRule1: RuntimeRule = {
    ruleId: 'GOLDEN-RULE-001',
    version: '1.0.0',
    owner: 'TEMPORAL_SYSTEM',
    domain: 'TEMPORAL',
    type: RuleType.VALIDATION,
    enabled: true,
    preconditions: [
      {
        operator: ConditionOperator.EQ,
        field: 'flags.FLAG_READY',
        value: true
      }
    ],
    conditions: [
      {
        operator: ConditionOperator.GTE,
        field: 'values.cycleIndex',
        value: 1
      },
      {
        operator: ConditionOperator.EQ,
        field: 'flags.FLAG_CORRUPTED',
        value: false
      }
    ],
    forbiddenConditions: [
      {
        operator: ConditionOperator.GT,
        field: 'values.errorCount',
        value: 0
      }
    ],
    actions: [
      {
        type: ActionType.SET_FLAG,
        target: 'GOLDEN_TEMP_VALID',
        value: true
      }
    ],
    severity: RuleSeverity.CRITICAL
  };

  const goldenRule2: RuntimeRule = {
    ruleId: 'GOLDEN-RULE-002',
    version: '1.0.0',
    owner: 'STATE_SYSTEM',
    domain: 'STATE',
    type: RuleType.GATE,
    enabled: true,
    dependencies: ['GOLDEN-RULE-001'],
    conditions: [
      {
        operator: ConditionOperator.EQ,
        field: 'enums.RUN_MODE',
        value: 'STRICT_DETERMINISTIC'
      },
      {
        operator: ConditionOperator.LT,
        field: 'values.cycleIndex',
        value: 50
      }
    ],
    severity: RuleSeverity.HIGH
  };

  it('Verifies exact deterministic evaluation against frozen golden assertions', () => {
    // 1. Evaluate Rule 1
    const res1 = RuleEvaluator.evaluate(goldenRule1, goldenContext);

    assert.strictEqual(res1.ruleId, 'GOLDEN-RULE-001');
    assert.strictEqual(res1.ruleVersion, '1.0.0');
    assert.strictEqual(res1.status, RuleEvaluationStatus.PASSED);
    assert.strictEqual(res1.severity, RuleSeverity.CRITICAL);
    assert.strictEqual(res1.matchedConditions.length, 2);
    assert.strictEqual(res1.failedConditions.length, 0);
    assert.strictEqual(res1.producedActions?.length, 1);
    assert.strictEqual(res1.producedActions[0].target, 'GOLDEN_TEMP_VALID');

    // 2. Evaluate Rule 2 (passing Rule 1 result as dependency)
    const depResults = {
      'GOLDEN-RULE-001': res1.status
    };
    const res2 = RuleEvaluator.evaluate(goldenRule2, goldenContext, depResults);

    assert.strictEqual(res2.ruleId, 'GOLDEN-RULE-002');
    assert.strictEqual(res2.ruleVersion, '1.0.0');
    assert.strictEqual(res2.status, RuleEvaluationStatus.PASSED);
    assert.strictEqual(res2.severity, RuleSeverity.HIGH);
    assert.strictEqual(res2.matchedConditions.length, 2);
    assert.strictEqual(res2.failedConditions.length, 0);

    // 3. Evaluate Gate [ALL]
    const gateRes = GateEngine.evaluateGate(
      {
        gateId: 'GOLDEN-GATE-001',
        mode: GateMode.ALL,
        ruleIds: ['GOLDEN-RULE-001', 'GOLDEN-RULE-002']
      },
      {
        'GOLDEN-RULE-001': res1,
        'GOLDEN-RULE-002': res2
      }
    );

    // Golden verification points:
    assert.strictEqual(gateRes.passed, true);
    assert.strictEqual(gateRes.totalRules, 2);
    assert.strictEqual(gateRes.passedCount, 2);
    assert.strictEqual(gateRes.failedCount, 0);
    assert.strictEqual(gateRes.blockedCount, 0);
    assert.strictEqual(gateRes.summary, 'Gate [ALL] passed: All 2 rules passed.');
  });
});
