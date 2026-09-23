/**
 * Phase 5: Next Period Context Model.
 * Prepares the deterministic context for continuation into the subsequent period.
 */

import { TimePoint } from '../../RUNTIME/TEMPORAL/time-point.ts';
import { ContinuityItem } from '../../UNIVERSE/CONTINUITY';
import { UniverseProcess } from '../../UNIVERSE/DAILY-CYCLE/process.ts';
import { UnresolvedCondition } from '../../UNIVERSE/DAILY-CYCLE/unresolved.ts';
import { UniverseEvent } from '../../UNIVERSE/DAILY-CYCLE/event.ts';
import { FutureInformation } from '../../UNIVERSE/DAILY-CYCLE/decision-action.ts';

export interface NextPeriodContext {
  nextTemporalReference: TimePoint;
  continuityReferences: ContinuityItem[];
  activeProcesses: UniverseProcess[];
  unresolvedConditions: UnresolvedCondition[];
  futureInformation: FutureInformation[];
  pendingEvents: UniverseEvent[];
  relevantHistoryReferences: string[];
  validationResult: {
    valid: boolean;
    errors?: string[];
  };
  sourcePeriodId: string;
}

export interface PrepareNextPeriodParams {
  sourcePeriodId: string;
  nextTemporalReference: TimePoint;
  continuityReferences: ContinuityItem[];
  activeProcesses: UniverseProcess[];
  unresolvedConditions: UnresolvedCondition[];
  futureInformation?: FutureInformation[];
  pendingEvents?: UniverseEvent[];
  relevantHistoryReferences?: string[];
}

export function createNextPeriodContext(params: PrepareNextPeriodParams): NextPeriodContext {
  return {
    sourcePeriodId: params.sourcePeriodId,
    nextTemporalReference: params.nextTemporalReference,
    continuityReferences: params.continuityReferences.map(c => ({ ...c })),
    activeProcesses: params.activeProcesses.map(p => ({ ...p })),
    unresolvedConditions: params.unresolvedConditions.map(u => ({ ...u })),
    futureInformation: (params.futureInformation ?? []).map(f => ({ ...f })),
    pendingEvents: (params.pendingEvents ?? []).map(e => ({ ...e })),
    relevantHistoryReferences: params.relevantHistoryReferences ?? [],
    validationResult: {
      valid: true
    }
  };
}
