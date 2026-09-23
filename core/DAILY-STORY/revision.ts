/**
 * Phase 6: Daily Story Revision & Stale Detection Engine.
 * Tracks story revisions, maintains Story ID stability, and detects upstream Universe staleness.
 */

import { StoryHandoffContext } from './handoff.ts';
import { UniversePeriodContext } from '../UNIVERSE/DAILY-CYCLE/initialization.ts';
import { CanonProtectionGuard } from './canon.ts';

export interface StoryRevisionMetadata {
  storyId: string;
  revisionNumber: number;
  originalFingerprint: string;
  currentFingerprint: string;
  isStale: boolean;
  stalenessReasons: string[];
  requiresRevalidation: boolean;
  updatedAtUniverseTime: string;
}

export class StoryRevisionManager {
  /**
   * Checks if an existing story is stale compared to the current UniversePeriodContext.
   */
  public static checkStaleness(
    handoff: StoryHandoffContext,
    currentUniverseContext: UniversePeriodContext
  ): StoryRevisionMetadata {
    const currentFingerprint = CanonProtectionGuard.computeUniverseContextFingerprint(currentUniverseContext);
    const stalenessReasons: string[] = [];

    // 1. Check if overall universe fingerprint changed
    const fingerprintMismatch = handoff.upstreamFingerprint !== currentFingerprint;

    // 2. Check scoped events status changes
    for (const scopedEv of handoff.events) {
      const currentEv = currentUniverseContext.events.find(e => e.eventId === scopedEv.eventId);
      if (!currentEv) {
        stalenessReasons.push(`Scoped event "${scopedEv.eventId}" no longer exists in Universe context`);
      } else if (currentEv.status !== scopedEv.status) {
        stalenessReasons.push(
          `Scoped event "${scopedEv.eventId}" changed status from ${scopedEv.status} to ${currentEv.status}`
        );
      }
    }

    // 3. Check scoped processes status changes
    for (const scopedProc of handoff.processes) {
      const currentProc = currentUniverseContext.processes.find(p => p.processId === scopedProc.processId);
      if (!currentProc) {
        stalenessReasons.push(`Scoped process "${scopedProc.processId}" no longer exists in Universe context`);
      } else if (currentProc.currentStatus !== scopedProc.currentStatus) {
        stalenessReasons.push(
          `Scoped process "${scopedProc.processId}" changed status from ${scopedProc.currentStatus} to ${currentProc.currentStatus}`
        );
      }
    }

    // 4. Check scoped unresolved conditions status changes
    for (const scopedUnres of handoff.unresolvedConditions) {
      const currentUnres = currentUniverseContext.unresolvedConditions.find(u => u.unresolvedId === scopedUnres.unresolvedId);
      if (!currentUnres) {
        stalenessReasons.push(`Scoped unresolved condition "${scopedUnres.unresolvedId}" no longer exists in Universe context`);
      } else if (currentUnres.lifecycleStatus !== scopedUnres.lifecycleStatus) {
        stalenessReasons.push(
          `Scoped unresolved condition "${scopedUnres.unresolvedId}" changed status from ${scopedUnres.lifecycleStatus} to ${currentUnres.lifecycleStatus}`
        );
      }
    }

    const isStale = stalenessReasons.length > 0 || fingerprintMismatch;

    return {
      storyId: handoff.storyId,
      revisionNumber: handoff.version,
      originalFingerprint: handoff.upstreamFingerprint,
      currentFingerprint,
      isStale,
      stalenessReasons,
      requiresRevalidation: isStale,
      updatedAtUniverseTime: currentUniverseContext.clock
        ? currentUniverseContext.clock.readCurrentTime().toCanonical()
        : handoff.storyDateTime
    };
  }

  /**
   * Creates an incremented revision of a story handoff while strictly preserving the Story ID.
   */
  public static createRevision(
    previousHandoff: StoryHandoffContext,
    currentUniverseContext: UniversePeriodContext
  ): StoryHandoffContext {
    const newFingerprint = CanonProtectionGuard.computeUniverseContextFingerprint(currentUniverseContext);

    // Re-filter scoped items to current universe state
    const currentEvents = currentUniverseContext.events.filter(e =>
      previousHandoff.scope.relevantEventIds.includes(e.eventId)
    );
    const currentProcesses = currentUniverseContext.processes.filter(p =>
      previousHandoff.scope.relevantProcessIds.includes(p.processId)
    );
    const currentConsequences = currentUniverseContext.consequences.filter(c =>
      previousHandoff.scope.relevantConsequenceIds.includes(c.consequenceId)
    );
    const currentUnresolved = currentUniverseContext.unresolvedConditions.filter(u =>
      previousHandoff.scope.relevantUnresolvedIds.includes(u.unresolvedId)
    );
    const currentContinuity = currentUniverseContext.continuityItems.filter(c =>
      previousHandoff.scope.relevantContinuityIds.includes(c.identity.continuityId)
    );

    return {
      ...previousHandoff,
      version: previousHandoff.version + 1,
      upstreamFingerprint: newFingerprint,
      events: currentEvents,
      processes: currentProcesses,
      consequences: currentConsequences,
      unresolvedConditions: currentUnresolved,
      continuityItems: currentContinuity,
      createdAtUniverseTime: currentUniverseContext.clock
        ? currentUniverseContext.clock.readCurrentTime().toCanonical()
        : previousHandoff.storyDateTime
    };
  }
}
