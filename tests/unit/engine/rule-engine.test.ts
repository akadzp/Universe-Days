import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RuleRegistryEngine, RuleType, Rule } from '../../../core/engine/rule-engine.ts';
import { ResultStatus } from '../../../core/types/result.ts';

describe('Core Engine - Rule Engine & Registry', () => {
  let engine: RuleRegistryEngine;

  beforeEach(() => {
    engine = new RuleRegistryEngine();
  });

  it('1. Rule can be registered', () => {
    const sampleRule: Rule = {
      id: 'RULE-ARCH-101',
      owner: 'TEMPORAL_SYSTEM',
      domain: 'TEMPORAL',
      type: RuleType.VALIDATION,
      dependencies: [],
      metadata: { severity: 'CRITICAL' },
      enabled: true
    };

    const res = engine.register(sampleRule);
    assert.strictEqual(res.status, ResultStatus.SUCCESS);
    assert.strictEqual(engine.getAllRules().length, 1);
  });

  it('2. Rule can be found by ID', () => {
    const sampleRule: Rule = {
      id: 'RULE-ARCH-102',
      owner: 'OBJECT_SYSTEM',
      domain: 'OBJECT',
      type: RuleType.GATE,
      dependencies: [],
      metadata: {},
      enabled: true
    };

    engine.register(sampleRule);
    const found = engine.getRule('RULE-ARCH-102');
    assert.ok(found);
    assert.strictEqual(found.id, 'RULE-ARCH-102');
    assert.strictEqual(found.owner, 'OBJECT_SYSTEM');
  });

  it('3. Duplicate Rule ID is rejected', () => {
    const rule1: Rule = {
      id: 'RULE-DUPLICATE-01',
      owner: 'KNOWLEDGE_SYSTEM',
      domain: 'KNOWLEDGE',
      type: RuleType.DETERMINISTIC,
      dependencies: [],
      metadata: {},
      enabled: true
    };

    const firstReg = engine.register(rule1);
    assert.strictEqual(firstReg.status, ResultStatus.SUCCESS);

    const duplicateReg = engine.register(rule1);
    assert.strictEqual(duplicateReg.status, ResultStatus.FAILURE);
    assert.match(duplicateReg.error as string, /already registered/);
  });

  it('4. Disabled rule cannot be selected for execution', () => {
    const activeRule: Rule = {
      id: 'RULE-ACTIVE-01',
      owner: 'STATE_SYSTEM',
      domain: 'STATE',
      type: RuleType.VALIDATION,
      dependencies: [],
      metadata: {},
      enabled: true
    };

    const disabledRule: Rule = {
      id: 'RULE-DISABLED-01',
      owner: 'STATE_SYSTEM',
      domain: 'STATE',
      type: RuleType.VALIDATION,
      dependencies: [],
      metadata: {},
      enabled: false
    };

    engine.register(activeRule);
    engine.register(disabledRule);

    const executableRules = engine.getExecutableRules();
    assert.strictEqual(executableRules.length, 1);
    assert.strictEqual(executableRules[0].id, 'RULE-ACTIVE-01');

    // All rules should still contain both
    assert.strictEqual(engine.getAllRules().length, 2);
  });
});
