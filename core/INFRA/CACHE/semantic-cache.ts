/** Phase 19 — deterministic semantic-cache boundary with pluggable similarity. */

import { deterministicKey, normalizeToken, stableSerialize } from '../../SHARED/platform.ts';

export interface SemanticCacheRequest {
  readonly namespace: string;
  readonly intent: string;
  readonly contextFingerprint: string;
  readonly modelProfile: string;
  readonly generation: number;
}

export interface SemanticCacheEntry<T> {
  readonly cacheKey: string;
  readonly request: SemanticCacheRequest;
  readonly value: T;
  readonly generation: number;
  readonly costTokens?: number;
}

export interface SimilarityFunction {
  score(a: string, b: string): number;
}

export class TokenSetSimilarity implements SimilarityFunction {
  public score(a: string, b: string): number {
    const A = new Set(normalizeToken(a).split(' ').filter(Boolean));
    const B = new Set(normalizeToken(b).split(' ').filter(Boolean));
    if (!A.size && !B.size) return 1;
    let intersection = 0;
    for (const token of A) if (B.has(token)) intersection += 1;
    return intersection / Math.max(1, new Set([...A, ...B]).size);
  }
}

export interface SemanticCacheLookupOptions {
  readonly minimumSimilarity?: number;
  readonly maxGenerationAge?: number;
}

export class SemanticCache<T> {
  private readonly entries = new Map<string, SemanticCacheEntry<T>>();
  public constructor(private readonly similarity: SimilarityFunction = new TokenSetSimilarity()) {}

  public put(request: SemanticCacheRequest, value: T, costTokens?: number): SemanticCacheEntry<T> {
    const cacheKey = deterministicKey('SEM', request.namespace, request.contextFingerprint, request.modelProfile, request.intent);
    const entry = Object.freeze({ cacheKey, request: Object.freeze({ ...request }), value, generation: request.generation, ...(costTokens === undefined ? {} : { costTokens }) });
    this.entries.set(cacheKey, entry);
    return entry;
  }

  public exact(request: SemanticCacheRequest): SemanticCacheEntry<T> | null {
    const key = deterministicKey('SEM', request.namespace, request.contextFingerprint, request.modelProfile, request.intent);
    return this.entries.get(key) ?? null;
  }

  public find(request: SemanticCacheRequest, options?: SemanticCacheLookupOptions): SemanticCacheEntry<T> | null {
    const exact = this.exact(request);
    if (exact) return exact;
    const minimumSimilarity = options?.minimumSimilarity ?? 0.92;
    const maxAge = options?.maxGenerationAge ?? 0;
    let best: SemanticCacheEntry<T> | null = null;
    let bestScore = 0;
    for (const entry of this.entries.values()) {
      if (entry.request.namespace !== request.namespace || entry.request.contextFingerprint !== request.contextFingerprint || entry.request.modelProfile !== request.modelProfile) continue;
      if (request.generation < entry.generation || request.generation - entry.generation > maxAge) continue;
      const score = this.similarity.score(entry.request.intent, request.intent);
      if (score >= minimumSimilarity && score > bestScore) {
        best = entry;
        bestScore = score;
      }
    }
    return best;
  }

  public invalidateNamespace(namespace: string): void {
    for (const [key, entry] of this.entries.entries()) if (entry.request.namespace === namespace) this.entries.delete(key);
  }

  public fingerprint(): string {
    return deterministicKey('CACHE', stableSerialize([...this.entries.values()]));
  }
}
