/**
 * Phase 5: Daily Universe Gate.
 * Internal period-level gate evaluating consistency of temporal, continuity,
 * event, process, and unresolved states.
 */

import { UniversePeriod } from '../../UNIVERSE/DAILY-CYCLE/period.ts';
import { UniverseEventStatus } from '../../UNIVERSE/DAILY-CYCLE/event.ts';
import { UniverseProcessStatus } from '../../UNIVERSE/DAILY-CYCLE/process.ts';
import { UnresolvedStatus } from '../../UNIVERSE/DAILY-CYCLE/unresolved.ts';
import { ContinuityStatus } from '../../UNIVERSE/CONTINUITY';

export type GateStatus = 'PASSED' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'FAILED';

export interface GateFinding {
  domain: 'TEMPORAL' | 'CONTINUITY' | 'EVENT' | 'PROCESS' | 'UNRESOLVED' | 'DEPENDENCY';
  severity: 'INFO' | 'WARNING' | 'ERROR';
  code: string;
  message: string;
  targetRef?: string;
}

export interface DailyUniverseGateContext {
  clock?: { readCurrentTime(): { toCanonical(): string } };
  continuityItems?: readonly { identity?: { continuityId?: string }; status?: ContinuityStatus }[];
  events?: readonly UniverseEventLike[];
  processes?: readonly { processId: string; currentStatus: UniverseProcessStatus }[];
  unresolvedConditions?: readonly { unresolvedId: string; sourceReference?: string }[];
}

interface UniverseEventLike {
  eventId: string;
  status: UniverseEventStatus;
  prerequisites: readonly { satisfied?: boolean; description: string }[];
}

export interface GateEvaluationResult {
  status: GateStatus;
  passed: boolean;
  findings: GateFinding[];
}

export class DailyUniverseGate {
  /**
   * Evaluates the internal period state against generic consistency invariants.
   */
  public static evaluate(
    period: UniversePeriod,
    context: DailyUniverseGateContext
  ): GateEvaluationResult {
    const findings: GateFinding[] = [];

    // 1. Temporal Validity
    if (!period.startTime) {
      findings.push({
        domain: 'TEMPORAL',
        severity: 'ERROR',
        code: 'MISSING_START_TIME',
        message: 'Period start time is missing',
        targetRef: period.periodId
      });
    }

    if (context.clock) {
      const clockTime = context.clock.readCurrentTime();
      if (!clockTime) {
        findings.push({
          domain: 'TEMPORAL',
          severity: 'ERROR',
          code: 'INVALID_CLOCK',
          message: 'UniverseClock returned undefined current time'
        });
      }
    }

    // 2. Continuity Validity
    if (context.continuityItems) {
      for (const item of context.continuityItems) {
        if (!item.identity || !item.identity.continuityId) {
          findings.push({
            domain: 'CONTINUITY',
            severity: 'ERROR',
            code: 'INVALID_IDENTITY',
            message: 'Continuity item is missing identity'
          });
        }
        if (item.status === ContinuityStatus.INVALID) {
          findings.push({
            domain: 'CONTINUITY',
            severity: 'ERROR',
            code: 'INVALID_STATUS',
            message: `Continuity item ${item.identity?.continuityId} has INVALID status`,
            targetRef: item.identity?.continuityId
          });
        }
      }
    }

    // 3. Event Consistency
    if (context.events) {
      for (const ev of context.events) {
        if (ev.status === UniverseEventStatus.OCCURRED || ev.status === UniverseEventStatus.RESOLVED) {
          const unsatisfiedPrereq = ev.prerequisites.find(p => p.satisfied === false);
          if (unsatisfiedPrereq) {
            findings.push({
              domain: 'EVENT',
              severity: 'ERROR',
              code: 'EVENT_PRECONDITION_VIOLATION',
              message: `Event ${ev.eventId} is marked OCCURRED despite unsatisfied prerequisite: ${unsatisfiedPrereq.description}`,
              targetRef: ev.eventId
            });
          }
        }
      }
    }

    // 4. Process Consistency
    if (context.processes) {
      for (const proc of context.processes) {
        if (proc.currentStatus === UniverseProcessStatus.FAILED) {
          findings.push({
            domain: 'PROCESS',
            severity: 'WARNING',
            code: 'PROCESS_FAILED',
            message: `Process ${proc.processId} is in FAILED status`,
            targetRef: proc.processId
          });
        }
      }
    }

    // 5. Unresolved Integrity
    if (context.unresolvedConditions) {
      for (const unres of context.unresolvedConditions) {
        if (!unres.sourceReference) {
          findings.push({
            domain: 'UNRESOLVED',
            severity: 'ERROR',
            code: 'MISSING_SOURCE_REF',
            message: `Unresolved condition ${unres.unresolvedId} lacks source reference`,
            targetRef: unres.unresolvedId
          });
        }
      }
    }

    const hasErrors = findings.some(f => f.severity === 'ERROR');
    const hasWarnings = findings.some(f => f.severity === 'WARNING');

    let status: GateStatus = 'PASSED';
    if (hasErrors) {
      status = 'BLOCKED';
    } else if (hasWarnings) {
      status = 'REVIEW_REQUIRED';
    }

    return {
      status,
      passed: !hasErrors,
      findings
    };
  }
}
