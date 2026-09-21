import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RuleRouter } from '../../../core/engine/rule-router.ts';
import { RuleRegistryEngine } from '../../../core/engine/rule-engine.ts';
import { RuntimeRule, RuleType, RuleSeverity } from '../../../core/types/rules.ts';

describe('Phase 2 - Rule Router Resolution', () => {
  let registry: RuleRegistryEngine;
  let router: RuleRouter;

  beforeEach(() => {
    registry = new RuleRegistryEngine();

    const rule1: RuntimeRule = {
      ruleId: 'RULE-TEMPORAL-01',
      version: '1.0.0',
      owner: 'TEMPORAL_SYSTEM',
      domain: 'TEMPORAL',
      type: RuleType.VALIDATION,
      enabled: true,
      dependencies: [],
      severity: RuleSeverity.HIGH
    };

    const rule2: RuntimeRule = {
      ruleId: 'RULE-INSTANCE-01',
      version: '1.0.0',
      owner: 'INSTANCE_MANAGEMENT_SYSTEM',
      domain: 'INSTANCE_MANAGEMENT',
      type: RuleType.GATE,
      enabled: true,
      dependencies: ['RULE-TEMPORAL-01'], // Depends on TEMPORAL-01
      severity: RuleSeverity.HIGH
    };

    const rule3: RuntimeRule = {
      ruleId: 'RULE-INSTANCE-DISABLED',
      version: '1.0.0',
      owner: 'INSTANCE_MANAGEMENT_SYSTEM',
      domain: 'INSTANCE_MANAGEMENT',
      type: RuleType.VALIDATION,
      enabled: false,
      dependencies: [],
      severity: RuleSeverity.LOW
    };

    registry.register(rule1);
    registry.register(rule2);
    registry.register(rule3);

    router = new RuleRouter(registry);
  });

  it('1. Resolves rules by domain and transitively includes dependencies', () => {
    // Requesting INSTANCE_MANAGEMENT domain should also transitively pull RULE-TEMPORAL-01
    const routingResult = router.resolveRulesForTask({
      taskId: 'TASK-SNAPSHOT-01',
      requiredDomains: ['INSTANCE_MANAGEMENT'],
      includeDependencies: true
    });

    const ruleIds = routingResult.selectedRules.map(r => String(r.ruleId));
    assert.ok(ruleIds.includes('RULE-INSTANCE-01'));
    assert.ok(ruleIds.includes('RULE-TEMPORAL-01')); // Pulled via dependency
    assert.strictEqual(ruleIds.includes('RULE-INSTANCE-DISABLED'), false); // Disabled rule excluded
  });

  it('2. Topologically orders resolved rules so dependencies come first', () => {
    const routingResult = router.resolveRulesForTask({
      taskId: 'TASK-SNAPSHOT-02',
      requiredDomains: ['INSTANCE_MANAGEMENT'],
      includeDependencies: true
    });

    const ruleIds = routingResult.selectedRules.map(r => String(r.ruleId));
    const idxTemporal = ruleIds.indexOf('RULE-TEMPORAL-01');
    const idxInstance = ruleIds.indexOf('RULE-INSTANCE-01');

    assert.ok(idxTemporal < idxInstance, 'Dependency RULE-TEMPORAL-01 must appear before RULE-INSTANCE-01');
  });

  it('3. Flags missing and disabled rule IDs when specifically requested', () => {
    const routingResult = router.resolveRulesForTask({
      taskId: 'TASK-SPECIFIC-01',
      requiredDomains: [],
      requiredRuleIds: ['RULE-INSTANCE-DISABLED', 'NON_EXISTENT_RULE']
    });

    assert.ok(routingResult.disabledRuleIds?.includes('RULE-INSTANCE-DISABLED'));
    assert.ok(routingResult.missingRuleIds?.includes('NON_EXISTENT_RULE'));
  });
});
