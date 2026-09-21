/**
 * Phase 5: Next Period Context Model.
 * Prepares the deterministic context for continuation into the subsequent period.
 */

import { TimePoint } from '../../temporal/time-point.ts';
import { ContinuityItem } from '../continuity/index.ts';
import { UniverseProcess } from './process.ts';
import { UnresolvedCondition } from './unresolved.ts';
import { UniverseEvent } from './event.ts';
import { FutureInformation } from './decision-action.ts';

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
