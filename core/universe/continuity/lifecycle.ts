/**
 * Phase 4: Continuity Lifecycle.
 * Implements lifecycle state transitions using the existing Phase 1/2 GenericStateMachine.
 */

import { GenericStateMachine } from '../../engine/state-machine.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { ContinuityStatus, ContinuityIdentity } from './continuity-model.ts';
import { TransitionType, Transition } from './transition.ts';

export interface ContinuityLifecycleContext {
  identity?: ContinuityIdentity;
  allowReopen?: boolean;
}

export class ContinuityLifecycleManager {
  private machine: GenericStateMachine<ContinuityStatus, TransitionType, ContinuityLifecycleContext>;

  constructor(initialStatus: ContinuityStatus = ContinuityStatus.ACTIVE) {
    this.machine = new GenericStateMachine<ContinuityStatus, TransitionType, ContinuityLifecycleContext>(initialStatus);
    this.configureTransitions();
  }

  /**
   * Configures all valid lifecycle transitions in the GenericStateMachine.
   */
  private configureTransitions(): void {
    // From UNKNOWN
    this.machine.addTransition(
      ContinuityStatus.UNKNOWN,
      ContinuityStatus.UNKNOWN,
      TransitionType.UNKNOWN,
      undefined,
      undefined,
      'Maintain unknown status'
    );
    this.machine.addTransition(
      ContinuityStatus.UNKNOWN,
      ContinuityStatus.ACTIVE,
      TransitionType.NEW,
      undefined,
      undefined,
      'Initialize new continuity from unknown'
    );
    this.machine.addTransition(
      ContinuityStatus.UNKNOWN,
      ContinuityStatus.ACTIVE,
      TransitionType.CONTINUE,
      undefined,
      undefined,
      'Activate confirmed continuity from unknown'
    );
    this.machine.addTransition(
      ContinuityStatus.UNKNOWN,
      ContinuityStatus.ENDED,
      TransitionType.END,
      undefined,
      undefined,
      'End unknown continuity'
    );
    this.machine.addTransition(
      ContinuityStatus.UNKNOWN,
      ContinuityStatus.UNRESOLVED,
      TransitionType.UNRESOLVED,
      undefined,
      undefined,
      'Flag unknown as unresolved issue'
    );

    // From UNRESOLVED
    this.machine.addTransition(
      ContinuityStatus.UNRESOLVED,
      ContinuityStatus.UNRESOLVED,
      TransitionType.UNRESOLVED,
      undefined,
      undefined,
      'Maintain unresolved status'
    );
    this.machine.addTransition(
      ContinuityStatus.UNRESOLVED,
      ContinuityStatus.ACTIVE,
      TransitionType.CONTINUE,
      undefined,
      undefined,
      'Resolve to continue'
    );
    this.machine.addTransition(
      ContinuityStatus.UNRESOLVED,
      ContinuityStatus.ACTIVE,
      TransitionType.CHANGE,
      undefined,
      undefined,
      'Resolve with change'
    );
    this.machine.addTransition(
      ContinuityStatus.UNRESOLVED,
      ContinuityStatus.ENDED,
      TransitionType.END,
      undefined,
      undefined,
      'Resolve with termination'
    );
    this.machine.addTransition(
      ContinuityStatus.UNRESOLVED,
      ContinuityStatus.SUSPENDED,
      TransitionType.SUSPEND,
      undefined,
      undefined,
      'Suspend unresolved item'
    );

    // From ACTIVE
    this.machine.addTransition(
      ContinuityStatus.ACTIVE,
      ContinuityStatus.ACTIVE,
      TransitionType.CONTINUE,
      undefined,
      undefined,
      'Maintain active continuation'
    );
    this.machine.addTransition(
      ContinuityStatus.ACTIVE,
      ContinuityStatus.ACTIVE,
      TransitionType.CHANGE,
      undefined,
      undefined,
      'Apply condition change while active'
    );
    this.machine.addTransition(
      ContinuityStatus.ACTIVE,
      ContinuityStatus.ACTIVE,
      TransitionType.TRANSFORM,
      undefined,
      undefined,
      'Transform form while remaining active'
    );
    this.machine.addTransition(
      ContinuityStatus.ACTIVE,
      ContinuityStatus.ACTIVE,
      TransitionType.REPLACE,
      undefined,
      undefined,
      'Replace condition with successor'
    );
    this.machine.addTransition(
      ContinuityStatus.ACTIVE,
      ContinuityStatus.SUSPENDED,
      TransitionType.SUSPEND,
      undefined,
      undefined,
      'Temporarily suspend active continuity'
    );
    this.machine.addTransition(
      ContinuityStatus.ACTIVE,
      ContinuityStatus.ENDED,
      TransitionType.END,
      undefined,
      undefined,
      'Terminate active continuity'
    );
    this.machine.addTransition(
      ContinuityStatus.ACTIVE,
      ContinuityStatus.UNRESOLVED,
      TransitionType.UNRESOLVED,
      undefined,
      undefined,
      'Mark active item as having an unresolved conflict'
    );
    this.machine.addTransition(
      ContinuityStatus.ACTIVE,
      ContinuityStatus.UNKNOWN,
      TransitionType.UNKNOWN,
      undefined,
      undefined,
      'Mark active item as having unknown state'
    );

    // From SUSPENDED
    this.machine.addTransition(
      ContinuityStatus.SUSPENDED,
      ContinuityStatus.ACTIVE,
      TransitionType.RESUME,
      undefined,
      undefined,
      'Resume suspended continuity'
    );
    this.machine.addTransition(
      ContinuityStatus.SUSPENDED,
      ContinuityStatus.ENDED,
      TransitionType.END,
      undefined,
      undefined,
      'Terminate suspended continuity'
    );
    this.machine.addTransition(
      ContinuityStatus.SUSPENDED,
      ContinuityStatus.UNRESOLVED,
      TransitionType.UNRESOLVED,
      undefined,
      undefined,
      'Mark suspended item as unresolved'
    );

    // From ENDED
    // Guard: Reopening requires explicit allowReopen context flag
    this.machine.addTransition(
      ContinuityStatus.ENDED,
      ContinuityStatus.ACTIVE,
      TransitionType.NEW,
      undefined,
      (_payload, context) => Boolean(context?.allowReopen),
      'Explicit authorized reopening of ended continuity'
    );
  }

  /**
   * Returns current status.
   */
  public getStatus(): ContinuityStatus {
    return this.machine.getCurrentState();
  }

  /**
   * Determines if a transition is legal from the current status without mutating state.
   */
  public canTransition(
    toStatus: ContinuityStatus,
    transition?: Transition,
    context?: ContinuityLifecycleContext
  ): boolean {
    return this.machine.canTransition(toStatus, transition, context);
  }

  /**
   * Maps a TransitionType and current status to the intended target status.
   */
  public static mapTargetStatus(currentStatus: ContinuityStatus, transition: Transition): ContinuityStatus {
    switch (transition.type) {
      case TransitionType.NEW:
        return ContinuityStatus.ACTIVE;
      case TransitionType.CONTINUE:
      case TransitionType.CHANGE:
      case TransitionType.TRANSFORM:
      case TransitionType.REPLACE:
        return currentStatus === ContinuityStatus.SUSPENDED ? ContinuityStatus.SUSPENDED : ContinuityStatus.ACTIVE;
      case TransitionType.SUSPEND:
        return ContinuityStatus.SUSPENDED;
      case TransitionType.RESUME:
        return ContinuityStatus.ACTIVE;
      case TransitionType.END:
        return ContinuityStatus.ENDED;
      case TransitionType.UNRESOLVED:
        return ContinuityStatus.UNRESOLVED;
      case TransitionType.UNKNOWN:
        return ContinuityStatus.UNKNOWN;
      default:
        return ContinuityStatus.INVALID;
    }
  }

  /**
   * Applies the transition to the internal GenericStateMachine.
   */
  public applyTransition(
    transition: Transition,
    context?: ContinuityLifecycleContext
  ): Result<ContinuityStatus> {
    const targetStatus = ContinuityLifecycleManager.mapTargetStatus(this.getStatus(), transition);

    if (targetStatus === ContinuityStatus.INVALID) {
      return failure(
        EngineErrorCode.INVALID_TRANSITION,
        `Cannot determine target status for transition type "${transition.type}"`
      );
    }

    const res = this.machine.transition(targetStatus, transition, transition.type, context);
    if (res.status === 'FAILURE') {
      return failure(
        EngineErrorCode.INVALID_TRANSITION,
        `Lifecycle transition rejected: from "${this.getStatus()}" to "${targetStatus}" via "${transition.type}": ${res.message}`
      );
    }

    return success(this.getStatus());
  }

  /**
   * Returns state machine transition history.
   */
  public getHistory() {
    return this.machine.getHistory();
  }
}
