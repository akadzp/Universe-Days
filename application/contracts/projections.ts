/**
 * Application Boundary: Projection / DTO Read Models.
 * Ensures the UI and external consumers receive clean read models instead of raw canonical entities.
 */

export interface UniverseSummaryDTO {
  readonly universeId: string;
  readonly scope: string;
  readonly universeDate: string;
  readonly characterCount: number;
  readonly eventCount: number;
  readonly unresolvedConditionCount: number;
  readonly activeProcessCount: number;
  readonly status: 'ACTIVE' | 'SANDBOX' | 'IDLE';
}

export interface CharacterIndicatorDTO {
  readonly key: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly mutable: boolean;
}

export interface CharacterSummaryDTO {
  readonly id: string;
  readonly displayName: string;
  readonly status: string;
  readonly level: string;
  readonly conditionIndicators: Record<string, CharacterIndicatorDTO>;
  readonly knowledgeCount: number;
  readonly relationshipCount: number;
  readonly roleCount: number;
  readonly effectiveFrom: string;
}

export interface DailyEventDTO {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly status: string;
  readonly participantIds: readonly string[];
  readonly startTime: string;
}

export interface DailyPeriodDTO {
  readonly periodId: string;
  readonly universeDate: string;
  readonly status: string;
  readonly openUnresolvedCount: number;
  readonly activeProcessCount: number;
  readonly events: readonly DailyEventDTO[];
}

export interface StorySummaryDTO {
  readonly storyId: string;
  readonly date: string;
  readonly title: string;
  readonly synopsis?: string;
  readonly status: string;
  readonly eventCount: number;
}
