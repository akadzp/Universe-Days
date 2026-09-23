import { deterministicKey, stableSerialize, hash32 } from '../../SHARED/platform.ts';
import { Checkpoint } from '../../INFRA/RECOVERY/types.ts';

export interface CheckpointStore<TState> {
  save(checkpoint: Checkpoint<TState>): void;
  getLatest(runId: string): Checkpoint<TState> | null;
  list(runId: string): readonly Checkpoint<TState>[];
}

export class InMemoryCheckpointStore<TState> implements CheckpointStore<TState> {
  private readonly values = new Map<string, Checkpoint<TState>[]>();

  public save(checkpoint: Checkpoint<TState>): void {
    const list = this.values.get(checkpoint.runId) ?? [];
    const existing = list.findIndex(item => item.checkpointId === checkpoint.checkpointId);
    if (existing >= 0) list[existing] = checkpoint;
    else list.push(Object.freeze({ ...checkpoint }));
    list.sort((a, b) => a.sequence - b.sequence);
    this.values.set(checkpoint.runId, list);
  }

  public getLatest(runId: string): Checkpoint<TState> | null {
    const list = this.values.get(runId) ?? [];
    return list.at(-1) ?? null;
  }

  public list(runId: string): readonly Checkpoint<TState>[] {
    return Object.freeze([...(this.values.get(runId) ?? [])]);
  }

  public static create<TState>(runId: string, phase: string, sequence: number, generation: number, state: TState): Checkpoint<TState> {
    return Object.freeze({
      checkpointId: deterministicKey('CHK', runId, phase, sequence),
      runId,
      phase,
      sequence,
      generation,
      state,
      fingerprint: hash32(stableSerialize(state))
    });
  }
}
