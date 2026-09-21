/**
 * Phase 9: Conflict Orchestrator
 *
 * Integrates Architecture Core Conflict Handler with runtime engine execution.
 * Enforces: DETECT -> CLASSIFY -> ROUTE -> RESOLVE -> REVALIDATE.
 * Halts/blocks execution if critical conflicts remain unarbitrated.
 */

import { DomainID, SystemID, makeDomainID } from '../types/identifiers.ts';
import { Result, success, failure, blocked, conflict as conflictResult } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import {
  routeConflict,
  ConflictRecord,
  ConflictDraft,
  ConflictStatus,
  ConflictSeverity
} from '../architecture/conflict.ts';
import { ExecutionContext } from './context.ts';

export class ConflictOrchestrator {
  /**
   * Detects and records an inter-system or domain conflict within the execution context.
   */
  public static handleConflict(
    ctx: ExecutionContext,
    draft: ConflictDraft
  ): Result<ConflictRecord> {
    const routeRes = routeConflict(draft);
    if (!routeRes.success || !routeRes.data) {
      return failure(
        routeRes.error ?? EngineErrorCode.DOMAIN_CONFLICT_DETECTED,
        routeRes.message || 'Failed to route conflict to authoritative domain owner.'
      );
    }

    const conflictRecord = routeRes.data;
    ctx.recordConflict(conflictRecord);

    ctx.tracer.record({
      stepId: 'CONFLICT_ROUTING',
      action: 'ROUTE_CONFLICT',
      owner: conflictRecord.targetOwner,
      domain: conflictRecord.domain,
      resultStatus: conflictRecord.status,
      details: {
        conflictId: conflictRecord.conflictId,
        severity: conflictRecord.severity,
        conflictingRefs: conflictRecord.conflictingReferences,
        description: conflictRecord.description
      }
    });

    if (conflictRecord.severity === 'CRITICAL' || conflictRecord.severity === 'HIGH') {
      return conflictResult(
        conflictRecord,
        `Execution blocked due to ${conflictRecord.severity} conflict on domain "${conflictRecord.domain}".`
      );
    }

    return success(conflictRecord);
  }

  /**
   * Asserts whether the execution context has any blocking conflicts.
   */
  public static evaluateBlockingConflicts(ctx: ExecutionContext): Result<boolean> {
    const unaddressed = ctx.conflicts.filter(
      c => (c.severity === 'CRITICAL' || c.severity === 'HIGH') && c.status !== ConflictStatus.RESOLVED
    );

    if (unaddressed.length > 0) {
      return blocked(
        EngineErrorCode.EXECUTION_CONFLICT,
        `Execution blocked: ${unaddressed.length} critical/high unresolved conflict(s) pending owner arbitration.`
      );
    }

    return success(true);
  }
}
