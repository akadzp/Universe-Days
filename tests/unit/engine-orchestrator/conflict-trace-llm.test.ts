/**
 * Phase 9 Unit Tests: Conflict Handling, Trace, Idempotency & LLM Boundary
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ConflictOrchestrator,
  IdempotencyStore,
  MockLLMAdapter,
  ExecutionContext,
  CommandValidator,
  createGenericSeedUniverse,
  InMemoryUniverseRepository,
  makeSystemID,
  makeDomainID,
  EngineErrorCode
} from '../../../core/index.ts';

describe('Phase 9: Conflict Handling, Trace, Idempotency & LLM Boundary', () => {
  const seed = createGenericSeedUniverse();
  const repo = new InMemoryUniverseRepository();
  repo.saveUniverse(seed, makeSystemID('ENGINE_SYSTEM'));

  const validCmd = CommandValidator.validate({
    commandId: 'CMD_CONF_01',
    commandType: 'TEST_CONFLICT_TRACE',
    requestedBy: makeSystemID('ENGINE_SYSTEM'),
    universeContext: { universeId: 'UNIVERSE_GENERIC_SEED' },
    idempotencyKey: 'IDEMP_KEY_001'
  }).data!;

  const createCtx = () =>
    new ExecutionContext({
      executionId: 'EXEC_CONF_01',
      command: validCmd,
      universe: seed,
      actor: makeSystemID('ENGINE_SYSTEM'),
      temporalContext: { universeTime: '2024-01-01T00:00:00Z', engineTime: Date.now() }
    });

  describe('1. Conflict Orchestration', () => {
    it('detects, routes, and records a domain conflict to the authoritative owner', () => {
      const ctx = createCtx();

      const res = ConflictOrchestrator.handleConflict(ctx, {
        conflictId: 'CONF_001',
        domain: makeDomainID('CHARACTER'),
        sourceSystem: makeSystemID('STORY_SYSTEM'),
        conflictingReferences: ['CHAR_GENERIC_A'],
        severity: 'CRITICAL',
        traceability: { sourceSystem: makeSystemID('STORY_SYSTEM'), generatedAt: Date.now() },
        description: 'Two conflicting location claims for character'
      });

      assert.strictEqual(res.success, false); // Critical conflict returns ResultStatus.CONFLICT / blocked
      assert.strictEqual(ctx.conflicts.length, 1);
      assert.strictEqual(ctx.conflicts[0].targetOwner, 'CHARACTER_SYSTEM');
      assert.strictEqual(ctx.hasCriticalConflicts(), true);

      // Verify that blocking conflict evaluator halts progress
      const evalBlock = ConflictOrchestrator.evaluateBlockingConflicts(ctx);
      assert.strictEqual(evalBlock.success, false);
      assert.strictEqual(evalBlock.error, EngineErrorCode.EXECUTION_CONFLICT);
    });
  });

  describe('2. Idempotency Store', () => {
    it('detects duplicate commands and prevents redundant execution', () => {
      const store = new IdempotencyStore();

      const reg1 = store.checkAndRegister(validCmd);
      assert.strictEqual(reg1.success, true);
      assert.strictEqual(reg1.data?.isDuplicate, false);

      const reg2 = store.checkAndRegister(validCmd);
      assert.strictEqual(reg2.success, true);
      assert.strictEqual(reg2.data?.isDuplicate, true);
      assert.strictEqual(reg2.data?.previousRecord?.executionCount, 2);
    });

    it('rejects conflicting commandType with the same idempotency key', () => {
      const store = new IdempotencyStore();
      store.checkAndRegister(validCmd);

      const conflictingCmd = CommandValidator.validate({
        commandId: 'CMD_CONF_02',
        commandType: 'DIFFERENT_TYPE',
        requestedBy: makeSystemID('ENGINE_SYSTEM'),
        universeContext: { universeId: 'UNIVERSE_GENERIC_SEED' },
        idempotencyKey: 'IDEMP_KEY_001'
      }).data!;

      const res = store.checkAndRegister(conflictingCmd);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, EngineErrorCode.IDEMPOTENCY_CONFLICT);
    });
  });

  describe('3. Execution Trace Recording', () => {
    it('records and returns structured execution trace entries', () => {
      const ctx = createCtx();

      ctx.tracer.record({
        stepId: 'TEST_STEP',
        action: 'EXECUTE_UNIT_TEST',
        resultStatus: 'SUCCESS',
        ruleRefs: ['RULE_1', 'RULE_2'],
        details: { sample: 123 }
      });

      const trace = ctx.tracer.getTrace();
      assert.strictEqual(trace.length, 1);
      assert.strictEqual(trace[0].stepId, 'TEST_STEP');
      assert.strictEqual(trace[0].action, 'EXECUTE_UNIT_TEST');
      assert.strictEqual(trace[0].resultStatus, 'SUCCESS');
      assert.strictEqual(Object.isFrozen(trace), true);
    });
  });

  describe('4. LLM Boundary & Non-Authority Guarantees', () => {
    it('invokes MockLLMAdapter and ensures output is a proposal, not authoritative canon mutation', async () => {
      const mockLLM = new MockLLMAdapter();
      mockLLM.registerResponse('suggest dialogue', { dialogue: 'Hello, Universe!' });

      const llmRes = await mockLLM.invoke({
        requestId: 'LLM_REQ_01',
        capability: 'TEXT_GENERATION',
        prompt: 'Please suggest dialogue for scene'
      });

      assert.strictEqual(llmRes.success, true);
      assert.strictEqual(llmRes.data?.requestId, 'LLM_REQ_01');
      assert.strictEqual(llmRes.data?.parsedData !== undefined, true);
      // Ensure metadata explicitly marks it as mock/proposal
      assert.strictEqual((llmRes.data?.metadata as any)?.mock, true);
    });
  });
});
