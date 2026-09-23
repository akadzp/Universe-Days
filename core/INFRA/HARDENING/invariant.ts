import { hash32, stableSerialize } from '../../SHARED/platform.ts';

export interface MutationGuardSnapshot {
  readonly fingerprint: string;
}

export class MutationGuard {
  public snapshot(value: unknown): MutationGuardSnapshot {
    return Object.freeze({ fingerprint: hash32(stableSerialize(value)) });
  }

  public assertUnchanged(before: MutationGuardSnapshot, afterValue: unknown): void {
    const after = hash32(stableSerialize(afterValue));
    if (before.fingerprint !== after) {
      throw new Error('CANON_MUTATION_DETECTED: protected value changed across a non-owner operation.');
    }
  }
}
