/**
 * Phase 6: Daily Story Lifecycle State Machine.
 * Manages deterministic state progression of a Daily Story.
 */

import { GenericStateMachine, StateTransitionRecord } from '../RUNTIME/ENGINE/state-machine.ts';
import { Result, ResultStatus, success, failure } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';

export enum StoryLifecycleStatus {
  UNINITIALIZED = 'UNINITIALIZED',
  TRIGGERED = 'TRIGGERED',
  SCOPED = 'SCOPED',
  DATED = 'DATED',
  IDENTIFIED = 'IDENTIFIED',
  READY_FOR_PRODUCTION = 'READY_FOR_PRODUCTION',
  IN_PRODUCTION = 'IN_PRODUCTION',
  RENDERED = 'RENDERED',
  VALIDATED = 'VALIDATED',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum StoryLifecycleEvent {
  ACCEPT_TRIGGER = 'ACCEPT_TRIGGER',
  BIND_SCOPE = 'BIND_SCOPE',
  ASSIGN_DATE = 'ASSIGN_DATE',
  ASSIGN_ID = 'ASSIGN_ID',
  MARK_READY = 'MARK_READY',
  START_PRODUCTION = 'START_PRODUCTION',
  COMPLETE_RENDER = 'COMPLETE_RENDER',
  PASS_VALIDATION = 'PASS_VALIDATION',
  FINALIZE_STORY = 'FINALIZE_STORY',
  BLOCK = 'BLOCK',
  UNBLOCK = 'UNBLOCK',
  REQUIRE_REVIEW = 'REQUIRE_REVIEW',
  RESOLVE_REVIEW = 'RESOLVE_REVIEW',
  REQUIRE_REVISION = 'REQUIRE_REVISION',
  RESTART_FROM_REVISION = 'RESTART_FROM_REVISION',
  FAIL = 'FAIL',
  CANCEL = 'CANCEL'
}

export interface StoryLifecycleContext {
  storyId?: string;
  triggerId?: string;
  reason?: string;
}

export class StoryLifecycleManager {
  private machine: GenericStateMachine<StoryLifecycleStatus, StoryLifecycleEvent, StoryLifecycleContext>;
  private transitionMap: Map<string, StoryLifecycleStatus> = new Map();

  constructor(initialStatus: StoryLifecycleStatus = StoryLifecycleStatus.UNINITIALIZED) {
    this.machine = new GenericStateMachine<StoryLifecycleStatus, StoryLifecycleEvent, StoryLifecycleContext>(initialStatus);
    this.configureTransitions();
  }

  private registerTransition(
    from: StoryLifecycleStatus,
    to: StoryLifecycleStatus,
    event: StoryLifecycleEvent,
    description?: string
  ): void {
    this.machine.addTransition(from, to, event, undefined, undefined, description);
    this.transitionMap.set(`${from}:${event}`, to);
  }

  private configureTransitions(): void {
    // Normal Progression
    this.registerTransition(
      StoryLifecycleStatus.UNINITIALIZED,
      StoryLifecycleStatus.TRIGGERED,
      StoryLifecycleEvent.ACCEPT_TRIGGER,
      'Accept valid story trigger'
    );

    this.registerTransition(
      StoryLifecycleStatus.TRIGGERED,
      StoryLifecycleStatus.SCOPED,
      StoryLifecycleEvent.BIND_SCOPE,
      'Bind Universe scope to story'
    );

    this.registerTransition(
      StoryLifecycleStatus.SCOPED,
      StoryLifecycleStatus.DATED,
      StoryLifecycleEvent.ASSIGN_DATE,
      'Assign authoritative Story Date'
    );

    this.registerTransition(
      StoryLifecycleStatus.DATED,
      StoryLifecycleStatus.IDENTIFIED,
      StoryLifecycleEvent.ASSIGN_ID,
      'Generate deterministic Story ID'
    );

    this.registerTransition(
      StoryLifecycleStatus.IDENTIFIED,
      StoryLifecycleStatus.READY_FOR_PRODUCTION,
      StoryLifecycleEvent.MARK_READY,
      'Mark package ready for production'
    );

    this.registerTransition(
      StoryLifecycleStatus.READY_FOR_PRODUCTION,
      StoryLifecycleStatus.IN_PRODUCTION,
      StoryLifecycleEvent.START_PRODUCTION,
      'Begin story rendering'
    );

    this.registerTransition(
      StoryLifecycleStatus.IN_PRODUCTION,
      StoryLifecycleStatus.RENDERED,
      StoryLifecycleEvent.COMPLETE_RENDER,
      'Complete rendering'
    );

    this.registerTransition(
      StoryLifecycleStatus.RENDERED,
      StoryLifecycleStatus.VALIDATED,
      StoryLifecycleEvent.PASS_VALIDATION,
      'Pass story validation'
    );

    this.registerTransition(
      StoryLifecycleStatus.VALIDATED,
      StoryLifecycleStatus.COMPLETED,
      StoryLifecycleEvent.FINALIZE_STORY,
      'Complete story lifecycle'
    );

    // Block / Unblock transitions
    const blockableStates = [
      StoryLifecycleStatus.TRIGGERED,
      StoryLifecycleStatus.SCOPED,
      StoryLifecycleStatus.DATED,
      StoryLifecycleStatus.IDENTIFIED,
      StoryLifecycleStatus.READY_FOR_PRODUCTION,
      StoryLifecycleStatus.IN_PRODUCTION
    ];

    for (const state of blockableStates) {
      this.registerTransition(state, StoryLifecycleStatus.BLOCKED, StoryLifecycleEvent.BLOCK, `Block story from ${state}`);
      this.registerTransition(state, StoryLifecycleStatus.REVIEW_REQUIRED, StoryLifecycleEvent.REQUIRE_REVIEW, `Require review from ${state}`);
      this.registerTransition(state, StoryLifecycleStatus.FAILED, StoryLifecycleEvent.FAIL, `Fail story from ${state}`);
      this.registerTransition(state, StoryLifecycleStatus.CANCELLED, StoryLifecycleEvent.CANCEL, `Cancel story from ${state}`);
    }

    this.registerTransition(
      StoryLifecycleStatus.BLOCKED,
      StoryLifecycleStatus.READY_FOR_PRODUCTION,
      StoryLifecycleEvent.UNBLOCK,
      'Unblock story to ready state'
    );
    this.registerTransition(
      StoryLifecycleStatus.BLOCKED,
      StoryLifecycleStatus.SCOPED,
      StoryLifecycleEvent.UNBLOCK,
      'Unblock story to scoped state'
    );

    this.registerTransition(
      StoryLifecycleStatus.REVIEW_REQUIRED,
      StoryLifecycleStatus.READY_FOR_PRODUCTION,
      StoryLifecycleEvent.RESOLVE_REVIEW,
      'Resolve review'
    );

    // Revisions
    this.registerTransition(
      StoryLifecycleStatus.COMPLETED,
      StoryLifecycleStatus.REVISION_REQUIRED,
      StoryLifecycleEvent.REQUIRE_REVISION,
      'Require revision on completed story due to upstream changes'
    );
    this.registerTransition(
      StoryLifecycleStatus.VALIDATED,
      StoryLifecycleStatus.REVISION_REQUIRED,
      StoryLifecycleEvent.REQUIRE_REVISION,
      'Require revision on validated story'
    );
    this.registerTransition(
      StoryLifecycleStatus.READY_FOR_PRODUCTION,
      StoryLifecycleStatus.REVISION_REQUIRED,
      StoryLifecycleEvent.REQUIRE_REVISION,
      'Require revision on ready story'
    );

    this.registerTransition(
      StoryLifecycleStatus.REVISION_REQUIRED,
      StoryLifecycleStatus.SCOPED,
      StoryLifecycleEvent.RESTART_FROM_REVISION,
      'Re-enter lifecycle from scoped state after revision'
    );
  }

  public get currentStatus(): StoryLifecycleStatus {
    return this.machine.getCurrentState();
  }

  public get history(): StateTransitionRecord<StoryLifecycleStatus, StoryLifecycleEvent>[] {
    return this.machine.getHistory();
  }

  public canTransition(event: StoryLifecycleEvent): boolean {
    const from = this.machine.getCurrentState();
    const to = this.transitionMap.get(`${from}:${event}`);
    if (!to) return false;
    return this.machine.canTransition(to);
  }

  public transition(
    event: StoryLifecycleEvent,
    context?: StoryLifecycleContext
  ): Result<StoryLifecycleStatus, { code: EngineErrorCode; message: string; details?: unknown }> {
    const fromState = this.machine.getCurrentState();
    const key = `${fromState}:${event}`;
    const targetState = this.transitionMap.get(key);

    if (!targetState) {
      const msg = `Invalid Story lifecycle transition from ${fromState} via event ${event}`;
      return failure(
        {
          code: EngineErrorCode.INVALID_STORY_LIFECYCLE,
          message: msg,
          details: { fromState, event, context }
        },
        msg
      );
    }

    const res = this.machine.transition(targetState, context, event, context);
    if (res.status !== ResultStatus.SUCCESS) {
      const msg = `Story state transition rejected: ${res.message ?? res.error}`;
      return failure(
        {
          code: EngineErrorCode.INVALID_STORY_LIFECYCLE,
          message: msg,
          details: { fromState, event, context }
        },
        msg
      );
    }

    return success(this.machine.getCurrentState());
  }
}
