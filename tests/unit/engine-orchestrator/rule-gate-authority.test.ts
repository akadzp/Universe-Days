/**
 * Phase 9 Unit Tests: Rule Router, Gate Engine & Authority Integration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  RuleRegistryEngine,
  EngineRuleIntegration,
  ExecutionContext,
  CommandValidator,
  DomainRouter,
  RuleType,
  ConditionOperator,
  RuleEvaluationStatus,
  canPerformAction,
  ArchitectureAction,
  createGenericSeedUniverse,
  InMemoryUniverseRepository,
  makeSystemID,
  makeDomainID,
  makeRuleID,
  EngineErrorCode
} from '../../../core/index.ts';

describe('Phase 9: Rule Router, Gate Engine & Authority Integration', () => {
  const seed = createGenericSeedUniverse();
  const repo = new InMemoryUniverseRepository();
  repo.saveUniverse(seed, makeSystemID('ENGINE_SYSTEM'));

  describe('1. Rule Router Context Minimization', () => {
    const registry = new RuleRegistryEngine();

    registry.register({
      ruleId: makeRuleID('R_CHAR_01'),
      version: 1,
      owner: makeSystemID('CHARACTER_SYSTEM'),
      domain: makeDomainID('CHARACTER'),
      type: RuleType.DETERMINISTIC,
      enabled: true,
      conditions: [{ field: 'flags.HAS_CRITICAL_CONFLICT', operator: ConditionOperator.EQ, value: false }]
    });

    registry.register({
      ruleId: makeRuleID('R_REL_01'),
      version: 1,
      owner: makeSystemID('RELATIONSHIP_SYSTEM'),
      domain: makeDomainID('RELATIONSHIP'),
      type: RuleType.DETERMINISTIC,
      enabled: true,
      conditions: [{ field: 'actor', operator: ConditionOperator.EXISTS }]
    });

    registry.register({
      ruleId: makeRuleID('R_TEMPORAL_01'),
      version: 1,
      owner: makeSystemID('TEMPORAL_SYSTEM'),
      domain: makeDomainID('TEMPORAL'),
      type: RuleType.DETERMINISTIC,
      enabled: true,
      conditions: [{ field: 'temporal.universeTime', operator: ConditionOperator.EXISTS }]
    });

    const integration = new EngineRuleIntegration(registry);

    it('resolves only domain-relevant rules, excluding unrelated domain rules', () => {
      const selected = integration.resolveRelevantRules('TASK_CHAR_UPDATE', [makeDomainID('CHARACTER')]);
      assert.strictEqual(selected.length, 1);
      assert.strictEqual(selected[0].ruleId, 'R_CHAR_01');
    });

    it('evaluates rules and returns structured gate outcome', () => {
      const cmd = CommandValidator.validate({
        commandId: 'CMD_R_01',
        commandType: 'TASK_CHAR_UPDATE',
        requestedBy: makeSystemID('CHARACTER_SYSTEM'),
        universeContext: { universeId: 'UNIVERSE_GENERIC_SEED' }
      }).data!;

      const ctx = new ExecutionContext({
        executionId: 'EXEC_R_01',
        command: cmd,
        universe: seed,
        actor: makeSystemID('CHARACTER_SYSTEM'),
        temporalContext: { universeTime: '2024-01-01T00:00:00Z', engineTime: Date.now() },
        relevantRules: registry.getAllRules()
      });

      const gateRes = integration.evaluateRulesAndGate(ctx);
      assert.strictEqual(gateRes.success, true);
      assert.strictEqual(gateRes.data?.passed, true);
      assert.strictEqual(gateRes.data?.blocked, false);
    });
  });

  describe('2. Domain Router & Authority Enforcement', () => {
    it('resolves authoritative owner for known core domains', () => {
      const charOwner = DomainRouter.resolveOwner('CHARACTER');
      assert.strictEqual(charOwner.success, true);
      assert.strictEqual(charOwner.data, 'CHARACTER_SYSTEM');

      const tempOwner = DomainRouter.resolveOwner('TEMPORAL');
      assert.strictEqual(tempOwner.success, true);
      assert.strictEqual(tempOwner.data, 'TEMPORAL_SYSTEM');
    });

    it('blocks and rejects unknown domains without guessing', () => {
      const unknownRes = DomainRouter.resolveOwner('UNKNOWN_FICTIONAL_REALM');
      assert.strictEqual(unknownRes.success, false);
      assert.strictEqual(unknownRes.error, EngineErrorCode.DOMAIN_OWNER_NOT_FOUND);
    });

    it('blocks unauthorized direct mutation requests on domain from non-owner actor', () => {
      const authRes = canPerformAction('UNAUTHORIZED_THIRD_PARTY_AGENT', 'CHARACTER', ArchitectureAction.APPLY_CHANGE);
      assert.strictEqual(authRes.success, false);
      assert.strictEqual(typeof authRes.error === 'string' && authRes.error.includes('Only "CHARACTER_SYSTEM" may APPLY_CHANGE'), true);
    });
  });
});
