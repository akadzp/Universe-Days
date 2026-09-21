/**
 * Phase 8: State Domain Data Model
 *
 * Implements state representation compatible with the Phase 2 State Machine Engine.
 * Represents entity conditions at a given time without reimplementing state transition logic.
 */

import { EntityID } from '../../types/identifiers.ts';
import { EntityLifecycleStatus, ModelValidationStatus } from './types.ts';
import { RevisionHistory } from './history.ts';
import { SourceAuthorityMetadata } from './provenance.ts';
import { TemporalStatus } from '../../types/temporal.ts';

export interface StateEntity {
  readonly stateId: string;
  readonly entityRef: EntityID;
  readonly stateType: string;
  readonly currentValue: unknown;
  readonly previousValue?: unknown;
  readonly lifecycle: EntityLifecycleStatus;
  readonly validationStatus: ModelValidationStatus;
  readonly temporalValidity: {
    readonly effectiveFrom: string;
    readonly effectiveTo?: string;
    readonly temporalCategory: TemporalStatus;
  };
  readonly transitionCount: number;
  readonly continuityReference?: string;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}
