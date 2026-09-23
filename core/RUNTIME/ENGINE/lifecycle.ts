/**
 * Phase 9: Execution Lifecycle
 *
 * Implements the execution lifecycle state machine ensuring deterministic
 * stage transitions and forbidding completion without validation.
 */

import { GenericStateMachine } from './state-machine.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export enum ExecutionLifecycleStatus {
  CREATED = 'CREATED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  EXECUTING = 'EXECUTING',
  VALIDATING = 'VALIDATING',
  COMMITTING = 'COMMITTING',
  COMPLETED = 'COMPLETED',
  // Failure / Terminal states
  BLOCKED = 'BLOCKED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum ExecutionLifecycleEvent {
  START_PREPARATION = 'START_PREPARATION',
  MARK_READY = 'MARK_READY',
  START_EXECUTION = 'START_EXECUTION',
  START_VALIDATION = 'START_VALIDATION',
  START_COMMIT = 'START_COMMIT',
  MARK_COMPLETED = 'MARK_COMPLETED',
  // Exceptions & Failures
  ENCOUNTER_BLOCK = 'ENCOUNTER_BLOCK',
  ENCOUNTER_CONFLICT = 'ENCOUNTER_CONFLICT',
  ENCOUNTER_FAILURE = 'ENCOUNTER_FAILURE',
  CANCEL_EXECUTION = 'CANCEL_EXECUTION'
}

export class ExecutionLifecycleStateMachine {
  private sm: GenericStateMachine<ExecutionLifecycleStatus, ExecutionLifecycleEvent>;

  constructor(initialStatus: ExecutionLifecycleStatus = ExecutionLifecycleStatus.CREATED) {
    this.sm = new GenericStateMachine<ExecutionLifecycleStatus, ExecutionLifecycleEvent>(initialStatus);
    this.configureTransitions();
  }

  private configureTransitions(): void {
    // Standard Happy Path
    this.sm.addTransition(
      ExecutionLifecycleStatus.CREATED,
      ExecutionLifecycleStatus.PREPARING,
      ExecutionLifecycleEvent.START_PREPARATION,
      undefined,
      undefined,
      'Transition from created to preparing context and resolving rules.'
    );

    this.sm.addTransition(
      ExecutionLifecycleStatus.PREPARING,
      ExecutionLifecycleStatus.READY,
      ExecutionLifecycleEvent.MARK_READY,
      undefined,
      undefined,
      'Transition to ready after context, rules, and authority are resolved.'
    );

    this.sm.addTransition(
      ExecutionLifecycleStatus.READY,
      ExecutionLifecycleStatus.EXECUTING,
      ExecutionLifecycleEvent.START_EXECUTION,
      undefined,
      undefined,
      'Begin workflow step execution.'
    );

    this.sm.addTransition(
      ExecutionLifecycleStatus.EXECUTING,
      ExecutionLifecycleStatus.VALIDATING,
      ExecutionLifecycleEvent.START_VALIDATION,
      undefined,
      undefined,
      'Begin post-execution and invariant validation.'
    );

    this.sm.addTransition(
      ExecutionLifecycleStatus.VALIDATING,
      ExecutionLifecycleStatus.COMMITTING,
      ExecutionLifecycleEvent.START_COMMIT,
      undefined,
      undefined,
      'Begin atomic persistence commit.'
    );

    this.sm.addTransition(
      ExecutionLifecycleStatus.COMMITTING,
      ExecutionLifecycleStatus.COMPLETED,
      ExecutionLifecycleEvent.MARK_COMPLETED,
      undefined,
      undefined,
      'Execution successfully completed.'
    );

    // Transitions to Terminal / Failure states from any active state
    const activeStates = [
      ExecutionLifecycleStatus.CREATED,
      ExecutionLifecycleStatus.PREPARING,
      ExecutionLifecycleStatus.READY,
      ExecutionLifecycleStatus.EXECUTING,
      ExecutionLifecycleStatus.VALIDATING,
      ExecutionLifecycleStatus.COMMITTING
    ];

    for (const state of activeStates) {
      this.sm.addTransition(
        state,
        ExecutionLifecycleStatus.BLOCKED,
        ExecutionLifecycleEvent.ENCOUNTER_BLOCK,
        undefined,
        undefined,
        'Halt execution on blocking rule, permission denial, or unmet gate.'
      );

      this.sm.addTransition(
        state,
        ExecutionLifecycleStatus.CONFLICT,
        ExecutionLifecycleEvent.ENCOUNTER_CONFLICT,
        undefined,
        undefined,
        'Halt execution on unresolved inter-system or domain conflict.'
      );

      this.sm.addTransition(
        state,
        ExecutionLifecycleStatus.FAILED,
        ExecutionLifecycleEvent.ENCOUNTER_FAILURE,
        undefined,
        undefined,
        'Halt execution on unrecoverable validation error or invariant failure.'
      );

      this.sm.addTransition(
        state,
        ExecutionLifecycleStatus.CANCELLED,
        ExecutionLifecycleEvent.CANCEL_EXECUTION,
        undefined,
        undefined,
        'Cancel execution upon explicit abort request.'
      );
    }
  }

  public getStatus(): ExecutionLifecycleStatus {
    return this.sm.getCurrentState();
  }

  public transition(event: ExecutionLifecycleEvent, payload?: unknown): Result<ExecutionLifecycleStatus> {
    const eventToTargetState: Record<ExecutionLifecycleEvent, ExecutionLifecycleStatus> = {
      [ExecutionLifecycleEvent.START_PREPARATION]: ExecutionLifecycleStatus.PREPARING,
      [ExecutionLifecycleEvent.MARK_READY]: ExecutionLifecycleStatus.READY,
      [ExecutionLifecycleEvent.START_EXECUTION]: ExecutionLifecycleStatus.EXECUTING,
      [ExecutionLifecycleEvent.START_VALIDATION]: ExecutionLifecycleStatus.VALIDATING,
      [ExecutionLifecycleEvent.START_COMMIT]: ExecutionLifecycleStatus.COMMITTING,
      [ExecutionLifecycleEvent.MARK_COMPLETED]: ExecutionLifecycleStatus.COMPLETED,
      [ExecutionLifecycleEvent.ENCOUNTER_BLOCK]: ExecutionLifecycleStatus.BLOCKED,
      [ExecutionLifecycleEvent.ENCOUNTER_CONFLICT]: ExecutionLifecycleStatus.CONFLICT,
      [ExecutionLifecycleEvent.ENCOUNTER_FAILURE]: ExecutionLifecycleStatus.FAILED,
      [ExecutionLifecycleEvent.CANCEL_EXECUTION]: ExecutionLifecycleStatus.CANCELLED
    };

    const targetState = eventToTargetState[event];
    if (!targetState) {
      return failure(
        EngineErrorCode.INVALID_STATE,
        `Unknown lifecycle event: ${event}`
      );
    }

    const res = this.sm.transition(targetState, payload, event);
    if (!res.success) {
      return failure(
        EngineErrorCode.INVALID_STATE,
        `Illegal lifecycle transition to "${targetState}" via event "${event}" from current state "${this.sm.getCurrentState()}".`
      );
    }
    return success(this.sm.getCurrentState());
  }

  public isTerminal(): boolean {
    const s = this.sm.getCurrentState();
    return (
      s === ExecutionLifecycleStatus.COMPLETED ||
      s === ExecutionLifecycleStatus.BLOCKED ||
      s === ExecutionLifecycleStatus.CONFLICT ||
      s === ExecutionLifecycleStatus.FAILED ||
      s === ExecutionLifecycleStatus.CANCELLED
    );
  }

  public isSuccessful(): boolean {
    return this.sm.getCurrentState() === ExecutionLifecycleStatus.COMPLETED;
  }
}
