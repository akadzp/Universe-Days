/**
 * Phase 9: Pocer Universe Execution Engine (Main Orchestrator)
 *
 * Central runtime orchestrator for the Pocer Universe Engine.
 *
 * Sequence:
 * INPUT
 * -> LOAD CONTEXT
 * -> RESOLVE AUTHORITY
 * -> LOAD RULES
 * -> BUILD EXECUTION CONTEXT
 * -> EVALUATE PRECONDITIONS & GATES
 * -> EXECUTE DOMAIN OPERATIONS
 * -> UPDATE TEMPORAL / CONTINUITY CONTEXT
 * -> POST-VALIDATE
 * -> COMMIT OR BLOCK
 * -> PRODUCE RESULT
 *
 * Determinism:
 * - No wall-clock reads.
 * - No random execution identity.
 * - Runtime metadata comes from injected RuntimeClock.
 * - Execution identity is derived from commandId.
 */

import { DomainID } from '../types/identifiers.ts';
import { Result } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { canPerformAction, ArchitectureAction } from '../architecture/authority.ts';
import { UniverseRepository } from '../universe/model/repository.ts';
import { RuleRegistryEngine } from './rule-engine.ts';
import { UniverseCommand, CommandValidator } from './command.ts';
import { UniverseQuery, QueryResult, QueryProcessor } from './query.ts';
import { ExecutionContext } from './context.ts';
import { ExecutionLifecycleEvent } from './lifecycle.ts';
import { EngineRuleIntegration } from './rule-integration.ts';
import { TransactionBoundary } from './transaction.ts';
import { WorkflowEngine, WorkflowDefinition } from './workflow.ts';
import { IdempotencyStore } from './idempotency.ts';
import { EngineEventBus, EngineEventListener, EngineEventName } from './events.ts';
import { ConflictOrchestrator } from './conflict-orchestrator.ts';
import {
  ExecutionResult,
  EngineExecutionStatus,
  ExecutionResultBuilder
} from './result.ts';
import { FixedRuntimeClock, RuntimeClock } from './runtime-clock.ts';

export interface EngineConfiguration {
  repository: UniverseRepository;
  ruleRegistry?: RuleRegistryEngine;
  eventBus?: EngineEventBus;
  idempotencyStore?: IdempotencyStore;
  runtimeClock?: RuntimeClock;
}

export class PocerExecutionEngine {
  private readonly repository: UniverseRepository;
  private readonly ruleIntegration: EngineRuleIntegration;
  private readonly eventBus: EngineEventBus;
  private readonly idempotencyStore: IdempotencyStore;
  private readonly queryProcessor: QueryProcessor;
  private readonly runtimeClock: RuntimeClock;

  constructor(config: EngineConfiguration) {
    this.repository = config.repository;
    this.runtimeClock = config.runtimeClock ?? new FixedRuntimeClock();

    const ruleRegistry = config.ruleRegistry ?? new RuleRegistryEngine();

    this.ruleIntegration = new EngineRuleIntegration(ruleRegistry);
    this.eventBus = config.eventBus ?? new EngineEventBus(this.runtimeClock);
    this.idempotencyStore =
      config.idempotencyStore ?? new IdempotencyStore(this.runtimeClock);
    this.queryProcessor = new QueryProcessor(this.repository);
  }

  public on<T = unknown>(
    eventName: EngineEventName,
    listener: EngineEventListener<T>
  ): () => void {
    return this.eventBus.subscribe(eventName, listener);
  }

  public executeQuery<TData = unknown>(
    query: UniverseQuery
  ): Result<QueryResult<TData>> {
    return this.queryProcessor.execute<TData>(query);
  }

  public async executeCommand(
    commandInput: Partial<UniverseCommand>,
    customWorkflow?: WorkflowDefinition
  ): Promise<ExecutionResult> {
    const startTime = this.runtimeClock.now();

    const validatedInputId =
      typeof commandInput.commandId === 'string' && commandInput.commandId.trim()
        ? commandInput.commandId.trim()
        : 'INVALID_COMMAND';

    const provisionalExecutionId = `EXEC_${validatedInputId}`;

    const cmdValRes = CommandValidator.validate(commandInput);

    if (!cmdValRes.success || !cmdValRes.data) {
      return this.buildImmediateFailureResult(
        provisionalExecutionId,
        EngineExecutionStatus.FAILED,
        (cmdValRes.error as any) ?? EngineErrorCode.INVALID_COMMAND,
        cmdValRes.message || 'Invalid command payload',
        startTime
      );
    }

    const command = cmdValRes.data;
    const executionId = `EXEC_${command.commandId}`;

    const idempRes = this.idempotencyStore.checkAndRegister(command);

    if (!idempRes.success) {
      return this.buildImmediateFailureResult(
        executionId,
        EngineExecutionStatus.CONFLICT,
        (idempRes.error as any) ?? EngineErrorCode.IDEMPOTENCY_CONFLICT,
        idempRes.message || 'Idempotency conflict detected',
        startTime
      );
    }

    if (idempRes.data?.isDuplicate && idempRes.data.previousRecord?.result) {
      return idempRes.data.previousRecord.result as ExecutionResult;
    }

    this.eventBus.emit('execution.started', executionId, { command });

    const universeRes = this.repository.getUniverse(
      command.universeContext.universeId
    );

    if (!universeRes.success || !universeRes.data) {
      const errRes = this.buildImmediateFailureResult(
        executionId,
        EngineExecutionStatus.FAILED,
        EngineErrorCode.COMMAND_TARGET_NOT_FOUND,
        `Target universe "${command.universeContext.universeId}" not found in repository.`,
        startTime
      );

      this.eventBus.emit('execution.failed', executionId, errRes);
      return errRes;
    }

    const universe = universeRes.data;

    const requiredDomains: (DomainID | string)[] = [];
    if (command.target?.domain) {
      requiredDomains.push(command.target.domain);
    }

    const relevantRules = this.ruleIntegration.resolveRelevantRules(
      command.commandType,
      requiredDomains
    );

    const ctx = new ExecutionContext({
      executionId,
      command,
      universe,
      actor: command.requestedBy,
      temporalContext: {
        universeTime:
          command.universeContext.universeTime ??
          universe.temporalContext.currentUniverseTime,
        engineTime: this.runtimeClock.now(),
        periodRef:
          command.universeContext.periodRef ??
          universe.temporalContext.currentPeriodRef
      },
      relevantRules,
      runtimeClock: this.runtimeClock
    });

    ctx.lifecycle.transition(ExecutionLifecycleEvent.START_PREPARATION);

    if (command.target?.domain) {
      const domainStr = String(command.target.domain);
      const applyAuth = canPerformAction(
        command.requestedBy,
        domainStr,
        ArchitectureAction.APPLY_CHANGE
      );

      const isAllowed =
        applyAuth.success || command.requestedBy === 'ENGINE_SYSTEM';

      if (!isAllowed) {
        ctx.lifecycle.transition(ExecutionLifecycleEvent.ENCOUNTER_BLOCK);

        ctx.recordValidation('AuthorityGate', false, [
          `Actor "${command.requestedBy}" lacks authority to mutate domain "${domainStr}".`
        ]);

        const blockRes = this.assembleResult(
          ctx,
          EngineExecutionStatus.BLOCKED,
          startTime,
          {
            code: EngineErrorCode.COMMAND_UNAUTHORIZED,
            message: `Actor "${command.requestedBy}" is not authorized for target domain "${domainStr}".`
          }
        );

        this.eventBus.emit('execution.blocked', executionId, blockRes);
        return blockRes;
      }
    }

    ctx.lifecycle.transition(ExecutionLifecycleEvent.MARK_READY);
    ctx.lifecycle.transition(ExecutionLifecycleEvent.START_EXECUTION);

    const gateEvalRes = this.ruleIntegration.evaluateRulesAndGate(ctx);

    if (!gateEvalRes.success) {
      ctx.lifecycle.transition(ExecutionLifecycleEvent.ENCOUNTER_BLOCK);

      const blockRes = this.assembleResult(
        ctx,
        EngineExecutionStatus.BLOCKED,
        startTime,
        {
          code: (gateEvalRes.error as any) ?? EngineErrorCode.GATE_REJECTED,
          message:
            gateEvalRes.message ||
            'Execution halted due to gate rejection.'
        }
      );

      this.eventBus.emit('execution.blocked', executionId, blockRes);
      return blockRes;
    }

    const tx = new TransactionBoundary(this.repository, executionId);
    const prepRes = tx.prepare(ctx);

    if (!prepRes.success) {
      ctx.lifecycle.transition(ExecutionLifecycleEvent.ENCOUNTER_FAILURE);

      const failRes = this.assembleResult(
        ctx,
        EngineExecutionStatus.FAILED,
        startTime,
        {
          code:
            (prepRes.error as any) ??
            EngineErrorCode.TRANSACTION_PRE_VALIDATION_FAILED,
          message:
            prepRes.message ||
            'Transaction preparation failed.'
        }
      );

      this.eventBus.emit('execution.failed', executionId, failRes);
      return failRes;
    }

    let workflowSummary: Record<string, unknown> = {};

    if (customWorkflow) {
      this.eventBus.emit(
        'execution.step.started',
        executionId,
        { workflow: customWorkflow.name }
      );

      const wfRes = await WorkflowEngine.runWorkflow(
        customWorkflow,
        ctx,
        tx
      );

      if (!wfRes.success) {
        tx.abort(
          ctx,
          `Workflow execution failed: ${wfRes.message}`
        );

        ctx.lifecycle.transition(
          ExecutionLifecycleEvent.ENCOUNTER_FAILURE
        );

        const failRes = this.assembleResult(
          ctx,
          EngineExecutionStatus.FAILED,
          startTime,
          {
            code:
              (wfRes.error as any) ??
              EngineErrorCode.EXECUTION_FAILED,
            message:
              wfRes.message ||
              'Workflow execution failed.'
          }
        );

        this.eventBus.emit(
          'execution.failed',
          executionId,
          failRes
        );

        return failRes;
      }

      workflowSummary = wfRes.data?.stepOutputs ?? {};

      this.eventBus.emit(
        'execution.step.completed',
        executionId,
        { summary: wfRes.data }
      );
    } else {
      workflowSummary = {
        input: command.input,
        status: 'PROCESSED'
      };
    }

    ctx.lifecycle.transition(ExecutionLifecycleEvent.START_VALIDATION);

    const conflictCheck =
      ConflictOrchestrator.evaluateBlockingConflicts(ctx);

    if (!conflictCheck.success) {
      tx.abort(
        ctx,
        conflictCheck.message || 'Blocking conflicts detected'
      );

      ctx.lifecycle.transition(
        ExecutionLifecycleEvent.ENCOUNTER_CONFLICT
      );

      const confRes = this.assembleResult(
        ctx,
        EngineExecutionStatus.CONFLICT,
        startTime,
        {
          code:
            (conflictCheck.error as any) ??
            EngineErrorCode.EXECUTION_CONFLICT,
          message:
            conflictCheck.message ||
            'Blocking conflicts present.'
        }
      );

      this.eventBus.emit(
        'conflict.detected',
        executionId,
        confRes
      );

      return confRes;
    }

    ctx.lifecycle.transition(ExecutionLifecycleEvent.START_COMMIT);

    if (command.executionMode === 'DRY_RUN') {
      tx.abort(
        ctx,
        'Dry run requested; commit omitted.'
      );
      ctx.lifecycle.transition(
        ExecutionLifecycleEvent.MARK_COMPLETED
      );
    } else if (tx.getPendingCount() > 0) {
      const commitRes = tx.postValidateAndCommit(ctx);

      if (!commitRes.success) {
        ctx.lifecycle.transition(
          ExecutionLifecycleEvent.ENCOUNTER_FAILURE
        );

        const failRes = this.assembleResult(
          ctx,
          EngineExecutionStatus.FAILED,
          startTime,
          {
            code:
              (commitRes.error as any) ??
              EngineErrorCode.TRANSACTION_COMMIT_FAILED,
            message:
              commitRes.message ||
              'Transaction post-validation or commit failed.'
          }
        );

        this.eventBus.emit(
          'validation.failed',
          executionId,
          failRes
        );

        return failRes;
      }

      this.eventBus.emit(
        'mutation.committed',
        executionId,
        {
          mutations: tx.getPendingCount(),
          changed: Array.from(ctx.changedEntityRefs)
        }
      );

      ctx.lifecycle.transition(
        ExecutionLifecycleEvent.MARK_COMPLETED
      );
    } else {
      ctx.lifecycle.transition(
        ExecutionLifecycleEvent.MARK_COMPLETED
      );
    }

    const finalResult = this.assembleResult(
      ctx,
      EngineExecutionStatus.SUCCESS,
      startTime,
      undefined,
      workflowSummary
    );

    if (command.idempotencyKey || command.isIdempotent) {
      const key =
        command.idempotencyKey ||
        command.commandId;

      this.idempotencyStore.recordResult(
        key,
        finalResult
      );
    }

    this.eventBus.emit(
      'execution.completed',
      executionId,
      finalResult
    );

    return finalResult;
  }

  private assembleResult(
    ctx: ExecutionContext,
    status: EngineExecutionStatus,
    startTime: number,
    error?: { code: string; message: string; details?: unknown },
    outputs: Record<string, unknown> = {}
  ): ExecutionResult {
    const durationMs = Math.max(
      0,
      this.runtimeClock.now() - startTime
    );

    const validationSummary =
      ExecutionResultBuilder.buildSummary(
        ctx.validationResults
      );

    return Object.freeze({
      executionId: ctx.executionId,
      status,
      success: status === EngineExecutionStatus.SUCCESS,
      outputs: Object.freeze({ ...outputs }),
      validationSummary,
      conflicts: Object.freeze([...ctx.conflicts]),
      trace: ctx.tracer.getTrace(),
      changedEntityRefs: Object.freeze(
        Array.from(ctx.changedEntityRefs)
      ),
      unresolvedConditions: Object.freeze(
        [...ctx.openUnresolvedConditions]
      ),
      error: error ? Object.freeze({ ...error }) : undefined,
      executedAt: startTime,
      durationMs
    });
  }

  private buildImmediateFailureResult(
    executionId: string,
    status: EngineExecutionStatus,
    code: string,
    message: string,
    startTime: number
  ): ExecutionResult {
    return Object.freeze({
      executionId,
      status,
      success: false,
      outputs: {},
      validationSummary: {
        totalChecks: 1,
        passedChecks: 0,
        failedChecks: 1,
        violations: [message]
      },
      conflicts: [],
      trace: [],
      changedEntityRefs: [],
      unresolvedConditions: [],
      error: { code, message },
      executedAt: startTime,
      durationMs: Math.max(
        0,
        this.runtimeClock.now() - startTime
      )
    });
  }
}
