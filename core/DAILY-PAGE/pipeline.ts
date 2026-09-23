import { Result, success, failure, blocked } from '../SHARED/result.ts';
import { EngineErrorCode } from '../SHARED/errors.ts';
import { TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';
import { deriveDailyPageId } from './identity.ts';
import { DailyPageTemporalResolver } from './temporal.ts';
import { DailyPageProjector } from './projection.ts';
import { DailyPageValidator } from './validation.ts';
import {
  DailyPageProductionInput,
  DailyPageProductionPackage,
  DailyPageRun,
  PageTemporalFrame
} from './types.ts';
import { DailyPageRepository, InMemoryDailyPageRepository } from './repository.ts';

export interface DailyPagePipelineOptions {
  readonly repository?: DailyPageRepository;
}

export class DailyPagePipeline {
  private readonly repository: DailyPageRepository;

  constructor(options?: DailyPagePipelineOptions) {
    this.repository = options?.repository ?? new InMemoryDailyPageRepository();
  }

  public get pageRepository(): DailyPageRepository {
    return this.repository;
  }

  public run(input: DailyPageProductionInput): Result<DailyPageRun> {
    const inputValidation = DailyPageValidator.validateInput(input);
    if (!inputValidation.valid) {
      return failure(
        { code: EngineErrorCode.INVALID_PAGE_INPUT, message: inputValidation.errors.join('; ') },
        'Daily Page input validation failed.'
      );
    }

    const initialFingerprint = DailyPageValidator.fingerprint(input.universeContext);

    const temporalRes = DailyPageTemporalResolver.resolve(
      input.universeContext,
      input.temporalAnchor,
      input.temporalStatus
    );
    if (!temporalRes.success || !temporalRes.data) {
      return failure(
        temporalRes.error ?? { code: EngineErrorCode.INVALID_TIME_POINT, message: 'Could not resolve Daily Page temporal frame.' },
        temporalRes.message ?? 'Could not resolve Daily Page temporal frame.'
      );
    }

    const temporalFrame: PageTemporalFrame = temporalRes.data;
    const pageDate = temporalFrame.universeTime.slice(0, 10);

    const pageId = deriveDailyPageId(
      input.universeId,
      input.universeScope,
      input.pageKey,
      pageDate,
      temporalFrame.anchorTime,
      input.temporalStatus
    );

    const existing = this.repository.get(String(pageId));
    if (!existing.success) {
      return failure(
        existing.error ?? 'PAGE_REPOSITORY_READ_FAILED',
        existing.message ?? 'Failed to inspect existing Daily Page package.'
      );
    }

    if (existing.data) {
      return failure(
        { code: EngineErrorCode.IDEMPOTENCY_CONFLICT, message: `Daily Page package "${String(pageId)}" already exists.` },
        `Daily Page package "${String(pageId)}" already exists.`
      );
    }

    const projectionRes = DailyPageProjector.project(
      input.universeContext,
      input.sourceSelection,
      input.storyPackage
    );
    if (!projectionRes.success || !projectionRes.data) {
      return blocked(
        projectionRes.error ?? { code: EngineErrorCode.PAGE_PROJECTION_BLOCKED, message: 'Daily Page projection failed.' },
        projectionRes.message ?? 'Daily Page projection failed.'
      );
    }

    // Page projection is reference-only. Verify the authoritative context was
    // not mutated by projection before anything can be persisted.
    const afterProjectionFingerprint = DailyPageValidator.fingerprint(input.universeContext);
    if (afterProjectionFingerprint !== initialFingerprint) {
      return blocked(
        { code: EngineErrorCode.CANON_MUTATION_PROHIBITED, message: 'Daily Page projection mutated authoritative Universe context.' },
        'Daily Page projection mutated authoritative Universe context.'
      );
    }

    const pkg: DailyPageProductionPackage = Object.freeze({
      pageId,
      universeId: input.universeId,
      universeScope: input.universeScope,
      pageKey: input.pageKey,
      pageScope: input.pageScope,
      pageDate,
      pageDateTime: temporalFrame.universeTime,
      temporalFrame,
      projection: projectionRes.data,
      restrictions: Object.freeze([
        'UNIVERSE_TIME_AUTHORITY',
        'NO_CANON_MUTATION',
        'NO_PAGE_TRUTH_OVER_UNIVERSE_TRUTH',
        ...(input.restrictions ?? [])
      ]),
      validationStatus: 'PASSED',
      version: input.version ?? 1,
      upstreamFingerprint: initialFingerprint
    });

    const validationRes = DailyPageValidator.validatePackage(
      pkg,
      input,
      initialFingerprint
    );
    if (!validationRes.success) {
      return blocked(
        validationRes.error ?? { code: EngineErrorCode.PAGE_VALIDATION_FAILED, message: 'Daily Page package validation failed.' },
        validationRes.message ?? 'Daily Page package validation failed.'
      );
    }

    const run: DailyPageRun = Object.freeze({
      pageId,
      status: 'COMPLETED',
      package: pkg,
      persisted: false
    });

    if (!input.dryRun) {
      const saveRes = this.repository.save(pkg);
      if (!saveRes.success) {
        return failure(
          saveRes.error ?? 'PAGE_PERSISTENCE_FAILED',
          saveRes.message ?? 'Daily Page package persistence failed.'
        );
      }

      return success({ ...run, persisted: true });
    }

    return success(run);
  }
}
