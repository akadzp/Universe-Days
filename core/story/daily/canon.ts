/**
 * Phase 6: Daily Story Canon Protection Guard.
 * Ensures Story production does not mutate or claim unauthorized changes to Universe Canon.
 * Daily Story consumes validated Universe data; it cannot retroactively inject Canon.
 */

import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';
import { UniversePeriodContext } from '../../universe/daily/initialization.ts';

export interface CanonCheckResult {
  isCanonCompliant: boolean;
  unauthorizedClaims: string[];
  universeStateUnchanged: boolean;
}

export class CanonProtectionGuard {
  /**
   * Generates an immutable snapshot hash of the UniversePeriodContext to detect accidental mutations.
   */
  public static computeUniverseContextFingerprint(context: UniversePeriodContext): string {
    const payload = [
      context.period.periodId,
      context.period.status,
      context.period.startTime.toCanonical(),
      context.period.endTime?.toCanonical() ?? '',
      context.events.map(e => `${e.eventId}:${e.status}`).join('|'),
      context.processes.map(p => `${p.processId}:${p.currentStatus}`).join('|'),
      context.consequences.map(c => `${c.consequenceId}:${c.status}`).join('|'),
      context.unresolvedConditions.map(u => `${u.unresolvedId}:${u.lifecycleStatus}`).join('|'),
      context.continuityItems.map(ci => `${ci.identity.continuityId}:${ci.status}`).join('|')
    ].join('###');

    let hash = 0x811c9dc5;
    for (let i = 0; i < payload.length; i++) {
      hash ^= payload.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
  }

  /**
   * Validates that Universe context remained strictly unchanged before and after story production.
   */
  public static verifyContextImmutability(
    initialFingerprint: string,
    currentContext: UniversePeriodContext
  ): Result<boolean> {
    const currentFingerprint = this.computeUniverseContextFingerprint(currentContext);
    if (initialFingerprint !== currentFingerprint) {
      return failure(
        EngineErrorCode.CANON_MUTATION_PROHIBITED,
        `Story production illegally mutated Universe Canon! Initial fingerprint: ${initialFingerprint}, Current: ${currentFingerprint}`
      );
    }
    return success(true);
  }

  /**
   * Checks for unauthorized canonical claims in story metadata or non-scoped references.
   */
  public static validateClaims(
    claimedEntityRefs: string[],
    universeContext: UniversePeriodContext
  ): CanonCheckResult {
    const knownEntities = new Set<string>();

    for (const cont of universeContext.continuityItems) {
      if (cont.identity.entityRef) {
        knownEntities.add(cont.identity.entityRef);
      }
    }

    const unauthorizedClaims: string[] = [];
    for (const ref of claimedEntityRefs) {
      if (!knownEntities.has(ref)) {
        unauthorizedClaims.push(ref);
      }
    }

    return {
      isCanonCompliant: unauthorizedClaims.length === 0,
      unauthorizedClaims,
      universeStateUnchanged: true
    };
  }
}
