import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DependencyGraph } from '../../../core/engine/dependency-graph.ts';
import { RuntimeRule, RuleType, RuleSeverity } from '../../../core/types/rules.ts';
import { ResultStatus } from '../../../core/types/result.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 2 - Dependency Graph Analysis', () => {
  const createMockRule = (id: string, deps: string[] = [], enabled = true): RuntimeRule => ({
    ruleId: id,
    version: '1.0.0',
    owner: 'TEST_SYSTEM',
    domain: 'STATE',
    type: RuleType.DETERMINISTIC,
    enabled,
    dependencies: deps,
    severity: RuleSeverity.MEDIUM
  });

  it('1. Calculates correct topological evaluation order', () => {
    // A depends on B, B depends on C
    // Order must evaluate: C first, then B, then A
    const ruleA = createMockRule('RULE-A', ['RULE-B']);
    const ruleB = createMockRule('RULE-B', ['RULE-C']);
    const ruleC = createMockRule('RULE-C', []);

    const rules = [ruleA, ruleB, ruleC];
    const res = DependencyGraph.getEvaluationOrder(rules);

    assert.strictEqual(res.status, ResultStatus.SUCCESS);
    assert.deepStrictEqual(res.data, ['RULE-C', 'RULE-B', 'RULE-A']);
  });

  it('2. Detects direct circular dependency', () => {
    // A -> B -> A
    const ruleA = createMockRule('RULE-A', ['RULE-B']);
    const ruleB = createMockRule('RULE-B', ['RULE-A']);

    const res = DependencyGraph.detectCycles([ruleA, ruleB]);
    assert.strictEqual(res.status, ResultStatus.FAILURE);
    assert.strictEqual(res.error, EngineErrorCode.CIRCULAR_DEPENDENCY);
    assert.match(res.message as string, /Circular dependency detected/);
  });

  it('3. Detects indirect circular dependency', () => {
    // A -> B -> C -> A
    const ruleA = createMockRule('RULE-A', ['RULE-B']);
    const ruleB = createMockRule('RULE-B', ['RULE-C']);
    const ruleC = createMockRule('RULE-C', ['RULE-A']);

    const res = DependencyGraph.detectCycles([ruleA, ruleB, ruleC]);
    assert.strictEqual(res.status, ResultStatus.FAILURE);
    assert.strictEqual(res.error, EngineErrorCode.CIRCULAR_DEPENDENCY);
  });

  it('4. Detects missing dependencies during rule set validation', () => {
    const ruleA = createMockRule('RULE-A', ['RULE-NONEXISTENT']);
    const allKnown = new Map<string, RuntimeRule>([['RULE-A', ruleA]]);

    const res = DependencyGraph.validateRuleSet([ruleA], allKnown);
    assert.strictEqual(res.status, ResultStatus.FAILURE);
    assert.strictEqual(res.error, EngineErrorCode.MISSING_DEPENDENCY);
  });

  it('5. Detects disabled dependencies during rule set validation', () => {
    const ruleDep = createMockRule('RULE-DEP', [], false); // disabled
    const ruleA = createMockRule('RULE-A', ['RULE-DEP'], true);

    const allKnown = new Map<string, RuntimeRule>([
      ['RULE-DEP', ruleDep],
      ['RULE-A', ruleA]
    ]);

    const res = DependencyGraph.validateRuleSet([ruleA], allKnown);
    assert.strictEqual(res.status, ResultStatus.FAILURE);
    assert.strictEqual(res.error, EngineErrorCode.DISABLED_DEPENDENCY);
  });
});
