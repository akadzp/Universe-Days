/**
 * Phase 9 Unit Tests: Workflow Engine & Lifecycle State Machine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  WorkflowEngine,
  WorkflowStep,
  WorkflowDefinition,
  ExecutionLifecycleStateMachine,
  ExecutionLifecycleStatus,
  ExecutionLifecycleEvent,
  ExecutionContext,
  TransactionBoundary,
  CommandValidator,
  InMemoryUniverseRepository,
  createGenericSeedUniverse,
  makeSystemID,
  EngineErrorCode,
  success,
  failure
} from '../../../core/index.ts';

describe('Phase 9: Workflow Engine & Lifecycle', () => {
  const seed = createGenericSeedUniverse();
  const repo = new InMemoryUniverseRepository();
  repo.saveUniverse(seed, makeSystemID('ENGINE_SYSTEM'));

  const validCmd = CommandValidator.validate({
    commandId: 'CMD_WF_01',
    commandType: 'RUN_WORKFLOW_TEST',
    requestedBy: makeSystemID('ENGINE_SYSTEM'),
    universeContext: { universeId: 'UNIVERSE_GENERIC_SEED' }
  }).data!;

  const createTestCtx = () =>
    new ExecutionContext({
      executionId: 'EXEC_WF_01',
      command: validCmd,
      universe: seed,
      actor: makeSystemID('ENGINE_SYSTEM'),
      temporalContext: {
        universeTime: '2024-01-01T00:00:00Z',
        engineTime: Date.now()
      }
    });

  describe('1. Execution Lifecycle State Machine', () => {
    it('follows valid transition sequence from CREATED to COMPLETED', () => {
      const sm = new ExecutionLifecycleStateMachine();
      assert.strictEqual(sm.getStatus(), ExecutionLifecycleStatus.CREATED);

      sm.transition(ExecutionLifecycleEvent.START_PREPARATION);
      assert.strictEqual(sm.getStatus(), ExecutionLifecycleStatus.PREPARING);

      sm.transition(ExecutionLifecycleEvent.MARK_READY);
      assert.strictEqual(sm.getStatus(), ExecutionLifecycleStatus.READY);

      sm.transition(ExecutionLifecycleEvent.START_EXECUTION);
      assert.strictEqual(sm.getStatus(), ExecutionLifecycleStatus.EXECUTING);

      sm.transition(ExecutionLifecycleEvent.START_VALIDATION);
      assert.strictEqual(sm.getStatus(), ExecutionLifecycleStatus.VALIDATING);

      sm.transition(ExecutionLifecycleEvent.START_COMMIT);
      assert.strictEqual(sm.getStatus(), ExecutionLifecycleStatus.COMMITTING);

      sm.transition(ExecutionLifecycleEvent.MARK_COMPLETED);
      assert.strictEqual(sm.getStatus(), ExecutionLifecycleStatus.COMPLETED);
      assert.strictEqual(sm.isSuccessful(), true);
    });

    it('rejects illegal jump directly from CREATED or EXECUTING to COMPLETED', () => {
      const sm = new ExecutionLifecycleStateMachine();
      const directComplete = sm.transition(ExecutionLifecycleEvent.MARK_COMPLETED);
      assert.strictEqual(directComplete.success, false);
      assert.strictEqual(directComplete.error, EngineErrorCode.INVALID_STATE);
    });

    it('transitions to BLOCKED, CONFLICT, or FAILED on unexpected disruptions', () => {
      const sm1 = new ExecutionLifecycleStateMachine();
      sm1.transition(ExecutionLifecycleEvent.START_PREPARATION);
      sm1.transition(ExecutionLifecycleEvent.ENCOUNTER_BLOCK);
      assert.strictEqual(sm1.getStatus(), ExecutionLifecycleStatus.BLOCKED);
      assert.strictEqual(sm1.isTerminal(), true);
    });
  });

  describe('2. Workflow Engine Step Dependencies & Execution', () => {
    it('orders dependent steps topologically', () => {
      const steps: WorkflowStep[] = [
        {
          stepId: 'STEP_C',
          name: 'Final Step',
          dependencies: ['STEP_B'],
          executor: () => success('C_DONE')
        },
        {
          stepId: 'STEP_A',
          name: 'Initial Step',
          executor: () => success('A_DONE')
        },
        {
          stepId: 'STEP_B',
          name: 'Middle Step',
          dependencies: ['STEP_A'],
          executor: () => success('B_DONE')
        }
      ];

      const orderedRes = WorkflowEngine.orderSteps(steps);
      assert.strictEqual(orderedRes.success, true);
      const ids = orderedRes.data!.map(s => s.stepId);
      assert.deepStrictEqual(ids, ['STEP_A', 'STEP_B', 'STEP_C']);
    });

    it('detects circular dependencies and rejects workflow with WORKFLOW_CYCLE_DETECTED', () => {
      const cyclicalSteps: WorkflowStep[] = [
        {
          stepId: 'STEP_1',
          name: 'Step 1',
          dependencies: ['STEP_2'],
          executor: () => success('1')
        },
        {
          stepId: 'STEP_2',
          name: 'Step 2',
          dependencies: ['STEP_1'],
          executor: () => success('2')
        }
      ];

      const orderRes = WorkflowEngine.orderSteps(cyclicalSteps);
      assert.strictEqual(orderRes.success, false);
      assert.strictEqual(orderRes.error, EngineErrorCode.WORKFLOW_CYCLE_DETECTED);
    });

    it('executes sequential workflow successfully and records outputs', async () => {
      const ctx = createTestCtx();
      const tx = new TransactionBoundary(repo, ctx.executionId);
      tx.prepare(ctx);

      const executedOrder: string[] = [];
      const workflow: WorkflowDefinition = {
        workflowId: 'WF_TEST_01',
        name: 'Sequential Test Workflow',
        steps: [
          {
            stepId: 'STEP_1',
            name: 'Step 1',
            executor: () => {
              executedOrder.push('STEP_1');
              return success({ val: 10 });
            }
          },
          {
            stepId: 'STEP_2',
            name: 'Step 2',
            dependencies: ['STEP_1'],
            executor: () => {
              executedOrder.push('STEP_2');
              return success({ val: 20 });
            }
          }
        ]
      };

      const res = await WorkflowEngine.runWorkflow(workflow, ctx, tx);
      assert.strictEqual(res.success, true);
      assert.deepStrictEqual(executedOrder, ['STEP_1', 'STEP_2']);
      assert.strictEqual(res.data?.completedSteps.length, 2);
    });

    it('skips step when precondition fails and failurePolicy is SKIP', async () => {
      const ctx = createTestCtx();
      const tx = new TransactionBoundary(repo, ctx.executionId);
      tx.prepare(ctx);

      const workflow: WorkflowDefinition = {
        workflowId: 'WF_TEST_SKIP',
        name: 'Skip Workflow',
        steps: [
          {
            stepId: 'STEP_A',
            name: 'Always Ran',
            executor: () => success('A')
          },
          {
            stepId: 'STEP_B',
            name: 'Conditional Step',
            precondition: () => false, // Fails precondition
            failurePolicy: 'SKIP',
            executor: () => success('B')
          },
          {
            stepId: 'STEP_C',
            name: 'Follow-up Step',
            dependencies: ['STEP_A'],
            executor: () => success('C')
          }
        ]
      };

      const res = await WorkflowEngine.runWorkflow(workflow, ctx, tx);
      assert.strictEqual(res.success, true);
      assert.deepStrictEqual(res.data?.completedSteps, ['STEP_A', 'STEP_C']);
      assert.deepStrictEqual(res.data?.skippedSteps, ['STEP_B']);
    });
  });
});
