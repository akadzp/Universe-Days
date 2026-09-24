/**
 * Phase 8: Generic History and Revision Model
 *
 * Captures historical changes without losing information required for continuity.
 * Strictly separates Effective Time (Universe Time) from Recorded Time (Engine Storage Time).
 */

import { SystemID } from './identifiers.ts';
import { ModelValidationStatus } from './model-types.ts';

export interface RevisionRecord {
  readonly revisionId: string;
  readonly previousRevisionId: string | null;
  readonly changedFields: readonly string[];
  readonly changeSource: SystemID;
  readonly effectiveTime: string; // Universe Time (ISO or canonical TimePoint string)
  readonly recordedTime: number; // Engine execution time (Unix timestamp ms)
  readonly validationStatus: ModelValidationStatus;
  readonly reason?: string;
  readonly snapshotSummary?: string;
}

export interface RevisionHistory {
  readonly currentRevisionId: string;
  readonly revisions: readonly RevisionRecord[];
}

export class RevisionHistoryManager {
  /**
   * Creates an initial revision history starting at revision 1.
   */
  public static createInitial(
    source: SystemID,
    effectiveTime: string,
    initialReason: string = 'Initial creation',
    recordedTime: number = 0
  ): RevisionHistory {
    const rootRev: RevisionRecord = Object.freeze({
      revisionId: 'REV_0001',
      previousRevisionId: null,
      changedFields: Object.freeze(['*']),
      changeSource: source,
      effectiveTime,
      recordedTime,
      validationStatus: ModelValidationStatus.VALID,
      reason: initialReason
    });

    return Object.freeze({
      currentRevisionId: rootRev.revisionId,
      revisions: Object.freeze([rootRev])
    });
  }

  /**
   * Appends a new immutable revision to the history chain.
   */
  public static appendRevision(
    history: RevisionHistory,
    source: SystemID,
    effectiveTime: string,
    changedFields: string[],
    reason: string,
    validationStatus: ModelValidationStatus = ModelValidationStatus.VALID,
    recordedTime: number = 0
  ): RevisionHistory {
    const nextSeq = history.revisions.length + 1;
    const nextRevId = `REV_${String(nextSeq).padStart(4, '0')}`;

    const newRev: RevisionRecord = Object.freeze({
      revisionId: nextRevId,
      previousRevisionId: history.currentRevisionId,
      changedFields: Object.freeze([...changedFields]),
      changeSource: source,
      effectiveTime,
      recordedTime,
      validationStatus,
      reason
    });

    return Object.freeze({
      currentRevisionId: nextRevId,
      revisions: Object.freeze([...history.revisions, newRev])
    });
  }
}
