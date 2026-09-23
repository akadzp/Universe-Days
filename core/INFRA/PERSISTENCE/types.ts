/** Phase 30 — Durable Production Persistence Types. */

export interface ProductionRunRecord {
  readonly runId: string;
  readonly status: 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'CACHED';
  readonly universeId?: string;
  readonly universeScope?: string;
  readonly purpose: string;
  readonly timestamp: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cost: number;
  readonly providerId?: string;
  readonly modelId?: string;
  readonly output?: unknown;
  readonly reason?: string;
  readonly contextFingerprint?: string;
}

export interface FileProductionStoreOptions {
  readonly rootDir?: string;
}

export interface ListProductionRunsOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: string;
}
