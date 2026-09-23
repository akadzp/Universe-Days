/**
 * Phase 10: End-to-End Production Pipeline
 *
 * Production-layer contracts only.
 * This layer orchestrates existing deterministic systems; it does not own
 * Universe, Story, Domain, Temporal, or Continuity truth.
 */

import { TimePoint } from '../../../RUNTIME/TEMPORAL/time-point.ts';
import { ContinuityItem } from '../../../UNIVERSE/CONTINUITY/continuity-model.ts';
import { UniverseProcess } from '../../../UNIVERSE/DAILY-CYCLE/process.ts';
import { UnresolvedCondition } from '../../../UNIVERSE/DAILY-CYCLE/unresolved.ts';
import { FutureInformation } from '../../../UNIVERSE/DAILY-CYCLE/decision-action.ts';
import { UniverseEvent } from '../../../UNIVERSE/DAILY-CYCLE/event.ts';
import { ProgressionStepInput } from '../../../UNIVERSE/DAILY-CYCLE/progression.ts';
import { StoryTrigger } from '../../../DAILY-STORY/trigger.ts';
import { ProduceStoryOptions, StoryProductionPackage } from '../../../DAILY-STORY/orchestrator.ts';
import { FinalizationResult } from '../../../UNIVERSE/DAILY-CYCLE/finalization.ts';
import { UniversePeriodContext } from '../../../UNIVERSE/DAILY-CYCLE/initialization.ts';
import { Result } from '../../../SHARED/result.ts';

export type ProductionRunStatus =
  | 'CREATED'
  | 'INITIALIZING'
  | 'PROGRESSING'
  | 'STORY_READY'
  | 'RENDERING'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED';

export type ProductionStage =
  | 'INPUT'
  | 'INITIALIZATION'
  | 'PROGRESSION'
  | 'STORY'
  | 'RENDER'
  | 'FINALIZATION'
  | 'PERSISTENCE';

export interface ProductionTrace {
  readonly stage: ProductionStage;
  readonly status: 'STARTED' | 'PASSED' | 'FAILED' | 'BLOCKED';
  readonly detail?: string;
}

export interface ProductionRenderResult<TOutput = unknown> {
  readonly output: TOutput;
  readonly status: 'RENDERED' | 'VALIDATED';
  readonly rendererId: string;
}

export interface ProductionRenderer<TOutput = unknown> {
  readonly rendererId: string;
  render(
    storyPackage: StoryProductionPackage
  ): Promise<Result<ProductionRenderResult<TOutput>>> | Result<ProductionRenderResult<TOutput>>;
}

export interface DailyProductionInput {
  readonly universeId: string;
  readonly universeScope: string;
  readonly startTime: TimePoint;
  readonly endTime?: TimePoint;
  readonly previousPeriodRef?: string;
  readonly sequenceNumber?: number;

  readonly previousContinuityItems?: readonly ContinuityItem[];
  readonly previousUnresolvedConditions?: readonly UnresolvedCondition[];
  readonly previousProcesses?: readonly UniverseProcess[];
  readonly previousFutureInfo?: readonly FutureInformation[];
  readonly initialEvents?: readonly UniverseEvent[];

  readonly progressionSteps?: readonly ProgressionStepInput[];
  readonly storyTrigger: StoryTrigger;
  readonly storyOptions?: Omit<ProduceStoryOptions, 'instanceRef'>;

  /**
   * A renderer is intentionally injected.
   * Gemini/Narrator can be added later without changing this pipeline contract.
   */
  readonly renderer: ProductionRenderer;

  /**
   * When true, the run is prepared and validated but no persistent run record
   * is written. This is useful for deterministic verification.
   */
  readonly dryRun?: boolean;
}

export interface DailyProductionRun<TOutput = unknown> {
  readonly runId: string;
  readonly status: ProductionRunStatus;
  readonly universeId: string;
  readonly universeScope: string;
  readonly periodId: string;
  readonly periodContext: UniversePeriodContext;
  readonly storyPackage: StoryProductionPackage;
  readonly renderResult: ProductionRenderResult<TOutput>;
  readonly finalization: FinalizationResult;
  readonly traces: readonly ProductionTrace[];
  readonly errors: readonly string[];
  readonly createdDeterministicallyFrom: {
    universeId: string;
    periodId: string;
    triggerId: string;
    storyId: string;
  };
}

export function deriveProductionRunId(
  universeId: string,
  periodId: string,
  triggerId: string
): string {
  const clean = (value: string) =>
    value.replace(/[^A-Za-z0-9_-]/g, '_');

  return `RUN_${clean(universeId)}_${clean(periodId)}_${clean(triggerId)}`;
}
