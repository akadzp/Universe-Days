import { SystemID, DomainID, makeDomainID, makeSystemID } from '../../SHARED/identifiers.ts';
import { TraceabilityMetadata } from '../../SHARED/common.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { getOwner } from './ownership.ts';

export enum ConflictStatus {
  OPEN = 'OPEN',
  ROUTED = 'ROUTED',
  RESOLVED = 'RESOLVED',
  REVALIDATION_REQUIRED = 'REVALIDATION_REQUIRED',
  BLOCKED = 'BLOCKED'
}

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ConflictRecord {
  conflictId: string;
  domain: DomainID;
  sourceSystem: SystemID;
  targetOwner: SystemID;
  conflictingReferences: string[];
  severity: ConflictSeverity;
  status: ConflictStatus;
  traceability: TraceabilityMetadata;
  description: string;
}

export interface ConflictDraft {
  conflictId: string;
  domain: string | DomainID;
  sourceSystem: SystemID;
  conflictingReferences: string[];
  severity: ConflictSeverity;
  traceability: TraceabilityMetadata;
  description: string;
}

/**
 * Deterministically routes an inter-system conflict to the authoritative domain owner.
 *
 * Principle:
 * DETECT -> CLASSIFY -> ROUTE TO OWNER -> RESOLVE -> REVALIDATE.
 *
 * CRITICAL: The system does NOT automatically pick a winning source or resolve the conflict.
 * The routed conflict is placed in the ROUTED state for the domain owner to inspect and arbitrate.
 */
export function routeConflict(draft: ConflictDraft): Result<ConflictRecord> {
  const domainId = makeDomainID(String(draft.domain));
  const owner = getOwner(domainId);

  if (!owner) {
    return failure(
      `Cannot route conflict: Domain "${draft.domain}" does not have a registered authoritative owner.`,
      `UNKNOWN_DOMAIN`
    );
  }

  const record: ConflictRecord = {
    conflictId: draft.conflictId,
    domain: domainId,
    sourceSystem: draft.sourceSystem,
    targetOwner: owner.ownerId,
    conflictingReferences: [...draft.conflictingReferences],
    severity: draft.severity,
    status: ConflictStatus.ROUTED,
    traceability: { ...draft.traceability },
    description: draft.description
  };

  return success(record, `Conflict routed to authoritative owner ${owner.ownerId} for evaluation.`);
}
