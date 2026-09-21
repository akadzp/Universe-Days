/**
 * Phase 5: Unresolved Condition Model & Persistence.
 * Unresolved conditions survive period boundaries unless explicitly resolved.
 */

import { TimePoint } from '../../temporal/time-point.ts';
import { TraceabilityMetadata } from '../../types/common.ts';
import { makeRequestID, makeSystemID } from '../../types/identifiers.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';

export enum UnresolvedStatus {
  ACTIVE = 'ACTIVE',
  WAITING = 'WAITING',
  BLOCKED = 'BLOCKED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  UNRESOLVED = 'UNRESOLVED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export type UnresolvedPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UnresolvedCondition {
  unresolvedId: string;
  sourceReference: string;
  temporalReference: string;
  reason: string;
  ownerReference?: string;
  priority: UnresolvedPriority;
  lifecycleStatus: UnresolvedStatus;
  resolutionReference?: string;
  traceability: TraceabilityMetadata;
}

export interface CreateUnresolvedParams {
  unresolvedId: string;
  sourceReference: string;
  temporalReference: string | TimePoint;
  reason: string;
  ownerReference?: string;
  priority?: UnresolvedPriority;
  initialStatus?: UnresolvedStatus;
}

export function createUnresolvedCondition(params: CreateUnresolvedParams): UnresolvedCondition {
  const temporalRef = typeof params.temporalReference === 'string'
    ? params.temporalReference
    : params.temporalReference.toCanonical();

  return {
    unresolvedId: params.unresolvedId,
    sourceReference: params.sourceReference,
    temporalReference: temporalRef,
    reason: params.reason,
    ownerReference: params.ownerReference,
    priority: params.priority ?? 'MEDIUM',
    lifecycleStatus: params.initialStatus ?? UnresolvedStatus.UNRESOLVED,
    traceability: {
      requestId: makeRequestID(`REQ_UNRES_${params.unresolvedId}`),
      sourceSystem: makeSystemID('DAILY_UNIVERSE_CORE'),
      timestamp: 0,
      version: '1.0.0'
    }
  };
}

export class UnresolvedConditionRegistry {
  private conditions: Map<string, UnresolvedCondition> = new Map();

  constructor(initialConditions: UnresolvedCondition[] = []) {
    for (const c of initialConditions) {
      this.register(c);
    }
  }

  public register(condition: UnresolvedCondition): Result<void> {
    if (!condition.unresolvedId) {
      return failure('Unresolved condition must have an ID', EngineErrorCode.UNRESOLVED_CONDITION_ERROR);
    }
    if (!condition.sourceReference) {
      return failure('Unresolved condition must have a source reference', EngineErrorCode.UNRESOLVED_CONDITION_ERROR);
    }
    this.conditions.set(condition.unresolvedId, { ...condition });
    return success(undefined);
  }

  public get(id: string): UnresolvedCondition | undefined {
    const found = this.conditions.get(id);
    return found ? { ...found } : undefined;
  }

  public getAll(): UnresolvedCondition[] {
    return Array.from(this.conditions.values()).map(c => ({ ...c }));
  }

  public getOpenConditions(): UnresolvedCondition[] {
    return this.getAll().filter(
      c => c.lifecycleStatus !== UnresolvedStatus.RESOLVED && c.lifecycleStatus !== UnresolvedStatus.CLOSED
    );
  }

  /**
   * Explicitly resolves an unresolved condition.
   * Auto-resolution across period boundaries is strictly forbidden.
   */
  public resolve(unresolvedId: string, resolutionReference: string): Result<UnresolvedCondition> {
    const existing = this.conditions.get(unresolvedId);
    if (!existing) {
      return failure(`Unresolved condition not found: ${unresolvedId}`, EngineErrorCode.UNRESOLVED_CONDITION_ERROR);
    }
    if (existing.lifecycleStatus === UnresolvedStatus.CLOSED) {
      return failure(`Cannot resolve closed condition: ${unresolvedId}`, EngineErrorCode.UNRESOLVED_CONDITION_ERROR);
    }

    const updated: UnresolvedCondition = {
      ...existing,
      lifecycleStatus: UnresolvedStatus.RESOLVED,
      resolutionReference
    };
    this.conditions.set(unresolvedId, updated);
    return success(updated);
  }

  /**
   * Closes a resolved condition.
   */
  public close(unresolvedId: string): Result<UnresolvedCondition> {
    const existing = this.conditions.get(unresolvedId);
    if (!existing) {
      return failure(`Unresolved condition not found: ${unresolvedId}`, EngineErrorCode.UNRESOLVED_CONDITION_ERROR);
    }
    if (existing.lifecycleStatus !== UnresolvedStatus.RESOLVED) {
      return failure(`Cannot close condition that is not RESOLVED: ${unresolvedId}`, EngineErrorCode.UNRESOLVED_CONDITION_ERROR);
    }

    const updated: UnresolvedCondition = {
      ...existing,
      lifecycleStatus: UnresolvedStatus.CLOSED
    };
    this.conditions.set(unresolvedId, updated);
    return success(updated);
  }
}
