/**
 * Phase 5: Period Lifecycle & State Machine Integration.
 * Enforces valid Daily Universe lifecycle states using GenericStateMachine.
 */

import { GenericStateMachine, StateTransitionRecord } from '../../engine/state-machine.ts';
import { Result, ResultStatus, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { DailyUniverseStatus, UniversePeriod } from './period.ts';

export enum PeriodLifecycleEvent {
  START_INIT = 'START_INIT',
  COMPLETE_INIT = 'COMPLETE_INIT',
  START_PROGRESSION = 'START_PROGRESSION',
  STEP_PROGRESSION = 'STEP_PROGRESSION',
  START_FINALIZATION = 'START_FINALIZATION',
  COMPLETE_FINALIZATION = 'COMPLETE_FINALIZATION',
  BLOCK = 'BLOCK',
  UNBLOCK = 'UNBLOCK',
  REQUIRE_REVIEW = 'REQUIRE_REVIEW',
  RESOLVE_REVIEW = 'RESOLVE_REVIEW',
  FAIL = 'FAIL'
}

export interface PeriodLifecycleContext {
  periodId: string;
  reason?: string;
}

export class PeriodLifecycleManager {
  private machine: GenericStateMachine<DailyUniverseStatus, PeriodLifecycleEvent, PeriodLifecycleContext>;
  private transitionMap: Map<string, DailyUniverseStatus> = new Map();

  constructor(initialStatus: DailyUniverseStatus = DailyUniverseStatus.UNINITIALIZED) {
    this.machine = new GenericStateMachine<DailyUniverseStatus, PeriodLifecycleEvent, PeriodLifecycleContext>(initialStatus);
    this.configureTransitions();
  }

  private registerTransition(
    from: DailyUniverseStatus,
    to: DailyUniverseStatus,
    event: PeriodLifecycleEvent,
    description?: string
  ): void {
    this.machine.addTransition(from, to, event, undefined, undefined, description);
    this.transitionMap.set(`${from}:${event}`, to);
  }

  private configureTransitions(): void {
    // UNINITIALIZED -> INITIALIZING
    this.registerTransition(
      DailyUniverseStatus.UNINITIALIZED,
      DailyUniverseStatus.INITIALIZING,
      PeriodLifecycleEvent.START_INIT,
      'Begin period initialization'
    );

    // INITIALIZING -> INITIALIZED
    this.registerTransition(
      DailyUniverseStatus.INITIALIZING,
      DailyUniverseStatus.INITIALIZED,
      PeriodLifecycleEvent.COMPLETE_INIT,
      'Complete period initialization'
    );

    // INITIALIZING -> FAILED
    this.registerTransition(
      DailyUniverseStatus.INITIALIZING,
      DailyUniverseStatus.FAILED,
      PeriodLifecycleEvent.FAIL,
      'Initialization failed'
    );

    // INITIALIZING -> BLOCKED
    this.registerTransition(
      DailyUniverseStatus.INITIALIZING,
      DailyUniverseStatus.BLOCKED,
      PeriodLifecycleEvent.BLOCK,
      'Initialization blocked by external invariant'
    );

    // INITIALIZED -> PROGRESSING
    this.registerTransition(
      DailyUniverseStatus.INITIALIZED,
      DailyUniverseStatus.PROGRESSING,
      PeriodLifecycleEvent.START_PROGRESSION,
      'Start period progression'
    );

    // INITIALIZED -> FINALIZING (direct finalization without intermediate progression steps)
    this.registerTransition(
      DailyUniverseStatus.INITIALIZED,
      DailyUniverseStatus.FINALIZING,
      PeriodLifecycleEvent.START_FINALIZATION,
      'Initiate period finalization directly from initialized'
    );

    // INITIALIZED -> BLOCKED
    this.registerTransition(
      DailyUniverseStatus.INITIALIZED,
      DailyUniverseStatus.BLOCKED,
      PeriodLifecycleEvent.BLOCK,
      'Block initialized period'
    );

    // INITIALIZED -> FAILED
    this.registerTransition(
      DailyUniverseStatus.INITIALIZED,
      DailyUniverseStatus.FAILED,
      PeriodLifecycleEvent.FAIL,
      'Initialized period failed'
    );

    // PROGRESSING -> PROGRESSING (internal step)
    this.registerTransition(
      DailyUniverseStatus.PROGRESSING,
      DailyUniverseStatus.PROGRESSING,
      PeriodLifecycleEvent.STEP_PROGRESSION,
      'Execute discrete progression step'
    );

    // PROGRESSING -> BLOCKED
    this.registerTransition(
      DailyUniverseStatus.PROGRESSING,
      DailyUniverseStatus.BLOCKED,
      PeriodLifecycleEvent.BLOCK,
      'Block progression due to rule or dependency violation'
    );

    // PROGRESSING -> REVIEW_REQUIRED
    this.registerTransition(
      DailyUniverseStatus.PROGRESSING,
      DailyUniverseStatus.REVIEW_REQUIRED,
      PeriodLifecycleEvent.REQUIRE_REVIEW,
      'Progression requires external review'
    );

    // PROGRESSING -> FAILED
    this.registerTransition(
      DailyUniverseStatus.PROGRESSING,
      DailyUniverseStatus.FAILED,
      PeriodLifecycleEvent.FAIL,
      'Progression failed'
    );

    // PROGRESSING -> FINALIZING
    this.registerTransition(
      DailyUniverseStatus.PROGRESSING,
      DailyUniverseStatus.FINALIZING,
      PeriodLifecycleEvent.START_FINALIZATION,
      'Initiate period finalization'
    );

    // FINALIZING -> FINALIZED
    this.registerTransition(
      DailyUniverseStatus.FINALIZING,
      DailyUniverseStatus.FINALIZED,
      PeriodLifecycleEvent.COMPLETE_FINALIZATION,
      'Complete period finalization'
    );

    // FINALIZING -> BLOCKED
    this.registerTransition(
      DailyUniverseStatus.FINALIZING,
      DailyUniverseStatus.BLOCKED,
      PeriodLifecycleEvent.BLOCK,
      'Finalization blocked'
    );

    // FINALIZING -> REVIEW_REQUIRED
    this.registerTransition(
      DailyUniverseStatus.FINALIZING,
      DailyUniverseStatus.REVIEW_REQUIRED,
      PeriodLifecycleEvent.REQUIRE_REVIEW,
      'Finalization requires review'
    );

    // FINALIZING -> FAILED
    this.registerTransition(
      DailyUniverseStatus.FINALIZING,
      DailyUniverseStatus.FAILED,
      PeriodLifecycleEvent.FAIL,
      'Finalization failed'
    );

    // BLOCKED -> PROGRESSING (unblock)
    this.registerTransition(
      DailyUniverseStatus.BLOCKED,
      DailyUniverseStatus.PROGRESSING,
      PeriodLifecycleEvent.UNBLOCK,
      'Unblock period progression'
    );

    // REVIEW_REQUIRED -> PROGRESSING
    this.registerTransition(
      DailyUniverseStatus.REVIEW_REQUIRED,
      DailyUniverseStatus.PROGRESSING,
      PeriodLifecycleEvent.RESOLVE_REVIEW,
      'Review resolved, continue progression'
    );

    // REVIEW_REQUIRED -> FINALIZING
    this.registerTransition(
      DailyUniverseStatus.REVIEW_REQUIRED,
      DailyUniverseStatus.FINALIZING,
      PeriodLifecycleEvent.RESOLVE_REVIEW,
      'Review resolved, proceed to finalization'
    );
  }

  public getStatus(): DailyUniverseStatus {
    return this.machine.getCurrentState();
  }

  public canTransition(event: PeriodLifecycleEvent): boolean {
    const from = this.machine.getCurrentState();
    const to = this.transitionMap.get(`${from}:${event}`);
    if (!to) return false;
    return this.machine.canTransition(to);
  }

  public transition(
    event: PeriodLifecycleEvent,
    context?: PeriodLifecycleContext
  ): Result<DailyUniverseStatus, { code: EngineErrorCode; message: string }> {
    const from = this.machine.getCurrentState();
    const to = this.transitionMap.get(`${from}:${event}`);
    if (!to) {
      return failure(
        {
          code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE,
          message: `Invalid period lifecycle transition from ${from} via ${event}`
        },
        `Invalid period lifecycle transition from ${from} via ${event}`
      );
    }
    const res = this.machine.transition(to, undefined, event, context);
    if (res.status !== ResultStatus.SUCCESS) {
      return failure(
        {
          code: EngineErrorCode.INVALID_PERIOD_LIFECYCLE,
          message: `Invalid period lifecycle transition from ${from} to ${to} via ${event}: ${res.message ?? res.error}`
        },
        `Invalid period lifecycle transition from ${from} to ${to} via ${event}: ${res.message ?? res.error}`
      );
    }
    return success(this.machine.getCurrentState());
  }

  public getHistory(): StateTransitionRecord<DailyUniverseStatus, PeriodLifecycleEvent>[] {
    return this.machine.getHistory();
  }
}
