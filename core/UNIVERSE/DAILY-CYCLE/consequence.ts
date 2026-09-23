/**
 * Phase 5: Generic Universe Consequence Model.
 * Domain-neutral consequences explicitly linked to source events.
 */

import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { TraceabilityMetadata } from '../../SHARED/common.ts';
import { makeRequestID, makeSystemID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export enum UniverseConsequenceStatus {
  PENDING = 'PENDING',
  TRIGGERED = 'TRIGGERED',
  DEVELOPING = 'DEVELOPING',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  UNRESOLVED = 'UNRESOLVED',
  UNKNOWN = 'UNKNOWN'
}

export type ConsequenceType = 'DIRECT' | 'DELAYED' | 'CONTINUOUS' | 'CHAINED';

export interface UniverseConsequence {
  consequenceId: string;
  sourceEventRef: string;
  temporalActivation: string;
  status: UniverseConsequenceStatus;
  consequenceType: ConsequenceType;
  dependencies: string[];
  affectedReferences: string[];
  validationState: boolean;
  payload?: unknown;
  traceability: TraceabilityMetadata;
}

export interface CreateConsequenceParams {
  consequenceId: string;
  sourceEventRef: string;
  temporalActivation: TimePoint | string;
  consequenceType?: ConsequenceType;
  dependencies?: string[];
  affectedReferences?: string[];
  initialStatus?: UniverseConsequenceStatus;
  payload?: unknown;
}

export function createUniverseConsequence(params: CreateConsequenceParams): Result<UniverseConsequence> {
  // Reject free-floating consequences
  if (!params.sourceEventRef || params.sourceEventRef.trim().length === 0) {
    return failure('A consequence must have an identifiable source event reference', EngineErrorCode.INVALID_CONDITION);
  }

  if (!params.consequenceId || params.consequenceId.trim().length === 0) {
    return failure('A consequence must have an ID', EngineErrorCode.INVALID_CONDITION);
  }

  const activation = typeof params.temporalActivation === 'string'
    ? params.temporalActivation
    : params.temporalActivation.toCanonical();

  return success({
    consequenceId: params.consequenceId,
    sourceEventRef: params.sourceEventRef,
    temporalActivation: activation,
    status: params.initialStatus ?? UniverseConsequenceStatus.PENDING,
    consequenceType: params.consequenceType ?? 'DIRECT',
    dependencies: params.dependencies ?? [],
    affectedReferences: params.affectedReferences ?? [],
    validationState: true,
    payload: params.payload,
    traceability: {
      requestId: makeRequestID(`REQ_CONSEQ_${params.consequenceId}`),
      sourceSystem: makeSystemID('DAILY_UNIVERSE_CORE'),
      timestamp: 0,
      version: '1.0.0'
    }
  });
}

export class ConsequenceRegistry {
  private consequences: Map<string, UniverseConsequence> = new Map();

  constructor(initialConsequences: UniverseConsequence[] = []) {
    for (const c of initialConsequences) {
      this.register(c);
    }
  }

  public register(consequence: UniverseConsequence): Result<void> {
    if (!consequence.sourceEventRef) {
      return failure('Cannot register free-floating consequence', EngineErrorCode.INVALID_CONDITION);
    }
    this.consequences.set(consequence.consequenceId, { ...consequence });
    return success(undefined);
  }

  public get(id: string): UniverseConsequence | undefined {
    const found = this.consequences.get(id);
    return found ? { ...found } : undefined;
  }

  public getAll(): UniverseConsequence[] {
    return Array.from(this.consequences.values()).map(c => ({ ...c }));
  }

  public getBySourceEvent(sourceEventId: string): UniverseConsequence[] {
    return this.getAll().filter(c => c.sourceEventRef === sourceEventId);
  }

  public trigger(consequenceId: string): Result<UniverseConsequence> {
    const existing = this.consequences.get(consequenceId);
    if (!existing) {
      return failure(`Consequence not found: ${consequenceId}`, EngineErrorCode.INVALID_CONDITION);
    }
    if (existing.status === UniverseConsequenceStatus.CANCELLED || existing.status === UniverseConsequenceStatus.FAILED) {
      return failure(`Cannot trigger cancelled or failed consequence: ${consequenceId}`, EngineErrorCode.INVALID_CONDITION);
    }

    const updated: UniverseConsequence = {
      ...existing,
      status: UniverseConsequenceStatus.TRIGGERED
    };
    this.consequences.set(consequenceId, updated);
    return success(updated);
  }

  public resolve(consequenceId: string): Result<UniverseConsequence> {
    const existing = this.consequences.get(consequenceId);
    if (!existing) {
      return failure(`Consequence not found: ${consequenceId}`, EngineErrorCode.INVALID_CONDITION);
    }

    const updated: UniverseConsequence = {
      ...existing,
      status: UniverseConsequenceStatus.RESOLVED
    };
    this.consequences.set(consequenceId, updated);
    return success(updated);
  }
}
