/** Phase 31 — Universe-date Page Production Scheduler.
 * Coordinates generation cycles tied directly to the authoritative Universe date.
 */

import { deterministicKey } from '../shared.ts';
import type { PageCatalog } from '../scaling/catalog.ts';
import type { PageScheduleDefinition, ScheduledJob } from './types.ts';

export class PageProductionScheduler {
  private readonly schedules = new Map<string, PageScheduleDefinition>();

  public constructor(private readonly catalog: PageCatalog) {}

  public register(schedule: PageScheduleDefinition): PageScheduleDefinition {
    const frozen = Object.freeze({ ...schedule });
    this.schedules.set(frozen.scheduleId, frozen);
    return frozen;
  }

  public unregister(scheduleId: string): boolean {
    return this.schedules.delete(scheduleId);
  }

  public get(scheduleId: string): PageScheduleDefinition | undefined {
    return this.schedules.get(scheduleId);
  }

  public list(): readonly PageScheduleDefinition[] {
    const custom = [...this.schedules.values()];
    if (custom.length > 0) {
      return Object.freeze(custom);
    }

    // Auto-derive virtual schedules for enabled pages in catalog
    const pages = this.catalog.list({ enabledOnly: true });
    return Object.freeze(
      pages.map(page =>
        Object.freeze({
          scheduleId: `SCHED_${page.pageDefinitionId}`,
          pageDefinitionId: page.pageDefinitionId,
          cadence: 'DAILY' as const,
          enabled: true,
          priority: page.priority
        })
      )
    );
  }

  public due(universeDate: string): readonly ScheduledJob[] {
    const allSchedules = this.list().filter(s => s.enabled);
    const jobs: ScheduledJob[] = [];

    for (const schedule of allSchedules) {
      const page = this.catalog.get(schedule.pageDefinitionId);
      if (page && page.status === 'DISABLED') continue;

      const jobId = deterministicKey('JOB', schedule.scheduleId, universeDate);
      jobs.push(
        Object.freeze({
          jobId,
          scheduleId: schedule.scheduleId,
          pageDefinitionId: schedule.pageDefinitionId,
          universeDate,
          priority: schedule.priority,
          status: 'PENDING'
        })
      );
    }

    // Sort by priority descending
    jobs.sort((a, b) => b.priority - a.priority);
    return Object.freeze(jobs);
  }
}
