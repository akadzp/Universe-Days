import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { UniverseEvent, UniverseEventStatus } from './event.ts';
import { ConsequenceRegistry, UniverseConsequence, UniverseConsequenceStatus } from './consequence.ts';

export interface ConsequenceDomainProposal {
  readonly proposalId: string;
  readonly consequenceId: string;
  readonly sourceEventRef: string;
  readonly targetDomain: string;
  readonly operation: string;
  readonly affectedReferences: readonly string[];
  readonly payload?: unknown;
}

export interface ConsequenceMediationResult {
  readonly triggered: number;
  readonly proposals: readonly ConsequenceDomainProposal[];
  readonly consequences: readonly UniverseConsequence[];
}

/**
 * Consequence mediation is deliberately proposal-only. It may evaluate and
 * transition consequence lifecycle, but it never writes Character/State/etc.
 */
export class ConsequenceMediator {
  public static mediate(
    events: readonly UniverseEvent[],
    consequences: readonly UniverseConsequence[],
    currentUniverseTime: string
  ): Result<ConsequenceMediationResult> {
    const current = TimePoint.parse(currentUniverseTime);
    if (!current.success || !current.data || current.data.isUnknown) {
      return failure('Consequence mediation requires explicit valid Universe Time.', EngineErrorCode.INVALID_TIME_POINT);
    }

    const occurredIds = new Set(events.filter(e => e.status === UniverseEventStatus.OCCURRED).map(e => e.eventId));
    const registry = new ConsequenceRegistry([...consequences]);
    let triggered = 0;
    const proposals: ConsequenceDomainProposal[] = [];

    for (const consequence of consequences) {
      if (consequence.status !== UniverseConsequenceStatus.PENDING) continue;
      if (!occurredIds.has(consequence.sourceEventRef)) continue;
      const activation = TimePoint.parse(consequence.temporalActivation);
      if (!activation.success || !activation.data || activation.data.isUnknown) {
        return failure(`Consequence '${consequence.consequenceId}' has invalid temporal activation.`, EngineErrorCode.INVALID_TIME_POINT);
      }
      if (activation.data.isAfter(current.data)) continue;

      const triggerRes = registry.trigger(consequence.consequenceId);
      if (!triggerRes.success || !triggerRes.data) return failure(triggerRes.message ?? 'Consequence trigger failed.', EngineErrorCode.INVALID_CONDITION);
      triggered++;

      const payload = consequence.payload as Record<string, unknown> | undefined;
      const targetDomain = typeof payload?.targetDomain === 'string' ? payload.targetDomain : undefined;
      const operation = typeof payload?.operation === 'string' ? payload.operation : undefined;
      if (consequence.affectedReferences.length > 0 && (!targetDomain || !operation)) {
        return failure(
          `Consequence '${consequence.consequenceId}' affects references but has no explicit targetDomain/operation proposal metadata.`,
          EngineErrorCode.CROSS_DOMAIN_AUTHORITY_VIOLATION
        );
      }
      if (targetDomain && operation) {
        proposals.push(Object.freeze({
          proposalId: `CONSEQ_PROPOSAL_${consequence.consequenceId}`,
          consequenceId: consequence.consequenceId,
          sourceEventRef: consequence.sourceEventRef,
          targetDomain,
          operation,
          affectedReferences: Object.freeze([...consequence.affectedReferences]),
          ...(consequence.payload !== undefined ? { payload: consequence.payload } : {})
        }));
      }
    }

    return success({
      triggered,
      proposals: Object.freeze(proposals),
      consequences: Object.freeze(registry.getAll())
    });
  }
}
