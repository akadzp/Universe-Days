/**
 * Phase 9: Workflow Engine
 *
 * Implements multi-step workflow execution with dependency ordering,
 * topological sorting, cycle detection, conditional branching, early termination,
 * validation checkpoints, and failure policies.
 */

import { Result, success, failure, blocked } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { DependencyGraph } from './dependency-graph.ts';
import { ExecutionContext } from './context.ts';
import { TransactionBoundary } from './transaction.ts';
import { RetryPolicy, RetryEvaluator } from './retry.ts';

export type StepFailurePolicy = 'ABORT' | 'SKIP' | 'RETRY' | 'RECORD_UNRESOLVED';

export type StepPrecondition = (ctx: ExecutionContext) => boolean | Result<boolean>;
export type StepExecutor<TOutput = unknown> = (
  ctx: ExecutionContext,
  tx: TransactionBoundary
) => Promise<Result<TOutput>> | Result<TOutput>;
export type StepPostcondition = (ctx: ExecutionContext, output: unknown) => boolean | Result<boolean>;
export type StepValidator = (ctx: ExecutionContext, output: unknown) => { valid: boolean; violations: string[] };

export interface WorkflowStep<TOutput = unknown> {
  stepId: string;
  name: string;
  dependencies?: string[];
  precondition?: StepPrecondition;
  executor: StepExecutor<TOutput>;
  postcondition?: StepPostcondition;
  validation?: StepValidator;
  failurePolicy?: StepFailurePolicy;
  retryPolicy?: RetryPolicy;
  description?: string;
}

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  steps: WorkflowStep[];
  description?: string;
}

export interface WorkflowExecutionSummary {
  workflowId: string;
  completedSteps: string[];
  skippedSteps: string[];
  failedSteps: string[];
  stepOutputs: Record<string, unknown>;
  totalSteps: number;
}

export class WorkflowEngine {
  /**
   * Sorts steps topologically by dependencies and checks for cycles.
   */
  public static orderSteps(steps: WorkflowStep[]): Result<WorkflowStep[]> {
    const stepMap = new Map<string, WorkflowStep>();
    const adj = new Map<string, string[]>(); // stepId -> list of dependencies (must run before)

    for (const step of steps) {
      stepMap.set(step.stepId, step);
      adj.set(step.stepId, (step.dependencies || []).map(String));
    }

    // Verify all referenced dependencies exist
    for (const step of steps) {
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (!stepMap.has(depId)) {
            return failure(
              EngineErrorCode.MISSING_DEPENDENCY,
              `Workflow step "${step.stepId}" depends on undefined step "${depId}".`
            );
          }
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Map<string, 'UNVISITED' | 'VISITING' | 'VISITED'>();
    for (const id of stepMap.keys()) {
      visited.set(id, 'UNVISITED');
    }

    const currentPath: string[] = [];
    let detectedCycle: string[] | null = null;

    const dfsCycle = (node: string): boolean => {
      visited.set(node, 'VISITING');
      currentPath.push(node);

      const deps = adj.get(node) || [];
      for (const dep of deps) {
        if (!stepMap.has(dep)) continue;
        const status = visited.get(dep);
        if (status === 'VISITING') {
          const startIdx = currentPath.indexOf(dep);
          detectedCycle = [...currentPath.slice(startIdx), dep];
          return true;
        }
        if (status === 'UNVISITED') {
          if (dfsCycle(dep)) return true;
        }
      }

      visited.set(node, 'VISITED');
      currentPath.pop();
      return false;
    };

    for (const id of stepMap.keys()) {
      if (visited.get(id) === 'UNVISITED') {
        if (dfsCycle(id)) {
          const cycleStr = (detectedCycle as string[] | null)?.join(' -> ') ?? 'cycle';
          return blocked(
            EngineErrorCode.WORKFLOW_CYCLE_DETECTED,
            `Workflow dependency cycle detected: ${cycleStr}.`
          );
        }
      }
    }

    // Perform topological sorting
    const sortedIds: string[] = [];
    const permanentMark = new Set<string>();

    const visit = (node: string) => {
      if (permanentMark.has(node)) return;
      const deps = adj.get(node) || [];
      for (const dep of deps) {
        visit(dep);
      }
      permanentMark.add(node);
      sortedIds.push(node);
    };

    for (const id of stepMap.keys()) {
      visit(id);
    }

    const ordered = sortedIds.map(id => stepMap.get(id)!);
    return success(ordered);
  }

  /**
   * Runs a complete workflow against the execution context and transaction boundary.
   */
  public static async runWorkflow(
    workflow: WorkflowDefinition,
    ctx: ExecutionContext,
    tx: TransactionBoundary
  ): Promise<Result<WorkflowExecutionSummary>> {
    const orderRes = this.orderSteps(workflow.steps);
    if (!orderRes.success || !orderRes.data) {
      return failure(
        orderRes.error ?? EngineErrorCode.WORKFLOW_INVALID,
        orderRes.message || 'Failed to order workflow steps.'
      );
    }

    const orderedSteps = orderRes.data;
    const summary: WorkflowExecutionSummary = {
      workflowId: workflow.workflowId,
      completedSteps: [],
      skippedSteps: [],
      failedSteps: [],
      stepOutputs: {},
      totalSteps: orderedSteps.length
    };

    for (const step of orderedSteps) {
      ctx.tracer.record({
        stepId: step.stepId,
        action: 'START_STEP',
        resultStatus: 'IN_PROGRESS',
        details: { stepName: step.name }
      });

      // 1. Evaluate Precondition
      if (step.precondition) {
        const preRes = step.precondition(ctx);
        const passed = typeof preRes === 'boolean' ? preRes : preRes.success;
        if (!passed) {
          if (step.failurePolicy === 'SKIP') {
            summary.skippedSteps.push(step.stepId);
            ctx.tracer.record({
              stepId: step.stepId,
              action: 'SKIP_STEP',
              resultStatus: 'SKIPPED',
              details: { reason: 'Precondition not met, skipped per policy' }
            });
            continue;
          } else {
            summary.failedSteps.push(step.stepId);
            ctx.tracer.record({
              stepId: step.stepId,
              action: 'PRECONDITION_FAILED',
              resultStatus: 'FAILED',
              details: { reason: 'Step precondition failed' }
            });
            return failure(
              EngineErrorCode.STEP_PRECONDITION_FAILED,
              `Precondition failed for workflow step "${step.stepId}".`
            );
          }
        }
      }

      // 2. Execute Step (with retry support)
      let execRes: Result<unknown>;
      const maxAttempts = step.retryPolicy?.maxAttempts ?? 1;
      let attempt = 0;
      let lastError: unknown;

      while (attempt < maxAttempts) {
        attempt++;
        try {
          execRes = await Promise.resolve(step.executor(ctx, tx));
          if (execRes.success) {
            break;
          } else {
            lastError = execRes.error;
            const canRetry = RetryEvaluator.isRetryable(
              { code: String(execRes.error), message: execRes.message },
              step.retryPolicy
            );
            if (!canRetry || attempt >= maxAttempts) {
              break;
            }
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          execRes = failure(EngineErrorCode.STEP_EXECUTION_FAILED, err?.message || 'Uncaught step execution error');
          break;
        }
      }

      if (!execRes!.success) {
        summary.failedSteps.push(step.stepId);
        ctx.tracer.record({
          stepId: step.stepId,
          action: 'EXECUTE_STEP',
          resultStatus: 'FAILED',
          details: { error: lastError, attempts: attempt }
        });

        const policy = step.failurePolicy ?? 'ABORT';
        if (policy === 'SKIP') {
          summary.skippedSteps.push(step.stepId);
          continue;
        } else if (policy === 'RECORD_UNRESOLVED') {
          ctx.openUnresolvedConditions.push(`UNRES_STEP_${step.stepId}`);
          continue;
        } else {
          return failure(
            execRes!.error ?? EngineErrorCode.STEP_EXECUTION_FAILED,
            `Step "${step.stepId}" failed: ${execRes!.message || 'Execution error'}`
          );
        }
      }

      // 3. Postcondition & Validation Checkpoint
      const output = execRes!.data;
      summary.stepOutputs[step.stepId] = output;

      if (step.postcondition) {
        const postRes = step.postcondition(ctx, output);
        const postPassed = typeof postRes === 'boolean' ? postRes : postRes.success;
        if (!postPassed) {
          summary.failedSteps.push(step.stepId);
          return failure(
            EngineErrorCode.STEP_POSTCONDITION_FAILED,
            `Postcondition failed for step "${step.stepId}".`
          );
        }
      }

      if (step.validation) {
        const valReport = step.validation(ctx, output);
        ctx.recordValidation(`Step_${step.stepId}`, valReport.valid, valReport.violations);
        if (!valReport.valid) {
          summary.failedSteps.push(step.stepId);
          return failure(
            EngineErrorCode.STEP_VALIDATION_FAILED,
            `Validation failed for step "${step.stepId}": ${valReport.violations.join('; ')}`
          );
        }
      }

      summary.completedSteps.push(step.stepId);
      ctx.tracer.record({
        stepId: step.stepId,
        action: 'COMPLETE_STEP',
        resultStatus: 'SUCCESS',
        details: { outputType: typeof output }
      });
    }

    return success(summary);
  }
}
