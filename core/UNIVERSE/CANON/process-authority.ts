import { SystemID, makeSystemID, makeDomainID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { AuthorityLevel, ModelValidationStatus } from '../../SHARED/model-types.ts';
import { createProvenanceMetadata } from '../../SHARED/provenance.ts';
import type { ProcessEntity, ProcessStatus } from './process.ts';

export const PROCESS_SYSTEM_ACTOR = makeSystemID('PROCESS_SYSTEM');

export type ProcessLifecycleTransition = 'START' | 'PAUSE' | 'BLOCK' | 'COMPLETE' | 'TERMINATE';

export function mapDailyProcessStatus(status: string): ProcessStatus | null {
  switch (status) {
    case 'ACTIVE': return 'ACTIVE';
    case 'PAUSED':
    case 'INTERRUPTED': return 'PAUSED';
    case 'SUSPENDED': return 'BLOCKED';
    case 'COMPLETED': return 'COMPLETED';
    case 'CANCELLED':
    case 'FAILED': return 'TERMINATED';
    default: return null;
  }
}

export function reconcileProcess(existing: ProcessEntity, dailyStatus: string, actor: SystemID, effectiveTime: string, completionEvidence?: string): Result<ProcessEntity> {
  if (actor !== PROCESS_SYSTEM_ACTOR) {
    return failure(`Actor '${actor}' cannot mutate canonical Process '${existing.processId}'.`, EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION);
  }
  const nextStatus = mapDailyProcessStatus(dailyStatus);
  if (!nextStatus) return failure(`Daily Process status '${dailyStatus}' has no safe Canon mapping.`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
  if (existing.currentStatus === 'COMPLETED' && nextStatus !== 'COMPLETED') {
    return failure(`Canonical Process '${existing.processId}' cannot regress from COMPLETED to '${nextStatus}'.`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
  }
  return success(Object.freeze({
    ...existing,
    currentStatus: nextStatus,
    progressRatio: nextStatus === 'COMPLETED' ? 1 : existing.progressRatio,
    validationStatus: ModelValidationStatus.VALID,
    sourceSystem: PROCESS_SYSTEM_ACTOR,
    provenance: createProvenanceMetadata(PROCESS_SYSTEM_ACTOR, makeDomainID('PROCESS'), existing.provenance.revision, AuthorityLevel.AUTHORITATIVE),
    history: existing.history,
    ...(completionEvidence ? { endCondition: existing.endCondition ?? completionEvidence } : {}),
    temporalValidity: Object.freeze({ ...existing.temporalValidity, effectiveFrom: existing.temporalValidity.effectiveFrom ?? effectiveTime })
  }));
}
