import { TaskID, DomainID, RuleID, makeTaskID } from '../types/identifiers.ts';
import { Result, success, failure } from '../types/result.ts';

export interface TaskDefinition {
  taskId: TaskID | string;
  taskType: string;
  scope: string;
  requiredDomains: (DomainID | string)[];
  requiredRules: (RuleID | string)[];
  requestedOutput: string;
  description?: string;
}

export class TaskResolver {
  private tasks: Map<string, TaskDefinition> = new Map();

  /**
   * Registers a task definition. Validates that all required structural metadata is present.
   */
  public registerTask(task: TaskDefinition): Result<TaskDefinition> {
    if (!task || typeof task !== 'object') {
      return failure('Task definition must be a non-null object');
    }

    if (!task.taskId || typeof task.taskId !== 'string' || task.taskId.trim() === '') {
      return failure('Missing required field: taskId');
    }

    if (!task.taskType || typeof task.taskType !== 'string' || task.taskType.trim() === '') {
      return failure('Missing required field: taskType');
    }

    if (!task.scope || typeof task.scope !== 'string' || task.scope.trim() === '') {
      return failure('Missing required field: scope');
    }

    if (!Array.isArray(task.requiredDomains) || task.requiredDomains.length === 0) {
      return failure('Missing required metadata: requiredDomains must be a non-empty array');
    }

    if (!Array.isArray(task.requiredRules)) {
      return failure('Missing required metadata: requiredRules must be an array');
    }

    if (!task.requestedOutput || typeof task.requestedOutput !== 'string' || task.requestedOutput.trim() === '') {
      return failure('Missing required field: requestedOutput');
    }

    const key = String(task.taskId);
    if (this.tasks.has(key)) {
      return failure(`Task with ID "${key}" is already registered`);
    }

    const normalized: TaskDefinition = {
      ...task,
      taskId: makeTaskID(key)
    };

    this.tasks.set(key, normalized);
    return success(normalized, `Task ${key} registered successfully.`);
  }

  /**
   * Resolves a registered task definition by task ID.
   */
  public resolveTask(taskId: TaskID | string): Result<TaskDefinition> {
    const key = String(taskId);
    const found = this.tasks.get(key);

    if (!found) {
      return failure(`Unknown task: "${key}" could not be resolved.`, 'TASK_NOT_FOUND');
    }

    return success(found);
  }

  /**
   * Returns all registered task definitions.
   */
  public getAllTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Clears all registered task definitions.
   */
  public clear(): void {
    this.tasks.clear();
  }
}
