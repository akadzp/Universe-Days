/**
 * Phase 4: Continuity History.
 * Append-only history preserving prior conditions, transitions, effective times, versions, and traces.
 */

import { ConditionReference } from './condition-reference.ts';
import { ContinuityIdentity, EffectiveTime, RevisionMetadata } from './continuity-model.ts';
import { Transition } from './transition.ts';
import { ContinuityValidationResult } from './result.ts';

export interface ContinuityHistoryRecord {
  recordId: string;
  continuityId: string;
  identity: ContinuityIdentity;
  previousConditionRef?: ConditionReference | null;
  currentConditionRef?: ConditionReference | null;
  transition: Transition;
  effectiveTime: EffectiveTime;
  version: number | string;
  validationResult?: ContinuityValidationResult;
  sourceReference?: string;
  revision?: RevisionMetadata;
  recordedAtEngineTime: number;
}

export class ContinuityHistory {
  private recordsByContinuityId: Map<string, ContinuityHistoryRecord[]> = new Map();
  private recordSequence = 0;

  /**
   * Appends an immutable history record.
   * Does NOT rewrite or overwrite existing historical entries.
   */
  public append(entry: {
    continuityId: string;
    identity: ContinuityIdentity;
    previousConditionRef?: ConditionReference | null;
    currentConditionRef?: ConditionReference | null;
    transition: Transition;
    effectiveTime: EffectiveTime;
    version: number | string;
    validationResult?: ContinuityValidationResult;
    sourceReference?: string;
    revision?: RevisionMetadata;
  }): ContinuityHistoryRecord {
    this.recordSequence++;
    const record: ContinuityHistoryRecord = {
      recordId: `HIST-${this.recordSequence.toString().padStart(6, '0')}`,
      continuityId: entry.continuityId,
      identity: { ...entry.identity },
      previousConditionRef: entry.previousConditionRef ? { ...entry.previousConditionRef } : entry.previousConditionRef,
      currentConditionRef: entry.currentConditionRef ? { ...entry.currentConditionRef } : entry.currentConditionRef,
      transition: { ...entry.transition },
      effectiveTime: entry.effectiveTime,
      version: entry.version,
      validationResult: entry.validationResult ? { ...entry.validationResult } : undefined,
      sourceReference: entry.sourceReference,
      revision: entry.revision ? { ...entry.revision } : undefined,
      recordedAtEngineTime: Date.now()
    };

    const list = this.recordsByContinuityId.get(entry.continuityId) || [];
    list.push(record);
    this.recordsByContinuityId.set(entry.continuityId, list);

    return record;
  }

  /**
   * Retrieves chronological history records for a specific continuity identity.
   */
  public getHistory(continuityId: string): ContinuityHistoryRecord[] {
    const list = this.recordsByContinuityId.get(continuityId);
    return list ? [...list] : [];
  }

  /**
   * Clears all history (useful for isolated unit testing).
   */
  public clear(): void {
    this.recordsByContinuityId.clear();
    this.recordSequence = 0;
  }
}
