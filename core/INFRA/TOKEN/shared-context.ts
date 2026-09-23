/** Phase 17 — reuse read-only context across many page jobs. */

import { deterministicKey, hash32, stableSerialize } from '../../SHARED/platform.ts';

export interface SharedContextBlock {
  readonly blockId: string;
  readonly content: string;
  readonly fingerprint: string;
  readonly estimatedTokens: number;
}

export class SharedContextPool {
  private readonly blocks = new Map<string, SharedContextBlock>();

  public intern(content: string): SharedContextBlock {
    const fingerprint = hash32(content);
    const existing = this.blocks.get(fingerprint);
    if (existing) return existing;
    const block: SharedContextBlock = Object.freeze({
      blockId: deterministicKey('SHAREDCTX', fingerprint),
      content,
      fingerprint,
      estimatedTokens: Math.ceil(content.length / 4)
    });
    this.blocks.set(fingerprint, block);
    return block;
  }

  public get(fingerprint: string): SharedContextBlock | null {
    return this.blocks.get(fingerprint) ?? null;
  }

  public fingerprint(): string {
    return hash32(stableSerialize([...this.blocks.values()].sort((a, b) => a.blockId.localeCompare(b.blockId))));
  }
}
