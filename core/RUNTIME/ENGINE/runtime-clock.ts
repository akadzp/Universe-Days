/**
 * Phase 9: Deterministic Runtime Clock
 *
 * The engine never reads wall-clock time by itself.
 * Callers that need operational time must inject a RuntimeClock implementation.
 *
 * FixedRuntimeClock is the deterministic default used by the core engine.
 */
export interface RuntimeClock {
  now(): number;
}

export class FixedRuntimeClock implements RuntimeClock {
  constructor(private readonly value: number = 0) {}

  public now(): number {
    return this.value;
  }
}
