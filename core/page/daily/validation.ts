import { stableSerialize, fnv1a32 } from '../../engine/determinism.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { TemporalStatusManager } from '../../temporal/status.ts';
import { UniversePeriodContext } from '../../universe/daily/initialization.ts';
import { DailyPageProductionInput, DailyPageProductionPackage } from './types.ts';

export interface DailyPageValidationReport {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export class DailyPageValidator {
  public static fingerprint(context: UniversePeriodContext): string {
    return fnv1a32(stableSerialize(context));
  }

  public static validateInput(input: DailyPageProductionInput): DailyPageValidationReport {
    const errors: string[] = [];

    if (!input.universeId.trim()) errors.push('universeId is required.');
    if (!input.universeScope.trim()) errors.push('universeScope is required.');
    if (!input.pageKey.trim()) errors.push('pageKey is required.');
    if (!input.pageScope.trim()) errors.push('pageScope is required.');
    if (!input.universeContext?.period?.periodId) errors.push('Universe period identity is required.');
    if (!input.sourceSelection) errors.push('sourceSelection is required.');
    if (!TemporalStatusManager.isValidStatus(input.temporalStatus)) errors.push('temporalStatus is invalid.');

    if (input.universeContext?.period?.universeScope && input.universeContext.period.universeScope !== input.universeScope) {
      errors.push(`Universe scope mismatch: context has "${input.universeContext.period.universeScope}", input has "${input.universeScope}".`);
    }

    if (input.storyPackage) {
      if (input.storyPackage.trigger?.universeScope && input.storyPackage.trigger.universeScope !== input.universeScope) {
        errors.push(`Scope mismatch between Story package ("${input.storyPackage.trigger.universeScope}") and Page input ("${input.universeScope}").`);
      }
      if (input.storyPackage.handoff?.temporalContext?.periodId && input.universeContext?.period?.periodId) {
        if (input.storyPackage.handoff.temporalContext.periodId !== input.universeContext.period.periodId) {
          errors.push(`Period mismatch between Story package ("${input.storyPackage.handoff.temporalContext.periodId}") and Page context ("${input.universeContext.period.periodId}").`);
        }
      }
    }

    return { valid: errors.length === 0, errors: Object.freeze(errors) };
  }

  public static validatePackage(
    pkg: DailyPageProductionPackage,
    input: DailyPageProductionInput,
    initialFingerprint: string
  ): Result<boolean, { code: EngineErrorCode | string; message: string }> {
    const errors: string[] = [];

    if (!pkg.pageId) errors.push('Page package is missing pageId.');
    if (pkg.universeId !== input.universeId) errors.push('Page universeId mismatch.');
    if (pkg.pageScope !== input.pageScope) errors.push('Page scope mismatch.');
    if (pkg.universeScope !== input.universeScope) errors.push('Universe scope mismatch.');
    if (pkg.validationStatus !== 'PASSED') errors.push('Page package must be PASSED before completion.');
    if (pkg.upstreamFingerprint !== initialFingerprint) errors.push('Upstream fingerprint mismatch.');

    const expectedCount =
      (input.sourceSelection.eventIds?.length ?? 0) +
      (input.sourceSelection.processIds?.length ?? 0) +
      (input.sourceSelection.continuityIds?.length ?? 0) +
      (input.sourceSelection.unresolvedIds?.length ?? 0) +
      (input.sourceSelection.futureInformationRefs?.length ?? 0) +
      (input.sourceSelection.includeStory ? 1 : 0);

    if (pkg.projection.sources.length !== expectedCount) {
      errors.push(`Projection source count mismatch: expected ${expectedCount}, got ${pkg.projection.sources.length}.`);
    }

    if (errors.length > 0) {
      return failure(
        { code: EngineErrorCode.PAGE_VALIDATION_FAILED, message: errors.join('; ') },
        `Daily Page validation failed: ${errors.join('; ')}`
      );
    }

    return success(true);
  }
}
