/** Phase 16 — bounded parallel page production contracts. */

export type PageJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'SKIPPED';

export interface PageJob<TInput> {
  readonly jobId: string;
  readonly pageDefinitionId: string;
  readonly input: TInput;
  readonly priority: number;
  readonly concurrencyClass?: string;
  readonly idempotencyKey: string;
}

export interface PageJobResult<TOutput> {
  readonly jobId: string;
  readonly pageDefinitionId: string;
  readonly status: Exclude<PageJobStatus, 'QUEUED' | 'RUNNING'>;
  readonly output?: TOutput;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface PageBatchResult<TOutput> {
  readonly batchId: string;
  readonly total: number;
  readonly completed: number;
  readonly blocked: number;
  readonly failed: number;
  readonly skipped: number;
  readonly results: readonly PageJobResult<TOutput>[];
}
