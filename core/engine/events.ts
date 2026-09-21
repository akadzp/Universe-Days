/**
 * Phase 9: Runtime Engine Events & Hooks
 *
 * Internal engine event bus for lifecycle hooks and monitoring.
 * Strictly decoupled from in-universe factual events (UniverseEvent).
 */

export type EngineEventName =
  | 'execution.started'
  | 'execution.step.started'
  | 'execution.step.completed'
  | 'validation.failed'
  | 'conflict.detected'
  | 'mutation.committed'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.blocked';

export interface EngineRuntimeEvent<TPayload = unknown> {
  eventName: EngineEventName;
  executionId: string;
  timestamp: number;
  payload: TPayload;
}

export type EngineEventListener<TPayload = unknown> = (event: EngineRuntimeEvent<TPayload>) => void | Promise<void>;

export class EngineEventBus {
  private listeners: Map<EngineEventName, Set<EngineEventListener<any>>> = new Map();

  public subscribe<TPayload = unknown>(
    eventName: EngineEventName,
    listener: EngineEventListener<TPayload>
  ): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listener);

    return () => {
      this.listeners.get(eventName)?.delete(listener);
    };
  }

  public emit<TPayload = unknown>(
    eventName: EngineEventName,
    executionId: string,
    payload: TPayload
  ): void {
    const event: EngineRuntimeEvent<TPayload> = {
      eventName,
      executionId,
      timestamp: Date.now(),
      payload
    };

    const handlers = this.listeners.get(eventName);
    if (handlers) {
      for (const listener of handlers) {
        try {
          listener(event);
        } catch {
          // Listeners should never crash core engine execution
        }
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
