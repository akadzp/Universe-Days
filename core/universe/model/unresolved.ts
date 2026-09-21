/**
 * Phase 8: Unresolved Condition Data Model
 *
 * Formal data structure for unresolved universe conditions that persist across Daily periods.
 * Precludes automatic resolution without authoritative domain owner action.
 */

import { DomainID, SystemID } from '../../types/identifiers.ts';
import { ModelValidationStatus } from './types.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export type UnresolvedConditionStatus = 'PENDING' | 'CARRYOVER' | 'EVALUATING' | 'RESOLVED' | 'ABANDONED';

export interface UnresolvedConditionEntity {
  readonly conditionId: string;
  readonly conditionType: string;
  readonly description: string;
  readonly ownerDomain: DomainID;
  readonly targetEntityRef?: string;
  readonly temporalScope: {
    readonly effectiveFrom: string;
    readonly deadline?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly dependencyRefs: readonly string[];
  readonly currentStatus: UnresolvedConditionStatus;
  readonly createdAt: string;
  readonly lastUpdated: string;
  readonly resolutionRef?: string;
  readonly resolutionNotes?: string;
  readonly sourceSystem: SystemID;
  readonly validationStatus: ModelValidationStatus;
  readonly provenance: SourceAuthorityMetadata;
}
