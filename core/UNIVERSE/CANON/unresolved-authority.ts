import { SystemID, makeSystemID, makeDomainID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { AuthorityLevel, ModelValidationStatus } from '../../SHARED/model-types.ts';
import { createProvenanceMetadata } from '../../SHARED/provenance.ts';
import type { UnresolvedConditionEntity, UnresolvedConditionStatus } from './unresolved.ts';

export const UNRESOLVED_SYSTEM_ACTOR = makeSystemID('UNRESOLVED_SYSTEM');

export function mapDailyUnresolvedStatus(status: string): UnresolvedConditionStatus | null {
  switch (status) {
    case 'ACTIVE':
    case 'WAITING':
    case 'BLOCKED':
    case 'REVIEW_REQUIRED':
    case 'UNRESOLVED': return 'PENDING';
    case 'RESOLVED':
    case 'CLOSED': return 'RESOLVED';
    default: return null;
  }
}

export function reconcileUnresolved(existing: UnresolvedConditionEntity, dailyStatus: string, resolutionReference: string | undefined, actor: SystemID, effectiveTime: string): Result<UnresolvedConditionEntity> {
  if (actor !== UNRESOLVED_SYSTEM_ACTOR) {
    return failure(`Actor '${actor}' cannot mutate canonical unresolved condition '${existing.conditionId}'.`, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
  }
  const nextStatus = mapDailyUnresolvedStatus(dailyStatus);
  if (!nextStatus) return failure(`Daily Unresolved status '${dailyStatus}' has no safe Canon mapping.`, EngineErrorCode.UNRESOLVED_CONDITION_ERROR);
  if (existing.currentStatus === 'RESOLVED' && nextStatus !== 'RESOLVED') {
    return failure(`Canonical unresolved condition '${existing.conditionId}' cannot reopen from RESOLVED without explicit reactivation.`, EngineErrorCode.UNRESOLVED_CONDITION_ERROR);
  }
  return success(Object.freeze({
    ...existing,
    currentStatus: nextStatus,
    lastUpdated: effectiveTime,
    ...(resolutionReference ? { resolutionRef: resolutionReference } : {}),
    sourceSystem: UNRESOLVED_SYSTEM_ACTOR,
    validationStatus: ModelValidationStatus.VALID,
    provenance: createProvenanceMetadata(UNRESOLVED_SYSTEM_ACTOR, makeDomainID('UNRESOLVED'), existing.provenance.revision, AuthorityLevel.AUTHORITATIVE)
  }));
}
