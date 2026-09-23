/** Phase 31 — Universe-date Page Production Scheduler.
 * Coordinates generation cycles tied directly to the authoritative Universe date.
 * Scheduling is deterministic and never becomes Universe authority.
 */

import { deterministicKey } from '../../SHARED/platform.ts';
import type { PageCatalog } from '../../INFRA/SCALING/catalog.ts';
import type { PageScheduleDefinition, ScheduledJob } from '../../INFRA/SCHEDULER/types.ts';

interface CalendarDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly dayOfWeek: number;
}

function parseCalendarDate(value: string): CalendarDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid Universe date '${value}'. Expected YYYY-MM-DD.`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) throw new Error(`Invalid Universe month in '${value}'.`);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > monthLengths[month - 1]) throw new Error(`Invalid Universe day in '${value}'.`);

  // Sakamoto algorithm. 0=Sunday ... 6=Saturday. No JS Date is used for domain scheduling.
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (month < 3) y -= 1;
  const dayOfWeek = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;
  return Object.freeze({ year, month, day, dayOfWeek });
}

function matchesCadence(schedule: PageScheduleDefinition, date: CalendarDateParts): boolean {
  switch (schedule.cadence) {
    case 'DAILY':
      return true;
    case 'WEEKLY':
      return date.dayOfWeek === (schedule.dayOffset ?? 0);
    case 'MONTHLY':
      return date.day === (schedule.dayOffset ?? 1);
    case 'CUSTOM': {
      const filter = schedule.customFilter?.trim().toUpperCase();
      if (!filter || filter === 'ALL_DAYS') return true;
      if (filter.startsWith('DATE:')) return filter.slice(5) === `${date.year.toString().padStart(4, '0')}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
      if (filter.startsWith('DAY_OF_WEEK:')) return Number(filter.slice(12)) === date.dayOfWeek;
      if (filter.startsWith('DAY_OF_MONTH:')) return Number(filter.slice(13)) === date.day;
      return false;
    }
  }
}

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
    if (custom.length > 0) return Object.freeze(custom);

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
    const date = parseCalendarDate(universeDate);
    const jobs: ScheduledJob[] = [];

    for (const schedule of this.list()) {
      if (!schedule.enabled) continue;
      if (!matchesCadence(schedule, date)) continue;

      const page = this.catalog.get(schedule.pageDefinitionId);
      if (!page || page.status === 'DISABLED') continue;

      jobs.push(Object.freeze({
        jobId: deterministicKey('JOB', schedule.scheduleId, universeDate),
        scheduleId: schedule.scheduleId,
        pageDefinitionId: schedule.pageDefinitionId,
        universeDate,
        priority: schedule.priority,
        status: 'PENDING' as const
      }));
    }

    jobs.sort((a, b) => b.priority - a.priority || a.jobId.localeCompare(b.jobId));
    return Object.freeze(jobs);
  }
}
