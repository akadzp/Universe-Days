/**
 * Phase 8: Process Data Model
 *
 * Implements ongoing, time-extended processes that persist across Daily Universe periods.
 * Does not assume completion within a single day.
 */

import { EntityID, SystemID } from '../../types/identifiers.ts';
import { ModelValidationStatus } from './types.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export type ProcessStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'BLOCKED' | 'TERMINATED';

export interface ProcessEntity {
  readonly processId: string;
  readonly processType: string;
  readonly title: string;
  readonly participantRefs: readonly EntityID[];
  readonly objectRefs: readonly EntityID[];
  readonly locationRef?: string;
  readonly startTime: string;
  readonly estimatedEndTime?: string;
  readonly endCondition?: string;
  readonly currentStatus: ProcessStatus;
  readonly progressRatio: number; // 0.0 to 1.0
  readonly dependencies: readonly string[];
  readonly unresolvedConditionRefs: readonly string[];
  readonly continuityReference?: string;
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly sourceSystem: SystemID;
  readonly validationStatus: ModelValidationStatus;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}
