import { deterministicKey } from '../../SHARED/platform.ts';
import { PageJob, PageJobResult, PageBatchResult } from '../../INFRA/PARALLEL/types.ts';

export interface PageJobExecutor<TInput, TOutput> {
  execute(job: PageJob<TInput>): Promise<TOutput> | TOutput;
}

export interface PageBatchOptions {
  readonly concurrency?: number;
  readonly stopOnFatalError?: boolean;
}

export class BoundedPageBatchExecutor<TInput, TOutput> {
  public constructor(private readonly defaultConcurrency = 4) {}

  public async run(jobs: readonly PageJob<TInput>[], executor: PageJobExecutor<TInput, TOutput>, options?: PageBatchOptions): Promise<PageBatchResult<TOutput>> {
    const concurrency = Math.max(1, Math.floor(options?.concurrency ?? this.defaultConcurrency));
    const queue = [...jobs].sort((a, b) => b.priority - a.priority || a.jobId.localeCompare(b.jobId));
    const results: PageJobResult<TOutput>[] = [];
    const seen = new Set<string>();
    const uniqueQueue: PageJob<TInput>[] = [];
    for (const job of queue) {
      if (seen.has(job.idempotencyKey)) {
        results.push({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'SKIPPED', errorCode: 'DUPLICATE_JOB', errorMessage: 'Duplicate idempotency key.' });
        continue;
      }
      seen.add(job.idempotencyKey);
      uniqueQueue.push(job);
    }

    let cursor = 0;
    let halted = false;
    const worker = async (): Promise<void> => {
      while (true) {
        if (halted) return;
        const index = cursor;
        cursor += 1;
        const job = uniqueQueue[index];
        if (!job) return;
        try {
          const output = await executor.execute(job);
          results.push({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'COMPLETED', output });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          results.push({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'FAILED', errorCode: 'PAGE_JOB_FAILED', errorMessage: message });
          if (options?.stopOnFatalError) halted = true;
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, Math.max(1, uniqueQueue.length)) }, () => worker());
    await Promise.all(workers);

    if (halted && cursor < uniqueQueue.length) {
      for (let i = cursor; i < uniqueQueue.length; i += 1) {
        const job = uniqueQueue[i];
        results.push({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'SKIPPED', errorCode: 'BATCH_HALTED', errorMessage: 'Skipped after a fatal batch error.' });
      }
    }

    results.sort((a, b) => a.jobId.localeCompare(b.jobId));
    return Object.freeze({
      batchId: deterministicKey('PAGEBATCH', jobs.map(j => j.jobId).sort()),
      total: jobs.length,
      completed: results.filter(r => r.status === 'COMPLETED').length,
      blocked: results.filter(r => r.status === 'BLOCKED').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      skipped: results.filter(r => r.status === 'SKIPPED').length,
      results: Object.freeze(results)
    });
  }
}

export function buildPageJobs<TInput>(
  pages: readonly { pageDefinitionId: string; priority: number; concurrencyClass?: string }[],
  createInput: (pageDefinitionId: string) => TInput,
  namespace: string
): readonly PageJob<TInput>[] {
  return Object.freeze(pages.map(page => Object.freeze({
    jobId: deterministicKey('PAGEJOB', namespace, page.pageDefinitionId),
    pageDefinitionId: page.pageDefinitionId,
    input: createInput(page.pageDefinitionId),
    priority: page.priority,
    ...(page.concurrencyClass ? { concurrencyClass: page.concurrencyClass } : {}),
    idempotencyKey: deterministicKey('PAGEJOBKEY', namespace, page.pageDefinitionId)
  })));
}
