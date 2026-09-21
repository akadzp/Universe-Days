/**
 * Phase 8: Source and Authority Metadata (Provenance)
 *
 * Tracks the authoritative origin, owning domain system, and validation level of every fact.
 */

import { SystemID, DomainID, RequestID } from '../../types/identifiers.ts';
import { AuthorityLevel, ModelValidationStatus } from './types.ts';

export interface SourceAuthorityMetadata {
  readonly ownerSystem: SystemID;
  readonly domainId: DomainID;
  readonly authorityLevel: AuthorityLevel;
  readonly validationStatus: ModelValidationStatus;
  readonly revision: string;
  readonly sourceRequestId?: RequestID;
  readonly provenanceReference?: string;
  readonly recordedTimestamp: number;
}

export function createProvenanceMetadata(
  ownerSystem: SystemID,
  domainId: DomainID,
  revision: string = 'REV_0001',
  authorityLevel: AuthorityLevel = AuthorityLevel.AUTHORITATIVE,
  sourceRequestId?: RequestID,
  provenanceReference?: string
): SourceAuthorityMetadata {
  return Object.freeze({
    ownerSystem,
    domainId,
    authorityLevel,
    validationStatus: ModelValidationStatus.VALID,
    revision,
    sourceRequestId,
    provenanceReference,
    recordedTimestamp: Date.now()
  });
}
