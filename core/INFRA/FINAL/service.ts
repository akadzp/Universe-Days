import { buildPageJobs, BoundedPageBatchExecutor } from '../../INFRA/PARALLEL/executor.ts';
import type { PageBatchResult } from '../../INFRA/PARALLEL/types.ts';
import { PageCatalog } from '../../INFRA/SCALING/catalog.ts';
import { HardenedRuntimeBoundary } from '../../INFRA/HARDENING/runtime.ts';

export interface ProductionPageService<TSharedContext, TOutput> {
  readonly catalog: PageCatalog;
  readonly hardening: HardenedRuntimeBoundary;
  readonly executor: BoundedPageBatchExecutor<any, TOutput>;
  run(
    namespace: string,
    sharedContext: TSharedContext,
    createInput: (pageDefinitionId: string, sharedContext: TSharedContext) => any,
    execute: (input: any, pageDefinitionId: string) => Promise<TOutput> | TOutput,
    options?: { readonly concurrency?: number; readonly stopOnFatalError?: boolean }
  ): Promise<PageBatchResult<TOutput>>;
}

export class DefaultProductionPageService<TSharedContext, TOutput> implements ProductionPageService<TSharedContext, TOutput> {
  public constructor(
    public readonly catalog: PageCatalog,
    public readonly hardening: HardenedRuntimeBoundary,
    public readonly executor: BoundedPageBatchExecutor<any, TOutput>
  ) {}

  public async run(
    namespace: string,
    sharedContext: TSharedContext,
    createInput: (pageDefinitionId: string, sharedContext: TSharedContext) => any,
    execute: (input: any, pageDefinitionId: string) => Promise<TOutput> | TOutput,
    options?: { readonly concurrency?: number; readonly stopOnFatalError?: boolean }
  ): Promise<PageBatchResult<TOutput>> {
    const pages = this.catalog.list({ enabledOnly: true });
    const gate = this.hardening.gatePageBatch(pages.length);
    if (!gate.ok) {
      throw new Error(`${gate.error?.code}: ${gate.error?.message}`);
    }
    const jobs = buildPageJobs(pages, id => createInput(id, sharedContext), namespace);
    return this.executor.run(jobs, {
      execute: job => execute(job.input, job.pageDefinitionId)
    }, options);
  }
}
