import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TaskResolver, TaskDefinition } from '../../../core/engine/task-resolver.ts';
import { ResultStatus } from '../../../core/types/result.ts';

describe('Core Engine - Task Resolver', () => {
  let resolver: TaskResolver;

  beforeEach(() => {
    resolver = new TaskResolver();
  });

  it('1. Task can be registered', () => {
    const validTask: TaskDefinition = {
      taskId: 'TASK-ARCH-001',
      taskType: 'SIMULATION_STEP',
      scope: 'UNIVERSE_WIDE',
      requiredDomains: ['TEMPORAL', 'STATE'],
      requiredRules: ['RULE-ARCH-001'],
      requestedOutput: 'UPDATED_STATE_VECTOR'
    };

    const res = resolver.registerTask(validTask);
    assert.strictEqual(res.status, ResultStatus.SUCCESS);
    assert.strictEqual(resolver.getAllTasks().length, 1);
  });

  it('2. Task can be resolved', () => {
    const validTask: TaskDefinition = {
      taskId: 'TASK-RESOLVE-002',
      taskType: 'AUDIT_STEP',
      scope: 'LOCAL_DOMAIN',
      requiredDomains: ['LOCATION'],
      requiredRules: [],
      requestedOutput: 'AUDIT_REPORT'
    };

    resolver.registerTask(validTask);
    const resolved = resolver.resolveTask('TASK-RESOLVE-002');
    assert.strictEqual(resolved.status, ResultStatus.SUCCESS);
    assert.ok(resolved.data);
    assert.strictEqual(resolved.data.taskId, 'TASK-RESOLVE-002');
  });

  it('3. Unknown task is rejected', () => {
    const resolved = resolver.resolveTask('TASK-DOES-NOT-EXIST');
    assert.strictEqual(resolved.status, ResultStatus.FAILURE);
    assert.strictEqual(resolved.message, 'TASK_NOT_FOUND');
  });

  it('4. Missing required metadata is rejected', () => {
    // Missing requiredDomains
    const invalidTask1 = {
      taskId: 'TASK-INVALID-01',
      taskType: 'SIMULATION_STEP',
      scope: 'UNIVERSE_WIDE',
      requiredRules: [],
      requestedOutput: 'OUTPUT'
    } as any;

    const res1 = resolver.registerTask(invalidTask1);
    assert.strictEqual(res1.status, ResultStatus.FAILURE);
    assert.match(res1.error as string, /requiredDomains must be a non-empty array/);

    // Missing requestedOutput
    const invalidTask2 = {
      taskId: 'TASK-INVALID-02',
      taskType: 'SIMULATION_STEP',
      scope: 'UNIVERSE_WIDE',
      requiredDomains: ['TEMPORAL'],
      requiredRules: []
    } as any;

    const res2 = resolver.registerTask(invalidTask2);
    assert.strictEqual(res2.status, ResultStatus.FAILURE);
    assert.match(res2.error as string, /Missing required field: requestedOutput/);
  });
});
