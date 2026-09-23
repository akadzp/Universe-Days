/**
 * Phase 4: Generic Condition Reference.
 * Tracks references to conditions without implementing domain-specific condition storage.
 */

import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { TimePoint, TimeInterval } from '../../RUNTIME/TEMPORAL';

export interface ConditionReference {
  conditionId: string;
  entityRef: string;
  domain: string;
  temporalValidity?: TimePoint | TimeInterval | string;
  source?: string;
  status?: string;
  version?: number | string;
  metadata?: Record<string, unknown>;
}

export class ConditionReferenceValidator {
  /**
   * Validates a ConditionReference structure.
   */
  public static validate(ref: unknown): Result<ConditionReference> {
    if (!ref || typeof ref !== 'object') {
      return failure(EngineErrorCode.INVALID_STATE, 'Condition reference must be an object');
    }

    const candidate = ref as Partial<ConditionReference>;

    if (!candidate.conditionId || typeof candidate.conditionId !== 'string' || candidate.conditionId.trim() === '') {
      return failure(EngineErrorCode.INVALID_STATE, 'Condition reference must have a non-empty conditionId');
    }

    if (!candidate.entityRef || typeof candidate.entityRef !== 'string' || candidate.entityRef.trim() === '') {
      return failure(EngineErrorCode.INVALID_STATE, 'Condition reference must have a non-empty entityRef');
    }

    if (!candidate.domain || typeof candidate.domain !== 'string' || candidate.domain.trim() === '') {
      return failure(EngineErrorCode.INVALID_STATE, 'Condition reference must have a non-empty domain');
    }

    const validated: ConditionReference = {
      conditionId: candidate.conditionId,
      entityRef: candidate.entityRef,
      domain: candidate.domain,
      temporalValidity: candidate.temporalValidity,
      source: candidate.source,
      status: candidate.status,
      version: candidate.version ?? 1,
      metadata: candidate.metadata ? { ...candidate.metadata } : undefined
    };

    return success(validated);
  }

  /**
   * Checks whether two condition references belong to the same entity and domain.
   */
  public static areCompatible(a?: ConditionReference | null, b?: ConditionReference | null): boolean {
    if (!a || !b) return false;
    return a.entityRef === b.entityRef && a.domain === b.domain;
  }

  /**
   * Checks if two condition references are identical in ID and version.
   */
  public static areIdentical(a?: ConditionReference | null, b?: ConditionReference | null): boolean {
    if (!a || !b) return false;
    return a.conditionId === b.conditionId && (a.version ?? 1) === (b.version ?? 1);
  }
}
