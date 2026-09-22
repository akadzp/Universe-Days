/** Phase 31 — Page Production Scheduler Types. */

export type ScheduleCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface PageScheduleDefinition {
  readonly scheduleId: string;
  readonly pageDefinitionId: string;
  readonly cadence: ScheduleCadence;
  readonly enabled: boolean;
  readonly priority: number;
  readonly dayOffset?: number;
  readonly customFilter?: string;
}

export interface ScheduledJob {
  readonly jobId: string;
  readonly scheduleId: string;
  readonly pageDefinitionId: string;
  readonly universeDate: string;
  readonly priority: number;
  readonly status: 'PENDING' | 'DISPATCHED' | 'COMPLETED' | 'SKIPPED';
}
