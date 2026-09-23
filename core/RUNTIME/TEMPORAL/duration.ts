/**
 * Duration Abstraction.
 * Stores deterministic duration units (seconds, minutes, hours, days, months, years).
 * Strictly preserves calendar-aware units without assuming every month has 30 days.
 */

import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { DurationData } from './types.ts';

export class Duration {
  public readonly years: number;
  public readonly months: number;
  public readonly days: number;
  public readonly hours: number;
  public readonly minutes: number;
  public readonly seconds: number;
  public readonly milliseconds: number;

  private constructor(data: DurationData) {
    this.years = Math.floor(data.years || 0);
    this.months = Math.floor(data.months || 0);
    this.days = Math.floor(data.days || 0);
    this.hours = Math.floor(data.hours || 0);
    this.minutes = Math.floor(data.minutes || 0);
    this.seconds = Math.floor(data.seconds || 0);
    this.milliseconds = Math.floor(data.milliseconds || 0);
  }

  public static create(data: DurationData): Result<Duration> {
    const values = [
      data.years,
      data.months,
      data.days,
      data.hours,
      data.minutes,
      data.seconds,
      data.milliseconds
    ];

    for (const v of values) {
      if (v !== undefined && (!Number.isFinite(v) || v < 0)) {
        return failure(
          EngineErrorCode.INVALID_DURATION,
          'Duration unit values must be non-negative finite numbers'
        );
      }
    }

    return success(new Duration(data));
  }

  public static fromSeconds(seconds: number): Duration {
    const sec = Math.max(0, Math.floor(seconds));
    const s = sec % 60;
    const totalMinutes = Math.floor(sec / 60);
    const m = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const h = totalHours % 24;
    const d = Math.floor(totalHours / 24);

    return new Duration({ days: d, hours: h, minutes: m, seconds: s });
  }

  public static fromMinutes(minutes: number): Duration {
    return Duration.fromSeconds(minutes * 60);
  }

  public static fromHours(hours: number): Duration {
    return Duration.fromSeconds(hours * 3600);
  }

  public static fromDays(days: number): Duration {
    return new Duration({ days: Math.max(0, Math.floor(days)) });
  }

  public static zero(): Duration {
    return new Duration({});
  }

  public isZero(): boolean {
    return (
      this.years === 0 &&
      this.months === 0 &&
      this.days === 0 &&
      this.hours === 0 &&
      this.minutes === 0 &&
      this.seconds === 0 &&
      this.milliseconds === 0
    );
  }

  /**
   * Calculates sub-month duration in total exact seconds.
   * NOTE: Returns failure or excludes calendar months/years because month lengths vary.
   */
  public toTimeOnlySeconds(): number {
    return (
      this.days * 86400 +
      this.hours * 3600 +
      this.minutes * 60 +
      this.seconds +
      Math.floor(this.milliseconds / 1000)
    );
  }

  public hasCalendarUnits(): boolean {
    return this.years > 0 || this.months > 0;
  }

  public toJSON(): DurationData {
    return {
      years: this.years,
      months: this.months,
      days: this.days,
      hours: this.hours,
      minutes: this.minutes,
      seconds: this.seconds,
      milliseconds: this.milliseconds
    };
  }

  public toString(): string {
    const parts: string[] = [];
    if (this.years > 0) parts.push(`${this.years}y`);
    if (this.months > 0) parts.push(`${this.months}m`);
    if (this.days > 0) parts.push(`${this.days}d`);
    if (this.hours > 0) parts.push(`${this.hours}h`);
    if (this.minutes > 0) parts.push(`${this.minutes}min`);
    if (this.seconds > 0) parts.push(`${this.seconds}s`);
    if (this.milliseconds > 0) parts.push(`${this.milliseconds}ms`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  }
}
