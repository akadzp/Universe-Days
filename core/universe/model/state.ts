/**
 * State Domain Data Model
 *
 * StateEntity tetap menjadi model State generik. Character State menggunakan
 * subtype terstruktur melalui stateType = CHARACTER dan currentValue bertipe
 * CharacterStateSnapshot.
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
  readonly stateEvent?: string;
  readonly stateChange?: string;
  readonly changeTrigger?: string;
  readonly changeDate?: string;
  readonly sourceEventReference?: string;
  readonly source?: string;
  readonly fieldSources?: Readonly<Record<string, string>>;
  readonly history: RevisionHistory;
  readonly provenance: SourceAuthorityMetadata;
}
