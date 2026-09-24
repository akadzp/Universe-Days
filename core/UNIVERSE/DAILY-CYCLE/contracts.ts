/** Shared Daily-Cycle contracts intentionally isolated from lifecycle implementations. */

import type { UniverseClock } from '../../RUNTIME/TEMPORAL/clock.ts';
import type { CarryoverBatchResult } from './carryover.ts';
import type { ContinuityItem } from '../../UNIVERSE/CONTINUITY/continuity-model.ts';
import type { UniverseEvent } from './event.ts';
import type { UniverseConsequence } from './consequence.ts';
import type { UniverseProcess } from './process.ts';
import type { UnresolvedCondition } from './unresolved.ts';
import type { FutureInformation } from './decision-action.ts';
import type { PeriodTraceRecorder } from './trace.ts';
import type { PeriodLifecycleManager } from './lifecycle.ts';
import type { UniversePeriod, DailyUniverseStatus } from './period.ts';
import type { NextPeriodContext } from './next-period.ts';

export type PeriodInitializationMode = 'FIRST_PERIOD' | 'NORMAL_CONTINUATION';

export interface UniversePeriodContext {
  period: UniversePeriod;
  initializationMode: PeriodInitializationMode;
  lifecycle: PeriodLifecycleManager;
  clock: UniverseClock;
  traces: PeriodTraceRecorder;
  continuityItems: ContinuityItem[];
  unresolvedConditions: UnresolvedCondition[];
  processes: UniverseProcess[];
  futureInfo: FutureInformation[];
  events: UniverseEvent[];
  consequences: UniverseConsequence[];
  metadata: Record<string, unknown>;
  carryoverResult?: CarryoverBatchResult;
}

export interface FinalizationResult {
  periodId: string;
  finalStatus: DailyUniverseStatus;
  nextPeriodContext: NextPeriodContext;
  openUnresolvedCount: number;
  activeProcessCount: number;
}
