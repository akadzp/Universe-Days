import { CheckpointStore } from './checkpoint.ts';
import { Checkpoint, FailureClass, RecoveryDecision } from './types.ts';

export class RecoveryManager<TState> {
  public constructor(private readonly store: CheckpointStore<TState>) {}

  public checkpoint(checkpoint: Checkpoint<TState>): void {
    this.store.save(checkpoint);
  }

  public decide(runId: string, failureClass: FailureClass, retryCount: number, maxRetries = 2): RecoveryDecision {
    const latest = this.store.getLatest(runId);
    if (failureClass === 'RETRYABLE' && retryCount < maxRetries) return { action: 'RETRY', reason: 'Failure is retryable and retry budget remains.' };
    if (latest && ['EXTERNAL_PROVIDER', 'CONFLICT'].includes(failureClass)) {
      return { action: 'RESTORE_CHECKPOINT', reason: `Recover from latest stable checkpoint for failure class ${failureClass}.`, checkpointId: latest.checkpointId };
    }
    if (failureClass === 'DATA_CORRUPTION') return { action: 'QUARANTINE', reason: 'Data corruption cannot be silently replayed.' };
    return { action: 'ABORT', reason: `No safe recovery action for ${failureClass}.` };
  }
}
