import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export type StateTransitionValidator<TPayload = unknown> = (payload?: TPayload) => boolean;
export type StateTransitionGuard<TPayload = unknown, TContext = unknown> = (
  payload?: TPayload,
  context?: TContext
) => boolean;

export interface StateTransition<
  TState extends string = string,
  TEvent extends string = string,
  TPayload = unknown,
  TContext = unknown
> {
  from: TState;
  to: TState;
  event?: TEvent;
  validator?: StateTransitionValidator<TPayload>;
  guard?: StateTransitionGuard<TPayload, TContext>;
  description?: string;
}

export interface StateTransitionRecord<
  TState extends string = string,
  TEvent extends string = string,
  TPayload = unknown
> {
  transitionId: string;
  from: TState;
  to: TState;
  event?: TEvent;
  payload?: TPayload;
  timestamp: number;
}

export class GenericStateMachine<
  TState extends string = string,
  TEvent extends string = string,
  TContext = unknown
> {
  private currentState: TState;
  private initialState: TState;
  private transitions: Map<TState, StateTransition<TState, TEvent, any, TContext>[]> = new Map();
  private history: StateTransitionRecord<TState, TEvent, any>[] = [];
  private transitionCounter = 0;

  constructor(initialState: TState) {
    this.currentState = initialState;
    this.initialState = initialState;
  }

  /**
   * Registers an allowed transition from one state to another.
   */
  public addTransition(
    from: TState,
    to: TState,
    event?: TEvent,
    validator?: StateTransitionValidator<any>,
    guard?: StateTransitionGuard<any, TContext>,
    description?: string
  ): this {
    const list = this.transitions.get(from) || [];
    list.push({ from, to, event, validator, guard, description });
    this.transitions.set(from, list);
    return this;
  }

  /**
   * Returns the current state of the machine.
   */
  public getCurrentState(): TState {
    return this.currentState;
  }

  /**
   * Returns the initial state.
   */
  public getInitialState(): TState {
    return this.initialState;
  }

  /**
   * Returns all registered transitions from the current state.
   */
  public getAllowedNextStates(): TState[] {
    const allowed = this.transitions.get(this.currentState) || [];
    return Array.from(new Set(allowed.map(t => t.to)));
  }

  /**
   * Checks if transition to target state is permissible without mutating current state.
   */
  public canTransition(to: TState, payload?: unknown, context?: TContext): boolean {
    const availableTransitions = this.transitions.get(this.currentState) || [];
    const matching = availableTransitions.filter(t => t.to === to);

    if (matching.length === 0) return false;

    return matching.some(t => {
      if (t.validator && !t.validator(payload)) return false;
      if (t.guard && !t.guard(payload, context)) return false;
      return true;
    });
  }

  /**
   * Deterministically executes a state transition.
   * If invalid or guard fails, the transition is rejected and current state remains completely unchanged.
   * If valid, state updates and a traceable transition record is appended to history.
   */
  public transition(
    to: TState,
    payload?: unknown,
    event?: TEvent,
    context?: TContext
  ): Result<TState> {
    const availableTransitions = this.transitions.get(this.currentState) || [];
    const matching = availableTransitions.filter(t => t.to === to && (!event || !t.event || t.event === event));

    if (matching.length === 0) {
      return failure(
        EngineErrorCode.INVALID_TRANSITION,
        'INVALID_STATE_TRANSITION'
      );
    }

    const validTransition = matching.find(t => {
      if (t.validator && !t.validator(payload)) return false;
      if (t.guard && !t.guard(payload, context)) return false;
      return true;
    });

    if (!validTransition) {
      return failure(
        EngineErrorCode.GUARD_REJECTED,
        'TRANSITION_VALIDATION_FAILED'
      );
    }

    const previousState = this.currentState;
    this.currentState = to;
    this.transitionCounter += 1;

    const record: StateTransitionRecord<TState, TEvent, any> = {
      transitionId: `TR-${this.transitionCounter.toString().padStart(4, '0')}`,
      from: previousState,
      to,
      event: event || validTransition.event,
      payload,
      timestamp: Date.now()
    };
    this.history.push(record);

    return success(this.currentState, `Transitioned state successfully: ${previousState} -> ${to}`);
  }

  /**
   * Returns immutable copy of the transition history.
   */
  public getHistory(): StateTransitionRecord<TState, TEvent, any>[] {
    return [...this.history];
  }

  /**
   * Resets machine to initial state and clears history.
   */
  public reset(): void {
    this.currentState = this.initialState;
    this.history = [];
    this.transitionCounter = 0;
  }
}
