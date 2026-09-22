/** Phase 31 — Universe-date Page Production Scheduler Types. */

export type ScheduleCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export type ScheduledJobStatus =
  | 'PENDING'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'FAILED'
  | 'SKIPPED';

export interface PageScheduleDefinition {
  readonly scheduleId: string;
  readonly pageDefinitionId: string;
  readonly cadence: ScheduleCadence;
  readonly enabled: boolean;
  readonly priority: number;
  /** WEEKLY: 0=Sunday..6=Saturday. MONTHLY: 1..31. */
  readonly dayOffset?: number;
  /** CUSTOM filter syntax: ALL_DAYS, DATE:YYYY-MM-DD, DAY_OF_WEEK:0..6, DAY_OF_MONTH:1..31. */
  readonly customFilter?: string;
}

export interface ScheduledJob {
  readonly jobId: string;
  readonly scheduleId: string;
  readonly pageDefinitionId: string;
  readonly universeDate: string;
  readonly priority: number;
  readonly status: ScheduledJobStatus;
}
