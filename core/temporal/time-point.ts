/**
 * TimePoint Domain Abstraction.
 * Strictly immutable, explicit precision preservation, and deterministic comparisons.
 * Does not rely on JS Date as domain representation.
 */

import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import {
  TimePrecision,
  TimePointData,
  TimeOfDayData
} from '../types/temporal.ts';
import { UniverseDate } from './date.ts';
import { Duration } from './duration.ts';

export class TimePoint {
  public readonly date?: UniverseDate;
  public readonly timeOfDay?: Readonly<TimeOfDayData>;
  public readonly precision: TimePrecision;
  public readonly zone: string;
  public readonly isUnknown: boolean;

  private constructor(
    date?: UniverseDate,
    timeOfDay?: TimeOfDayData,
    precision = TimePrecision.DATE,
    zone = 'UNIVERSE_UTC',
    isUnknown = false
  ) {
    this.date = date;
    this.timeOfDay = timeOfDay ? Object.freeze({ ...timeOfDay }) : undefined;
    this.precision = precision;
    this.zone = zone;
    this.isUnknown = isUnknown;
  }

  /**
   * Creates an explicitly unknown TimePoint.
   */
  public static unknown(): TimePoint {
    return new TimePoint(undefined, undefined, TimePrecision.UNKNOWN, 'UNIVERSE_UTC', true);
  }

  /**
   * Creates a TimePoint with DATE precision.
   * TimeOfDay is preserved as undefined.
   */
  public static fromDate(date: UniverseDate, zone = 'UNIVERSE_UTC'): TimePoint {
    return new TimePoint(date, undefined, TimePrecision.DATE, zone, false);
  }

  /**
   * Creates a TimePoint with DATETIME / TIME_POINT precision.
   */
  public static fromDateTime(
    date: UniverseDate,
    timeOfDay: TimeOfDayData,
    zone = 'UNIVERSE_UTC'
  ): Result<TimePoint> {
    const { hour, minute, second, millisecond } = timeOfDay;
    if (
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59 ||
      !Number.isInteger(second) || second < 0 || second > 59 ||
      (millisecond !== undefined && (!Number.isInteger(millisecond) || millisecond < 0 || millisecond > 999))
    ) {
      return failure(
        EngineErrorCode.INVALID_TIME,
        `Invalid time-of-day: ${hour}:${minute}:${second}.${millisecond ?? 0}. Expected hour 0-23, minute 0-59, second 0-59.`
      );
    }

    return success(
      new TimePoint(
        date,
        { hour, minute, second, millisecond: millisecond ?? 0 },
        TimePrecision.DATETIME,
        zone,
        false
      )
    );
  }

  /**
   * Parses a canonical string representation:
   * e.g. "YYYY-MM-DD" -> DATE precision
   * e.g. "YYYY-MM-DDTHH:mm:ssZ" -> DATETIME precision
   * e.g. "YYYY-MM-DDTHH:mm:ss.sssZ" -> TIME_POINT precision
   * e.g. "UNKNOWN" -> UNKNOWN precision
   */
  public static parse(canonical: string): Result<TimePoint> {
    if (!canonical || typeof canonical !== 'string') {
      return failure(EngineErrorCode.INVALID_TIME_POINT, 'TimePoint string must be a non-empty string');
    }

    const trimmed = canonical.trim();
    if (trimmed.toUpperCase() === 'UNKNOWN') {
      return success(TimePoint.unknown());
    }

    // Check if it's purely a date: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const dateRes = UniverseDate.parse(trimmed);
      if (dateRes.status !== 'SUCCESS') {
        return failure(dateRes.error, dateRes.message);
      }
      return success(TimePoint.fromDate(dateRes.data!));
    }

    // Match ISO DateTime: YYYY-MM-DDTHH:mm:ss(.sss)?(Z|[+-]\d{2}:\d{2})?
    const dtRegex = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})?$/;
    const match = trimmed.match(dtRegex);

    if (!match) {
      return failure(
        EngineErrorCode.INVALID_TIME_POINT,
        `String "${canonical}" cannot be parsed as a valid TimePoint. Expected YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ`
      );
    }

    const dateStr = match[1];
    const hour = parseInt(match[2], 10);
    const minute = parseInt(match[3], 10);
    const second = parseInt(match[4], 10);
    const msStr = match[5];
    const millisecond = msStr ? parseInt(msStr.padEnd(3, '0').slice(0, 3), 10) : 0;
    const zone = match[6] || 'UNIVERSE_UTC';

    const dateRes = UniverseDate.parse(dateStr);
    if (dateRes.status !== 'SUCCESS') {
      return failure(dateRes.error, dateRes.message);
    }

    return TimePoint.fromDateTime(
      dateRes.data!,
      { hour, minute, second, millisecond },
      zone
    );
  }

  /**
   * Deterministic comparison between two TimePoints.
   * Returns:
   *   -1 if this < other
   *    0 if this == other
   *    1 if this > other
   *   null if indeterminate (either is unknown)
   */
  public compare(other: TimePoint): number | null {
    if (this.isUnknown || other.isUnknown) {
      return null;
    }
    if (!this.date || !other.date) {
      return null;
    }

    const dateComp = this.date.compare(other.date);
    if (dateComp !== 0) {
      return dateComp;
    }

    // Dates are equal. Compare time of day.
    // If either has DATE precision, we cannot distinguish time-of-day; they represent the same calendar day.
    if (!this.timeOfDay || !other.timeOfDay) {
      return 0;
    }

    if (this.timeOfDay.hour !== other.timeOfDay.hour) {
      return this.timeOfDay.hour < other.timeOfDay.hour ? -1 : 1;
    }
    if (this.timeOfDay.minute !== other.timeOfDay.minute) {
      return this.timeOfDay.minute < other.timeOfDay.minute ? -1 : 1;
    }
    if (this.timeOfDay.second !== other.timeOfDay.second) {
      return this.timeOfDay.second < other.timeOfDay.second ? -1 : 1;
    }

    const msThis = this.timeOfDay.millisecond ?? 0;
    const msOther = other.timeOfDay.millisecond ?? 0;
    if (msThis !== msOther) {
      return msThis < msOther ? -1 : 1;
    }

    return 0;
  }

  public equals(other: TimePoint): boolean {
    if (this.isUnknown || other.isUnknown) {
      return false;
    }
    return this.compare(other) === 0;
  }

  public isBefore(other: TimePoint): boolean {
    const comp = this.compare(other);
    return comp !== null && comp < 0;
  }

  public isAfter(other: TimePoint): boolean {
    const comp = this.compare(other);
    return comp !== null && comp > 0;
  }

  /**
   * Advances this TimePoint by an explicit Duration.
   * Correctly rolls seconds -> minutes -> hours -> days -> dates -> months -> years.
   */
  public advance(duration: Duration): TimePoint {
    if (this.isUnknown || !this.date) {
      return this;
    }

    // Handle calendar advancement (years, months, days)
    let newDate = this.date;
    if (duration.years > 0 || duration.months > 0) {
      let totalMonths = (newDate.year * 12 + (newDate.month - 1)) + (duration.years * 12 + duration.months);
      let newYear = Math.floor(totalMonths / 12);
      let newMonth = (totalMonths % 12) + 1;
      let maxDaysInNewMonth = UniverseDate.daysInMonth(newYear, newMonth);
      let newDay = Math.min(newDate.day, maxDaysInNewMonth);
      const res = UniverseDate.create(newYear, newMonth, newDay);
      if (res.status === 'SUCCESS') {
        newDate = res.data!;
      }
    }

    if (duration.days > 0) {
      newDate = newDate.advanceDays(duration.days);
    }

    // If there is time of day, roll hours, minutes, seconds, milliseconds
    let newTimeOfDay: TimeOfDayData | undefined = undefined;
    if (this.timeOfDay) {
      let ms = (this.timeOfDay.millisecond ?? 0) + duration.milliseconds;
      let secCarry = Math.floor(ms / 1000);
      ms = ms % 1000;

      let second = this.timeOfDay.second + duration.seconds + secCarry;
      let minCarry = Math.floor(second / 60);
      second = second % 60;

      let minute = this.timeOfDay.minute + duration.minutes + minCarry;
      let hourCarry = Math.floor(minute / 60);
      minute = minute % 60;

      let hour = this.timeOfDay.hour + duration.hours + hourCarry;
      let dayCarry = Math.floor(hour / 24);
      hour = hour % 24;

      if (dayCarry > 0) {
        newDate = newDate.advanceDays(dayCarry);
      }

      newTimeOfDay = {
        hour,
        minute,
        second,
        millisecond: ms
      };
    } else if (duration.hours > 0 || duration.minutes > 0 || duration.seconds > 0 || duration.milliseconds > 0) {
      // If we are advancing by time units when precision was DATE, convert to DATETIME
      let ms = duration.milliseconds;
      let secCarry = Math.floor(ms / 1000);
      ms = ms % 1000;

      let second = duration.seconds + secCarry;
      let minCarry = Math.floor(second / 60);
      second = second % 60;

      let minute = duration.minutes + minCarry;
      let hourCarry = Math.floor(minute / 60);
      minute = minute % 60;

      let hour = duration.hours + hourCarry;
      let dayCarry = Math.floor(hour / 24);
      hour = hour % 24;

      if (dayCarry > 0) {
        newDate = newDate.advanceDays(dayCarry);
      }

      newTimeOfDay = {
        hour,
        minute,
        second,
        millisecond: ms
      };
    }

    return new TimePoint(
      newDate,
      newTimeOfDay,
      newTimeOfDay ? TimePrecision.DATETIME : this.precision,
      this.zone,
      false
    );
  }

  public toCanonical(): string {
    if (this.isUnknown || !this.date) {
      return 'UNKNOWN';
    }
    const dateStr = this.date.toCanonical();
    if (!this.timeOfDay) {
      return dateStr;
    }
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const msPad = (n: number) => (n < 10 ? `00${n}` : n < 100 ? `0${n}` : `${n}`);
    const timeStr = `${pad(this.timeOfDay.hour)}:${pad(this.timeOfDay.minute)}:${pad(this.timeOfDay.second)}`;
    const msStr = this.timeOfDay.millisecond ? `.${msPad(this.timeOfDay.millisecond)}` : '';
    return `${dateStr}T${timeStr}${msStr}Z`;
  }

  public toString(): string {
    return this.toCanonical();
  }

  public toJSON(): TimePointData {
    return {
      date: this.date ? this.date.toJSON() : undefined,
      timeOfDay: this.timeOfDay ? { ...this.timeOfDay } : undefined,
      precision: this.precision,
      zone: this.zone,
      isUnknown: this.isUnknown
    };
  }
}
