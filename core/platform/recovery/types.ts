/** Phase 21 — deterministic failure recovery contracts. */

export type FailureClass = 'RETRYABLE' | 'BLOCKING' | 'CONFLICT' | 'DATA_CORRUPTION' | 'EXTERNAL_PROVIDER' | 'UNKNOWN';
export type RecoveryAction = 'RETRY' | 'RESTORE_CHECKPOINT' | 'QUARANTINE' | 'ABORT';

export interface Checkpoint<TState> {
  readonly checkpointId: string;
  readonly runId: string;
  readonly phase: string;
  readonly sequence: number;
  readonly generation: number;
  readonly state: TState;
  readonly fingerprint: string;
}

export interface RecoveryDecision {
  readonly action: RecoveryAction;
  readonly reason: string;
  readonly checkpointId?: string;
}
