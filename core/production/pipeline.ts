/**
 * Phase 10: End-to-End Daily Production Pipeline.
 *
 * Flow:
 * INPUT
 * -> INITIALIZATION
 * -> PROGRESSION
 * -> STORY
 * -> RENDER
 * -> FINALIZATION
 * -> PERSISTENCE
 *
 * The pipeline orchestrates existing owners. It does not become the owner of
 * temporal truth, continuity, story truth, domains, or narrative content.
 */

import { Result, success, failure, blocked } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import {
  PeriodInitializer,
  UniversePeriodContext
} from '../universe/daily/initialization.ts';
import { ProgressionEngine } from '../universe/daily/progression.ts';
import { PeriodValidator } from '../universe/daily/validation.ts';
import { PeriodFinalizer, FinalizationResult } from '../universe/daily/finalization.ts';
import { DailyStoryOrchestrator, StoryProductionPackage } from '../story/daily/orchestrator.ts';
import { DailyProductionInput, DailyProductionRun, ProductionStage, ProductionTrace, deriveProductionRunId } from './types.ts';
import { ProductionRunRepository, InMemoryProductionRunRepository } from './repository.ts';

export interface DailyProductionPipelineOptions {
  readonly repository?: ProductionRunRepository;
}

export class DailyProductionPipeline {
  private readonly repository: ProductionRunRepository;

  constructor(options?: DailyProductionPipelineOptions) {
    this.repository =
      options?.repository ?? new InMemoryProductionRunRepository();
  }

  public get runRepository(): ProductionRunRepository {
    return this.repository;
  }

  public async run<TOutput = unknown>(
    input: DailyProductionInput
  ): Promise<Result<DailyProductionRun<TOutput>>> {
    const traces: ProductionTrace[] = [];

    const mark = (
      stage: ProductionStage,
      status: ProductionTrace['status'],
      detail?: string
    ) => {
      traces.push({ stage, status, detail });
    };

    if (!input.universeId || !input.universeScope) {
      mark('INPUT', 'FAILED', 'universeId and universeScope are required.');
      return failure(
        EngineErrorCode.INVALID_COMMAND,
        'Daily production input is missing universe identity.'
      );
    }

    if (!input.startTime) {
      mark('INPUT', 'FAILED', 'startTime is required.');
      return failure(
        EngineErrorCode.INVALID_TIME_POINT,
        'Daily production input requires a Universe startTime.'
      );
    }

    mark('INPUT', 'PASSED');

    // ------------------------------------------------------------
    // INITIALIZATION
    // ------------------------------------------------------------
    mark('INITIALIZATION', 'STARTED');

    const initRes = PeriodInitializer.initialize({
      startTime: input.startTime,
      endTime: input.endTime,
      previousPeriodRef: input.previousPeriodRef,
      sequenceNumber: input.sequenceNumber,
      universeScope: input.universeScope,
      previousContinuityItems: [...(input.previousContinuityItems ?? [])],
      previousUnresolvedConditions: [...(input.previousUnresolvedConditions ?? [])],
      previousProcesses: [...(input.previousProcesses ?? [])],
      previousFutureInfo: [...(input.previousFutureInfo ?? [])]
    });

    if (!initRes.success || !initRes.data) {
      mark(
        'INITIALIZATION',
        'FAILED',
        initRes.message ?? 'Period initialization failed.'
      );
      return failure(
        initRes.error ?? EngineErrorCode.PERIOD_INITIALIZATION_FAILED,
        initRes.message ?? 'Period initialization failed.'
      );
    }

    const periodContext = initRes.data;

    if (input.initialEvents?.length) {
      periodContext.events.push(...input.initialEvents);
    }

    const initValidation = PeriodValidator.validateInitialization(
      periodContext.period,
      periodContext
    );

    if (!initValidation.valid) {
      mark(
        'INITIALIZATION',
        'BLOCKED',
        initValidation.errors.join('; ')
      );
      return blocked(
        EngineErrorCode.PERIOD_BLOCKED,
        `Period initialization validation failed: ${initValidation.errors.join('; ')}`
      );
    }

    mark('INITIALIZATION', 'PASSED', periodContext.period.periodId);

    // ------------------------------------------------------------
    // PROGRESSION
    // ------------------------------------------------------------
    mark('PROGRESSION', 'STARTED');

    for (const [index, step] of (input.progressionSteps ?? []).entries()) {
      const progressionRes = ProgressionEngine.step(periodContext, step);

      if (!progressionRes.success || !progressionRes.data) {
        const detail =
          progressionRes.message ??
          `Progression step ${index + 1} failed.`;

        mark('PROGRESSION', 'FAILED', detail);
        return failure(
          progressionRes.error ?? EngineErrorCode.ATOMIC_TRANSITION_FAILED,
          detail
        );
      }

      const progressionValidation = PeriodValidator.validateProgression(
        periodContext.period,
        progressionRes.data
      );

      if (!progressionValidation.valid) {
        const detail = progressionValidation.errors.join('; ');
        mark('PROGRESSION', 'BLOCKED', detail);
        return blocked(
          EngineErrorCode.PERIOD_BLOCKED,
          `Progression validation failed: ${detail}`
        );
      }
    }

    mark(
      'PROGRESSION',
      'PASSED',
      `${input.progressionSteps?.length ?? 0} progression step(s)`
    );

    // ------------------------------------------------------------
    // STORY
    // ------------------------------------------------------------
    mark('STORY', 'STARTED');

    const runIdCandidate = deriveProductionRunId(
      input.universeId,
      periodContext.period.periodId,
      input.storyTrigger.triggerId
    );

    const storyRes = DailyStoryOrchestrator.produceStory(
      periodContext,
      input.storyTrigger,
      {
        ...(input.storyOptions ?? {}),
        instanceRef: runIdCandidate
      }
    );

    if (!storyRes.success || !storyRes.data) {
      const detail =
        storyRes.message ?? 'Daily Story production package could not be built.';

      mark('STORY', 'FAILED', detail);
      return failure(
        storyRes.error ?? EngineErrorCode.STORY_PRODUCTION_ERROR,
        detail
      );
    }

    const storyPackage = storyRes.data;
    mark('STORY', 'PASSED', storyPackage.storyId);

    // ------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------
    mark('RENDER', 'STARTED');

    const renderRes = await input.renderer.render(storyPackage);

    if (!renderRes.success || !renderRes.data) {
      const detail =
        renderRes.message ?? 'Story renderer rejected the production package.';

      mark('RENDER', 'FAILED', detail);
      return failure(
        renderRes.error ?? EngineErrorCode.STORY_PRODUCTION_ERROR,
        detail
      );
    }

    mark(
      'RENDER',
      'PASSED',
      `renderer=${renderRes.data.rendererId}`
    );

    // ------------------------------------------------------------
    // FINALIZATION
    // ------------------------------------------------------------
    mark('FINALIZATION', 'STARTED');

    const finalizationRes = PeriodFinalizer.finalize(periodContext);

    if (!finalizationRes.success || !finalizationRes.data) {
      const detail =
        finalizationRes.message ?? 'Daily Universe finalization failed.';

      mark('FINALIZATION', 'BLOCKED', detail);
      return blocked(
        EngineErrorCode.PERIOD_FINALIZATION_FAILED,
        detail
      );
    }

    const finalization = finalizationRes.data;

    const finalValidation = PeriodValidator.validateFinalization(
      periodContext.period,
      finalization
    );

    if (!finalValidation.valid) {
      const detail = finalValidation.errors.join('; ');
      mark('FINALIZATION', 'BLOCKED', detail);
      return blocked(
        EngineErrorCode.PERIOD_FINALIZATION_FAILED,
        `Finalization validation failed: ${detail}`
      );
    }

    const nextContextValidation =
      PeriodValidator.validateNextPeriodContext(
        finalization.nextPeriodContext
      );

    if (!nextContextValidation.valid) {
      const detail = nextContextValidation.errors.join('; ');
      mark('FINALIZATION', 'BLOCKED', detail);
      return blocked(
        EngineErrorCode.PERIOD_FINALIZATION_FAILED,
        `NextPeriodContext validation failed: ${detail}`
      );
    }

    mark(
      'FINALIZATION',
      'PASSED',
      periodContext.period.periodId
    );

    // ------------------------------------------------------------
    // PERSISTENCE
    // ------------------------------------------------------------
    const run: DailyProductionRun<TOutput> = Object.freeze({
      runId: runIdCandidate,
      status: 'COMPLETED',
      universeId: input.universeId,
      universeScope: input.universeScope,
      periodId: periodContext.period.periodId,
      periodContext,
      storyPackage,
      renderResult: renderRes.data as DailyProductionRun<TOutput>['renderResult'],
      finalization,
      traces: Object.freeze([...traces]),
      errors: Object.freeze([]),
      createdDeterministicallyFrom: Object.freeze({
        universeId: input.universeId,
        periodId: periodContext.period.periodId,
        triggerId: input.storyTrigger.triggerId,
        storyId: storyPackage.storyId
      })
    });

    if (!input.dryRun) {
      const saveRes = this.repository.save(run);
      if (!saveRes.success) {
        mark(
          'PERSISTENCE',
          'FAILED',
          saveRes.message ?? 'Production run could not be persisted.'
        );
        return failure(
          'PRODUCTION_PERSISTENCE_FAILED',
          saveRes.message ?? 'Production run persistence failed.'
        );
      }

      mark('PERSISTENCE', 'PASSED', run.runId);
    } else {
      mark('PERSISTENCE', 'PASSED', 'DRY_RUN');
    }

    return success({
      ...run,
      traces: Object.freeze([...traces])
    });
  }
}
