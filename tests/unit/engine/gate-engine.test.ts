import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GateEngine } from '../../../core/engine/gate-engine.ts';
import {
  GateDefinition,
  GateMode,
  RuleResult,
  RuleEvaluationStatus,
  RuleSeverity
} from '../../../core/types/rules.ts';

describe('Phase 2 - Gate Engine Evaluation', () => {
  const mockResult = (ruleId: string, status: RuleEvaluationStatus): RuleResult => ({
    ruleId,
    ruleVersion: '1.0.0',
    status,
    severity: RuleSeverity.MEDIUM,
    matchedConditions: [],
    failedConditions: [],
    dependencyResults: {},
    trace: {
      ruleId,
      ruleVersion: '1.0.0',
      startedAt: Date.now(),
      completedAt: Date.now(),
      evaluatedDependencies: [],
      preconditionsPassed: true,
      conditionTraces: [],
      forbiddenConditionTraces: [],
      executedActions: []
    }
  });

  it('1. Evaluates Gate [ALL]: succeeds only if all constituent rules PASS', () => {
    const gate: GateDefinition = {
      gateId: 'GATE-001',
      mode: GateMode.ALL,
      ruleIds: ['RULE-1', 'RULE-2']
    };

    const allPassedResults = {
      'RULE-1': mockResult('RULE-1', RuleEvaluationStatus.PASSED),
      'RULE-2': mockResult('RULE-2', RuleEvaluationStatus.PASSED)
    };
    const res1 = GateEngine.evaluateGate(gate, allPassedResults);
    assert.strictEqual(res1.passed, true);
    assert.strictEqual(res1.passedCount, 2);

    const mixedResults = {
      'RULE-1': mockResult('RULE-1', RuleEvaluationStatus.PASSED),
      'RULE-2': mockResult('RULE-2', RuleEvaluationStatus.FAILED)
    };
    const res2 = GateEngine.evaluateGate(gate, mixedResults);
    assert.strictEqual(res2.passed, false);
    assert.strictEqual(res2.failedCount, 1);
  });

  it('2. Evaluates Gate [ANY]: succeeds if at least one rule PASSES', () => {
    const gate: GateDefinition = {
      gateId: 'GATE-002',
      mode: GateMode.ANY,
      ruleIds: ['RULE-1', 'RULE-2']
    };

    const mixedResults = {
      'RULE-1': mockResult('RULE-1', RuleEvaluationStatus.PASSED),
      'RULE-2': mockResult('RULE-2', RuleEvaluationStatus.FAILED)
    };
    const res1 = GateEngine.evaluateGate(gate, mixedResults);
    assert.strictEqual(res1.passed, true);

    const allFailedResults = {
      'RULE-1': mockResult('RULE-1', RuleEvaluationStatus.FAILED),
      'RULE-2': mockResult('RULE-2', RuleEvaluationStatus.FAILED)
    };
    const res2 = GateEngine.evaluateGate(gate, allFailedResults);
    assert.strictEqual(res2.passed, false);
  });

  it('3. Evaluates Gate [NONE]: succeeds if NO rules pass', () => {
    const gate: GateDefinition = {
      gateId: 'GATE-003',
      mode: GateMode.NONE,
      ruleIds: ['RULE-1', 'RULE-2']
    };

    const noPassedResults = {
      'RULE-1': mockResult('RULE-1', RuleEvaluationStatus.FAILED),
      'RULE-2': mockResult('RULE-2', RuleEvaluationStatus.FAILED)
    };
    const res1 = GateEngine.evaluateGate(gate, noPassedResults);
    assert.strictEqual(res1.passed, true);

    const onePassedResults = {
      'RULE-1': mockResult('RULE-1', RuleEvaluationStatus.PASSED),
      'RULE-2': mockResult('RULE-2', RuleEvaluationStatus.FAILED)
    };
    const res2 = GateEngine.evaluateGate(gate, onePassedResults);
    assert.strictEqual(res2.passed, false);
  });

  it('4. Handles blocked or missing rules correctly', () => {
    const gate: GateDefinition = {
      gateId: 'GATE-004',
      mode: GateMode.ALL,
      ruleIds: ['RULE-1', 'RULE-2']
    };

    const blockedResults = {
      'RULE-1': mockResult('RULE-1', RuleEvaluationStatus.PASSED),
      'RULE-2': mockResult('RULE-2', RuleEvaluationStatus.BLOCKED)
    };
    const res = GateEngine.evaluateGate(gate, blockedResults);
    assert.strictEqual(res.passed, false);
    assert.strictEqual(res.blockedCount, 1);
  });
});
