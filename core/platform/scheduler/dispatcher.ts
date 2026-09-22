/** Phase 31 — real scheduled production dispatcher. */

import { deterministicKey } from '../shared.ts';
import type { PageCatalog } from '../scaling/catalog.ts';
import { BoundedPageBatchExecutor, buildPageJobs } from '../parallel/executor.ts';
import type { PageBatchResult } from '../parallel/types.ts';
import type { DailyProductionBridge, DailyProductionBridgeResult } from '../production/daily-bridge.ts';
import type { ModelRoutingPolicy } from '../model/types.ts';
import type { UniverseAuthorityStore } from '../universe/authority.ts';
import { FileScheduledJobStore, type ScheduledJobRecord } from '../persistence/scheduled-jobs.ts';
import type { ScheduledJob } from './types.ts';
import { PageProductionScheduler } from './scheduler.ts';

export interface ScheduledExecutionInput {
  readonly universeDate: string;
  readonly pageDefinitionIds?: readonly string[];
  readonly retryFailed?: boolean;
  readonly retryDispatched?: boolean;
  readonly userInstruction?: string;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly routing?: ModelRoutingPolicy;
  readonly bypassCache?: boolean;
}

export interface ScheduledDispatchResult {
  readonly jobId: string;
  readonly pageDefinitionId: string;
  readonly status: 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'SKIPPED';
  readonly attempt: number;
  readonly productionRunId?: string;
  readonly reason?: string;
}

export interface ScheduledExecutionReport {
  readonly status: 'COMPLETED' | 'PARTIAL' | 'BLOCKED' | 'FAILED';
  readonly universeId: string;
  readonly universeScope: string;
  readonly universeDate: string;
  readonly total: number;
  readonly dispatched: number;
  readonly completed: number;
  readonly blocked: number;
  readonly failed: number;
  readonly skipped: number;
  readonly results: readonly ScheduledDispatchResult[];
}

export interface ScheduledProductionDispatcherDependencies {
  readonly scheduler: PageProductionScheduler;
  readonly pageCatalog: PageCatalog;
  readonly bridge: DailyProductionBridge;
  readonly authority: UniverseAuthorityStore;
  readonly executor: BoundedPageBatchExecutor<ScheduledJob, ScheduledDispatchResult>;
  readonly jobStore: FileScheduledJobStore;
}

export class ScheduledProductionDispatcher {
  public constructor(private readonly deps: ScheduledProductionDispatcherDependencies) {}

  public async executeDue(input: ScheduledExecutionInput): Promise<ScheduledExecutionReport> {
    const mounted = this.deps.authority.get();
    if (!mounted) throw new Error('No authoritative Universe instance is mounted.');
    if (mounted.universe.temporalContext.currentUniverseDate !== input.universeDate) {
      throw new Error(`Scheduled date '${input.universeDate}' does not match mounted Universe date '${mounted.universe.temporalContext.currentUniverseDate}'.`);
    }

    const requested = new Set(input.pageDefinitionIds ?? []);
    const due = this.deps.scheduler.due(input.universeDate)
      .filter(job => requested.size === 0 || requested.has(job.pageDefinitionId));

    const results: ScheduledDispatchResult[] = [];
    const candidates: ScheduledJob[] = [];

    for (const job of due) {
      const existing = await this.deps.jobStore.get(job.jobId);
      if (existing?.status === 'COMPLETED') {
        results.push(Object.freeze({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'SKIPPED', attempt: existing.attempt, productionRunId: existing.productionRunId, reason: 'Job already completed.' }));
        continue;
      }
      if (existing?.status === 'DISPATCHED' && !input.retryDispatched) {
        results.push(Object.freeze({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'SKIPPED', attempt: existing.attempt, reason: 'Job is already dispatched. Use retryDispatched to recover an interrupted dispatch.' }));
        continue;
      }
      if ((existing?.status === 'FAILED' || existing?.status === 'BLOCKED') && !input.retryFailed) {
        results.push(Object.freeze({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'SKIPPED', attempt: existing.attempt, reason: `Job is ${existing.status}. Use retryFailed to retry.` }));
        continue;
      }
      candidates.push(job);
    }

    const pageJobs = buildPageJobs(
      candidates,
      job => job,
      deterministicKey('SCHED_BATCH', mounted.universe.universeId, mounted.universeScope, input.universeDate)
    );

    const batch: PageBatchResult<ScheduledDispatchResult> = await this.deps.executor.run(
      pageJobs,
      { execute: job => this.executeOne(job, input, mounted.universe.temporalContext.currentUniverseTime) },
      { stopOnFatalError: false }
    );

    results.push(...batch.results.filter(item => item.output).map(item => item.output!));
    results.push(...batch.results.filter(item => item.status === 'SKIPPED').map(item => ({
      jobId: item.jobId,
      pageDefinitionId: item.pageDefinitionId,
      status: 'SKIPPED' as const,
      attempt: 0,
      reason: item.errorMessage || item.errorCode
    })));

    results.sort((a, b) => a.jobId.localeCompare(b.jobId));
    const completed = results.filter(item => item.status === 'COMPLETED').length;
    const blocked = results.filter(item => item.status === 'BLOCKED').length;
    const failed = results.filter(item => item.status === 'FAILED').length;
    const skipped = results.filter(item => item.status === 'SKIPPED').length;
    const dispatched = candidates.length;
    const status = blocked + failed === 0 ? 'COMPLETED' : completed > 0 ? 'PARTIAL' : 'FAILED';

    return Object.freeze({
      status,
      universeId: mounted.universe.universeId,
      universeScope: mounted.universeScope,
      universeDate: input.universeDate,
      total: due.length,
      dispatched,
      completed,
      blocked,
      failed,
      skipped,
      results: Object.freeze(results)
    });
  }

  private async executeOne(job: ScheduledJob, input: ScheduledExecutionInput, universeTime: string): Promise<ScheduledDispatchResult> {
    const existing = await this.deps.jobStore.get(job.jobId);
    const attempt = (existing?.attempt ?? 0) + 1;

    await this.deps.jobStore.save({
      jobId: job.jobId,
      scheduleId: job.scheduleId,
      pageDefinitionId: job.pageDefinitionId,
      universeDate: job.universeDate,
      priority: job.priority,
      status: 'DISPATCHED',
      attempt,
      universeTime
    });

    const page = this.deps.pageCatalog.get(job.pageDefinitionId);
    if (!page || page.status === 'DISABLED') {
      const record: ScheduledJobRecord = {
        jobId: job.jobId,
        scheduleId: job.scheduleId,
        pageDefinitionId: job.pageDefinitionId,
        universeDate: job.universeDate,
        priority: job.priority,
        status: 'SKIPPED',
        attempt,
        universeTime,
        reason: 'Page definition is missing or disabled.'
      };
      await this.deps.jobStore.save(record);
      return Object.freeze({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'SKIPPED', attempt, reason: record.reason });
    }

    try {
      const instruction = input.userInstruction?.trim() || `Generate the ${page.pageKey} production projection for Universe date ${job.universeDate}.`;
      const bridgeResult: DailyProductionBridgeResult = await this.deps.bridge.run({
        universe: this.deps.authority.require().universe,
        universeScope: this.deps.authority.require().universeScope,
        userInstruction: instruction,
        mode: 'PAGE_ONLY',
        pageDefinitions: [page],
        pageDefinitionIds: [page.pageDefinitionId],
        maxOutputTokens: input.maxOutputTokens,
        temperature: input.temperature,
        routing: input.routing,
        bypassCache: input.bypassCache
      });

      const firstProduction = bridgeResult.pageProduction?.results.find(item => item.output)?.output;
      const productionRunId = firstProduction?.runId;
      const status: ScheduledDispatchResult['status'] = bridgeResult.status === 'BLOCKED'
        ? 'BLOCKED'
        : bridgeResult.status === 'FAILED' || bridgeResult.status === 'PARTIAL'
          ? 'FAILED'
          : 'COMPLETED';

      const record: ScheduledJobRecord = {
        jobId: job.jobId,
        scheduleId: job.scheduleId,
        pageDefinitionId: job.pageDefinitionId,
        universeDate: job.universeDate,
        priority: job.priority,
        status,
        attempt,
        universeTime,
        ...(productionRunId ? { productionRunId } : {}),
        ...(bridgeResult.reason ? { reason: bridgeResult.reason } : {})
      };
      await this.deps.jobStore.save(record);

      return Object.freeze({
        jobId: job.jobId,
        pageDefinitionId: job.pageDefinitionId,
        status,
        attempt,
        ...(productionRunId ? { productionRunId } : {}),
        ...(bridgeResult.reason ? { reason: bridgeResult.reason } : {})
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await this.deps.jobStore.save({
        jobId: job.jobId,
        scheduleId: job.scheduleId,
        pageDefinitionId: job.pageDefinitionId,
        universeDate: job.universeDate,
        priority: job.priority,
        status: 'FAILED',
        attempt,
        universeTime,
        reason
      });
      return Object.freeze({ jobId: job.jobId, pageDefinitionId: job.pageDefinitionId, status: 'FAILED', attempt, reason });
    }
  }
}
