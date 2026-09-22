/**
 * Phase 11: Daily Page System contracts.
 *
 * A Daily Page is a projection over authoritative Universe data. It is not an
 * authority and it does not mutate Canon, Temporal Truth, Story Truth, or any
 * domain state.
 */

import { TimePoint } from '../../temporal/time-point.ts';
import { TemporalPosition, TemporalStatus } from '../../types/temporal.ts';
import { PageID } from '../../types/identifiers.ts';
import { StoryProductionPackage } from '../../story/daily/orchestrator.ts';
import { Result } from '../../types/result.ts';

export type DailyPageRunStatus =
  | 'CREATED'
  | 'CONTEXT_BOUND'
  | 'PROJECTED'
  | 'VALIDATED'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED';

export type PageSourceKind =
  | 'EVENT'
  | 'PROCESS'
  | 'CONTINUITY'
  | 'UNRESOLVED'
  | 'FUTURE_INFORMATION'
  | 'STORY';

export interface PageSourceRef {
  readonly kind: PageSourceKind;
  readonly ref: string;
}

export interface PageSourceSelection {
  readonly eventIds?: readonly string[];
  readonly processIds?: readonly string[];
  readonly continuityIds?: readonly string[];
  readonly unresolvedIds?: readonly string[];
  readonly futureInformationRefs?: readonly string[];
  readonly includeStory?: boolean;
}

export interface PageTemporalFrame {
  /** Universe-authoritative current reference time. */
  readonly universeTime: string;
  /** Explicit content anchor; defaults to universeTime only when requested. */
  readonly anchorTime: string;
  readonly position: TemporalPosition;
  readonly status: TemporalStatus;
}

export interface PageProjection {
  readonly sources: readonly PageSourceRef[];
  readonly storyId?: string;
}

export interface DailyPageProductionInput {
  readonly universeId: string;
  readonly universeScope: string;
  readonly pageKey: string;
  readonly pageScope: string;
  readonly universeContext: import('../../universe/daily/initialization.ts').UniversePeriodContext;
  readonly temporalAnchor?: TimePoint;
  readonly temporalStatus: TemporalStatus;
  readonly sourceSelection: PageSourceSelection;
  readonly storyPackage?: StoryProductionPackage;
  readonly restrictions?: readonly string[];
  readonly version?: number;
  readonly dryRun?: boolean;
}

export interface DailyPageProductionPackage {
  readonly pageId: PageID;
  readonly universeId: string;
  readonly universeScope: string;
  readonly pageKey: string;
  readonly pageScope: string;
  readonly pageDate: string;
  readonly pageDateTime: string;
  readonly temporalFrame: PageTemporalFrame;
  readonly projection: PageProjection;
  readonly restrictions: readonly string[];
  readonly validationStatus: 'PASSED' | 'BLOCKED';
  readonly version: number;
  readonly upstreamFingerprint: string;
}

export interface DailyPageRun {
  readonly pageId: PageID;
  readonly status: DailyPageRunStatus;
  readonly package: DailyPageProductionPackage;
  readonly persisted: boolean;
}

export interface DailyPageResult {
  readonly run: DailyPageRun;
  readonly result: Result<DailyPageRun>;
}
