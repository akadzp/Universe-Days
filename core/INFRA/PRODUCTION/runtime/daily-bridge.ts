/**
 * Daily Production Bridge.
 *
 * Bridges deterministic Daily Universe / Story / Page owners into the
 * provider-neutral ProductionRunner. This class orchestrates owners; it does
 * not become authoritative for Universe, Story, Page, Temporal, or Domain truth.
 */

import { deterministicKey, hash32, stableSerialize } from '../../../SHARED/platform.ts';
import { UniverseModelValidator } from '../../../VALIDATION/universe-model.ts';
import type { UniverseModel } from '../../../UNIVERSE/CANON/universe.ts';
import { TimePoint } from '../../../RUNTIME/TEMPORAL/time-point.ts';
import {
  PeriodInitializer,
  type UniversePeriodContext
} from '../../../UNIVERSE/DAILY-CYCLE/initialization.ts';
import { PeriodValidator } from '../../../UNIVERSE/DAILY-CYCLE/validation.ts';
import { TemporalStatus } from '../../../RUNTIME/TEMPORAL/types.ts';
import type { ProgressionStepInput } from '../../../UNIVERSE/DAILY-CYCLE/progression.ts';
import {
  DailyStoryOrchestrator,
  type ProduceStoryOptions,
  type StoryProductionPackage
} from '../../../DAILY-STORY/orchestrator.ts';
import {
  createStoryTrigger,
  StoryTriggerType,
  type StoryTrigger
} from '../../../DAILY-STORY/trigger.ts';
import { DailyPagePipeline } from '../../../DAILY-PAGE/pipeline.ts';
import type {
  DailyPageProductionPackage,
  PageSourceSelection
} from '../../../DAILY-PAGE/types.ts';
import type { PageDefinition } from '../../SCALING/types.ts';
import {
  BoundedPageBatchExecutor,
  buildPageJobs
} from '../../PARALLEL/executor.ts';
import type { PageBatchResult } from '../../PARALLEL/types.ts';
import type { ProductionRunner } from './runner.ts';
import type { ProductionRunResult } from './types.ts';
import type { ModelRoutingPolicy } from '../../MODEL/types.ts';

export type DailyBridgeMode = 'FULL_DAILY' | 'STORY_ONLY' | 'PAGE_ONLY';

export interface DailyProductionBridgeInput {
  readonly universe: UniverseModel;
  readonly universeScope: string;
  readonly userInstruction?: string;
  readonly mode?: DailyBridgeMode;
  readonly dailyContext?: UniversePeriodContext;
  readonly storyTrigger?: StoryTrigger;
  readonly storyOptions?: Omit<ProduceStoryOptions, 'instanceRef'>;
  readonly progressionSteps?: readonly ProgressionStepInput[];
  readonly previousPeriodRef?: string;
  readonly sequenceNumber?: number;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly routing?: ModelRoutingPolicy;
  readonly bypassCache?: boolean;
  readonly pageDefinitionIds?: readonly string[];
  readonly pageDefinitions?: readonly PageDefinition[];
  readonly pageInstructionPrefix?: string;
}

export interface DailyProductionBridgeResult {
  readonly status: 'COMPLETED' | 'PARTIAL' | 'BLOCKED' | 'FAILED';
  readonly runId: string;
  readonly universeId: string;
  readonly universeScope: string;
  readonly universeDate: string;
  readonly periodId: string;
  readonly initializationMode: 'OWNER_CONTEXT' | 'FIRST_PERIOD' | 'NORMAL_CONTINUATION';
  readonly dailyContext?: UniversePeriodContext;
  readonly storyPackage?: StoryProductionPackage;
  readonly storyProduction?: ProductionRunResult;
  readonly pagePackages: readonly DailyPageProductionPackage[];
  readonly pageProduction?: PageBatchResult<ProductionRunResult>;
  readonly reason?: string;
}

export interface DailyProductionBridgeDependencies {
  readonly productionRunner: ProductionRunner;
  readonly pageBatchExecutor: BoundedPageBatchExecutor<DailyPageJobInput, ProductionRunResult>;
  readonly listPageDefinitions: () => readonly PageDefinition[];
}

interface DailyPageJobInput {
  readonly page: PageDefinition;
  readonly context: UniversePeriodContext;
  readonly storyPackage?: StoryProductionPackage;
  readonly universe: UniverseModel;
  readonly universeScope: string;
  readonly userInstruction: string;
  readonly options: Pick<DailyProductionBridgeInput, 'maxOutputTokens' | 'temperature' | 'routing' | 'bypassCache' | 'pageInstructionPrefix'>;
}

export class DailyProductionBridge {
  public constructor(private readonly dependencies: DailyProductionBridgeDependencies) {}

  public async run(input: DailyProductionBridgeInput): Promise<DailyProductionBridgeResult> {
    const mode = input.mode ?? 'FULL_DAILY';
    const userInstruction = input.userInstruction?.trim() || 'Generate today\'s production from the current authoritative Universe.';

    const validation = UniverseModelValidator.validate(input.universe);
    if (!validation.isValid) {
      return this.blocked(
        input,
        'UniverseModel validation failed: ' +
          validation.issues.filter(issue => issue.severity === 'ERROR').map(issue => issue.message).join('; ')
      );
    }

    if (!input.universeScope?.trim()) {
      return this.blocked(input, 'Daily production requires an explicit universe scope.');
    }

    const dailyContextResult:
      | { readonly context: UniversePeriodContext; readonly initializationMode: 'OWNER_CONTEXT' | 'FIRST_PERIOD' | 'NORMAL_CONTINUATION'; readonly reason?: undefined }
      | { readonly context: null; readonly initializationMode?: undefined; readonly reason: string } = input.dailyContext
      ? { context: input.dailyContext, initializationMode: 'OWNER_CONTEXT' as const }
      : this.initializeDailyContext(input);

    if (!dailyContextResult.context) {
      return this.blocked(input, dailyContextResult.reason ?? 'Daily Universe context could not be initialized.');
    }

    const dailyContext = dailyContextResult.context;
    const periodId = dailyContext.period.periodId;
    const baseRunId = deterministicKey(
      'DAILYRUN',
      input.universe.universeId,
      input.universeScope,
      periodId,
      mode,
      userInstruction,
      hash32(stableSerialize(dailyContext.period))
    );

    const periodValidation = PeriodValidator.validateInitialization(dailyContext.period, dailyContext);
    if (!periodValidation.valid) {
      return Object.freeze({
        status: 'BLOCKED',
        runId: baseRunId,
        universeId: input.universe.universeId,
        universeScope: input.universeScope,
        universeDate: input.universe.temporalContext.currentUniverseDate,
        periodId,
        initializationMode: dailyContextResult.initializationMode,
        dailyContext,
        pagePackages: Object.freeze([]),
        reason: `Daily Universe validation failed: ${periodValidation.errors.join('; ')}`
      });
    }

    let storyPackage: StoryProductionPackage | undefined;
    let storyProduction: ProductionRunResult | undefined;

    if (mode !== 'PAGE_ONLY') {
      const storyTrigger = input.storyTrigger ?? this.createDefaultStoryTrigger(input, dailyContext, userInstruction);
      const storyResult = DailyStoryOrchestrator.produceStory(dailyContext, storyTrigger, {
        ...(input.storyOptions ?? {}),
        instanceRef: baseRunId
      });

      if (!storyResult.success || !storyResult.data) {
        return Object.freeze({
          status: 'BLOCKED',
          runId: baseRunId,
          universeId: input.universe.universeId,
          universeScope: input.universeScope,
          universeDate: input.universe.temporalContext.currentUniverseDate,
          periodId,
          initializationMode: dailyContextResult.initializationMode,
          dailyContext,
          pagePackages: Object.freeze([]),
          reason: storyResult.message ?? 'Daily Story package could not be produced.'
        });
      }

      storyPackage = storyResult.data;

      storyProduction = await this.dependencies.productionRunner.run({
        universe: input.universe,
        universeId: input.universe.universeId,
        universeScope: input.universeScope,
        purpose: 'DAILY_STORY',
        userInstruction,
        dailyContext,
        storyPackage,
        maxOutputTokens: input.maxOutputTokens,
        temperature: input.temperature,
        routing: input.routing,
        bypassCache: input.bypassCache
      });

      if (storyProduction.status === 'FAILED' || storyProduction.status === 'BLOCKED') {
        return Object.freeze({
          status: storyProduction.status === 'BLOCKED' ? 'BLOCKED' : 'FAILED',
          runId: baseRunId,
          universeId: input.universe.universeId,
          universeScope: input.universeScope,
          universeDate: input.universe.temporalContext.currentUniverseDate,
          periodId,
          initializationMode: dailyContextResult.initializationMode,
          dailyContext,
          storyPackage,
          storyProduction,
          pagePackages: Object.freeze([]),
          reason: storyProduction.reason
        });
      }
    }

    const pageDefinitions = this.selectPages(input, mode);
    const pagePackages: DailyPageProductionPackage[] = [];
    const pageJobsInput = pageDefinitions.map(page => ({
      page,
      context: dailyContext,
      storyPackage,
      universe: input.universe,
      universeScope: input.universeScope,
      userInstruction,
      options: {
        maxOutputTokens: input.maxOutputTokens,
        temperature: input.temperature,
        routing: input.routing,
        bypassCache: input.bypassCache,
        pageInstructionPrefix: input.pageInstructionPrefix
      }
    } satisfies DailyPageJobInput));

    const jobs = buildPageJobs(
      pageJobsInput.map(item => ({
        pageDefinitionId: item.page.pageDefinitionId,
        priority: item.page.priority,
        concurrencyClass: item.page.concurrencyClass
      })),
      pageDefinitionId => pageJobsInput.find(item => item.page.pageDefinitionId === pageDefinitionId)!,
      baseRunId
    );

    const pageProduction = await this.dependencies.pageBatchExecutor.run(
      jobs,
      {
        execute: async job => {
          const item = job.input;
          const pipeline = new DailyPagePipeline();
          const packageResult = pipeline.run({
            universeId: item.universe.universeId,
            universeScope: item.universeScope,
            pageKey: item.page.pageKey,
            pageScope: item.page.pageScope,
            universeContext: item.context,
            temporalStatus: TemporalStatus.ACTUAL,
            sourceSelection: this.createPageSourceSelection(item.context, item.storyPackage, item.page),
            ...(item.storyPackage ? { storyPackage: item.storyPackage } : {}),
            dryRun: true
          });

          if (!packageResult.success || !packageResult.data) {
            throw new Error(packageResult.message ?? 'Daily Page package could not be produced.');
          }

          pagePackages.push(packageResult.data.package);

          const pageInstruction = [
            item.options.pageInstructionPrefix?.trim(),
            `Generate the ${item.page.pageKey} Daily Page projection.`,
            `Page scope: ${item.page.pageScope}.`,
            item.userInstruction
          ].filter(Boolean).join(' ');

          const runResult = await this.dependencies.productionRunner.run({
            universe: item.universe,
            universeId: item.universe.universeId,
            universeScope: item.universeScope,
            purpose: 'DAILY_PAGE',
            userInstruction: pageInstruction,
            dailyContext: item.context,
            ...(item.storyPackage ? { storyPackage: item.storyPackage } : {}),
            pagePackage: packageResult.data.package,
            maxOutputTokens: item.options.maxOutputTokens,
            temperature: item.options.temperature,
            routing: item.options.routing,
            bypassCache: item.options.bypassCache
          });

          if (runResult.status === 'FAILED' || runResult.status === 'BLOCKED') {
            throw new Error(runResult.reason ?? `Page production failed with status ${runResult.status}`);
          }

          return runResult;
        }
      },
      { stopOnFatalError: false }
    );

    const orderedPagePackages = Object.freeze(
      [...pagePackages].sort((a, b) => String(a.pageId).localeCompare(String(b.pageId)))
    );

    const failedPages = pageProduction.failed + pageProduction.blocked;
    const storyFailed = storyProduction ? (storyProduction.status === 'FAILED' || storyProduction.status === 'BLOCKED') : false;
    let status: DailyProductionBridgeResult['status'] = 'COMPLETED';
    if (storyFailed && (jobs.length === 0 || failedPages === jobs.length)) {
      status = 'FAILED';
    } else if (storyFailed || failedPages > 0) {
      status = 'PARTIAL';
    }

    return Object.freeze({
      status,
      runId: baseRunId,
      universeId: input.universe.universeId,
      universeScope: input.universeScope,
      universeDate: input.universe.temporalContext.currentUniverseDate,
      periodId,
      initializationMode: dailyContextResult.initializationMode,
      dailyContext,
      ...(storyPackage ? { storyPackage } : {}),
      ...(storyProduction ? { storyProduction } : {}),
      pagePackages: orderedPagePackages,
      pageProduction
    });
  }

  private initializeDailyContext(input: DailyProductionBridgeInput):
    | { readonly context: UniversePeriodContext; readonly initializationMode: 'FIRST_PERIOD' | 'NORMAL_CONTINUATION' }
    | { readonly context: null; readonly reason: string } {
    const canonical = input.universe.temporalContext.currentUniverseTime || input.universe.temporalContext.currentUniverseDate;
    const startTime = TimePoint.parse(canonical);
    if (!startTime.success || !startTime.data) {
      return { context: null, reason: startTime.message ?? 'Universe temporal context could not be parsed as a TimePoint.' };
    }

    const init = PeriodInitializer.initialize({
      universe: input.universe,
      startTime: startTime.data,
      universeScope: input.universeScope,
      previousPeriodRef: input.previousPeriodRef,
      sequenceNumber: input.sequenceNumber,
      previousContinuityItems: [],
      previousUnresolvedConditions: [],
      previousProcesses: [],
      previousFutureInfo: []
    });

    if (!init.success || !init.data) {
      return { context: null, reason: init.message ?? 'Daily Universe period initialization failed.' };
    }

    for (const step of input.progressionSteps ?? []) {
      if (!step) continue;
      // Progression is intentionally not performed here. A supplied owner
      // context is the authority for progression state; this bridge never
      // silently mutates Canon or invents daily state.
      return {
        context: null,
        reason: 'progressionSteps require an owner-produced UniversePeriodContext; the bridge will not invent progression state.'
      };
    }

    return { context: init.data, initializationMode: init.data.initializationMode };
  }

  private createDefaultStoryTrigger(
    input: DailyProductionBridgeInput,
    context: UniversePeriodContext,
    userInstruction: string
  ): StoryTrigger {
    return createStoryTrigger({
      triggerId: deterministicKey(
        'TRIGGER',
        input.universe.universeId,
        context.period.periodId,
        'EXPLICIT_REQUEST',
        userInstruction
      ),
      type: StoryTriggerType.EXPLICIT_REQUEST,
      sourceReference: context.period.periodId,
      universeScope: input.universeScope,
      temporalAnchor: context.period.startTime.toCanonical(),
      description: `Explicit production request: ${userInstruction}`,
      status: 'ACTIVE'
    });
  }

  private selectPages(input: DailyProductionBridgeInput, mode: DailyBridgeMode): readonly PageDefinition[] {
    const all = (input.pageDefinitions ?? this.dependencies.listPageDefinitions())
      .filter(page => page.status === 'ENABLED')
      .filter(page => page.universeId === input.universe.universeId)
      .filter(page => page.universeScope === input.universeScope);

    const selected = input.pageDefinitionIds?.length
      ? all.filter(page => input.pageDefinitionIds!.includes(page.pageDefinitionId))
      : all;

    if (mode === 'STORY_ONLY') return Object.freeze([]);
    return Object.freeze([...selected].sort((a, b) => b.priority - a.priority || a.pageDefinitionId.localeCompare(b.pageDefinitionId)));
  }

  private createPageSourceSelection(
    context: UniversePeriodContext,
    storyPackage: StoryProductionPackage | undefined,
    page: PageDefinition
  ): PageSourceSelection {
    const narrative = page.pageScope.toUpperCase() === 'NARRATIVE' || page.tags.some(tag => tag.toLowerCase() === 'story');
    return Object.freeze({
      eventIds: Object.freeze(context.events.map(item => item.eventId)),
      processIds: Object.freeze(context.processes.map(item => item.processId)),
      continuityIds: Object.freeze(context.continuityItems.map(item => item.identity.continuityId)),
      unresolvedIds: Object.freeze(context.unresolvedConditions.map(item => item.unresolvedId)),
      futureInformationRefs: Object.freeze(context.futureInfo.map(item => item.futureId)),
      includeStory: Boolean(narrative && storyPackage)
    });
  }

  private blocked(input: DailyProductionBridgeInput, reason: string): DailyProductionBridgeResult {
    const runId = deterministicKey(
      'DAILYRUN',
      input.universe?.universeId ?? 'UNRESOLVED',
      input.universeScope ?? 'UNRESOLVED',
      input.mode ?? 'FULL_DAILY',
      input.userInstruction ?? ''
    );
    const emptyContext = input.dailyContext;
    return Object.freeze({
      status: 'BLOCKED',
      runId,
      universeId: input.universe?.universeId ?? 'UNRESOLVED',
      universeScope: input.universeScope ?? 'UNRESOLVED',
      universeDate: input.universe?.temporalContext?.currentUniverseDate ?? 'UNRESOLVED',
      periodId: emptyContext?.period.periodId ?? 'UNRESOLVED',
      initializationMode: emptyContext ? 'OWNER_CONTEXT' : 'FIRST_PERIOD',
      ...(emptyContext ? { dailyContext: emptyContext } : {}),
      pagePackages: Object.freeze([]),
      reason
    });
  }
}
