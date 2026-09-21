/**
 * Validated Universe Date Abstraction.
 * Strictly adheres to the Proleptic Gregorian Calendar.
 * Canonical representation: YYYY-MM-DD.
 */

import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { UniverseDateData } from '../types/temporal.ts';

export class UniverseDate {
  public readonly year: number;
  public readonly month: number; // 1-12
  public readonly day: number;   // 1-31

  private constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  /**
   * Deterministic leap year check using Proleptic Gregorian rules:
   * A year is a leap year if divisible by 4, unless divisible by 100,
   * unless also divisible by 400.
   */
  public static isLeapYear(year: number): boolean {
    if (!Number.isInteger(year)) return false;
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Returns exact days in the specified month and year.
   */
  public static daysInMonth(year: number, month: number): number {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return 0;
    }
    switch (month) {
      case 1:  return 31; // Jan
      case 2:  return UniverseDate.isLeapYear(year) ? 29 : 28; // Feb
      case 3:  return 31; // Mar
      case 4:  return 30; // Apr
      case 5:  return 31; // May
      case 6:  return 30; // Jun
      case 7:  return 31; // Jul
      case 8:  return 31; // Aug
      case 9:  return 30; // Sep
      case 10: return 31; // Oct
      case 11: return 30; // Nov
      case 12: return 31; // Dec
      default: return 0;
    }
  }

  /**
   * Validates if the given year, month, day form a legal calendar date.
   */
  public static isValid(year: number, month: number, day: number): boolean {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return false;
    }
    if (year < 1 || year > 9999) {
      return false;
    }
    if (month < 1 || month > 12) {
      return false;
    }
    const maxDays = UniverseDate.daysInMonth(year, month);
    return day >= 1 && day <= maxDays;
  }

  /**
   * Factory constructor: creates a validated UniverseDate instance.
   */
  public static create(year: number, month: number, day: number): Result<UniverseDate> {
    if (!UniverseDate.isValid(year, month, day)) {
      return failure(
        EngineErrorCode.INVALID_DATE,
        `Invalid calendar date: year=${year}, month=${month}, day=${day}. Check month range (1-12) and day boundaries.`
      );
    }
    return success(new UniverseDate(year, month, day));
  }

  /**
   * Parses an explicit canonical ISO date string: YYYY-MM-DD.
   * Rejects locale-dependent or ambiguous strings (e.g. DD/MM/YYYY, MM-DD-YYYY).
   */
  public static parse(dateString: string): Result<UniverseDate> {
    if (typeof dateString !== 'string') {
      return failure(EngineErrorCode.INVALID_DATE, 'Date string must be a non-empty string');
    }

    const trimmed = dateString.trim();
    const regex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    const match = trimmed.match(regex);

    if (!match) {
      return failure(
        EngineErrorCode.INVALID_DATE,
        `Date string "${dateString}" does not match canonical format YYYY-MM-DD`
      );
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    return UniverseDate.create(year, month, day);
  }

  /**
   * Deterministic comparison between two UniverseDates.
   * Returns:
   *   -1 if this < other
   *    0 if this == other
   *    1 if this > other
   */
  public compare(other: UniverseDate): number {
    if (this.year !== other.year) {
      return this.year < other.year ? -1 : 1;
    }
    if (this.month !== other.month) {
      return this.month < other.month ? -1 : 1;
    }
    if (this.day !== other.day) {
      return this.day < other.day ? -1 : 1;
    }
    return 0;
  }

  public equals(other: UniverseDate): boolean {
    return this.compare(other) === 0;
  }

  public isBefore(other: UniverseDate): boolean {
    return this.compare(other) < 0;
  }

  public isAfter(other: UniverseDate): boolean {
    return this.compare(other) > 0;
  }

  /**
   * Advances (or rewinds if negative) this date by a specified number of days,
   * correctly crossing month and year boundaries.
   */
  public advanceDays(days: number): UniverseDate {
    if (days === 0) return this;

    let y = this.year;
    let m = this.month;
    let d = this.day;

    let remaining = days;

    if (remaining > 0) {
      while (remaining > 0) {
        const daysInCurrentMonth = UniverseDate.daysInMonth(y, m);
        const daysLeftInMonth = daysInCurrentMonth - d;

        if (remaining <= daysLeftInMonth) {
          d += remaining;
          remaining = 0;
        } else {
          remaining -= (daysLeftInMonth + 1);
          d = 1;
          m += 1;
          if (m > 12) {
            m = 1;
            y += 1;
          }
        }
      }
    } else {
      while (remaining < 0) {
        if (d + remaining >= 1) {
          d += remaining;
          remaining = 0;
        } else {
          remaining += d;
          m -= 1;
          if (m < 1) {
            m = 12;
            y -= 1;
          }
          d = UniverseDate.daysInMonth(y, m);
        }
      }
    }

    return new UniverseDate(y, m, d);
  }

  /**
   * Calculates the exact integer day difference: (this - other).
   * Positive if this > other, negative if this < other.
   */
  public diffDays(other: UniverseDate): number {
    const toJulianDayNumber = (y: number, m: number, d: number): number => {
      const a = Math.floor((14 - m) / 12);
      const y1 = y + 4800 - a;
      const m1 = m + 12 * a - 3;
      return (
        d +
        Math.floor((153 * m1 + 2) / 5) +
        365 * y1 +
        Math.floor(y1 / 4) -
        Math.floor(y1 / 100) +
        Math.floor(y1 / 400) -
        32045
      );
    };

    const jdnThis = toJulianDayNumber(this.year, this.month, this.day);
    const jdnOther = toJulianDayNumber(other.year, other.month, other.day);
    return jdnThis - jdnOther;
  }

  /**
   * Returns canonical string representation: YYYY-MM-DD.
   */
  public toString(): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const yPad = (y: number) => {
      const s = String(y);
      return '0000'.substring(0, 4 - s.length) + s;
    };
    return `${yPad(this.year)}-${pad(this.month)}-${pad(this.day)}`;
  }

  public toJSON(): UniverseDateData {
    return {
      year: this.year,
      month: this.month,
      day: this.day
    };
  }

  public toCanonical(): string {
    return this.toString();
  }
}
