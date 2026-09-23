/**
 * TimeInterval Domain Abstraction.
 * Supports closed, open-ended, and point intervals.
 * Strictly rejects reversed intervals (where start > end) without auto-repairing.
 */

import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { TimePrecision, TimeIntervalData } from './types.ts';
import { TimePoint } from './time-point.ts';
import { Duration } from './duration.ts';

export class TimeInterval {
  public readonly start?: TimePoint;
  public readonly end?: TimePoint;
  public readonly startInclusive: boolean;
  public readonly endInclusive: boolean;
  public readonly duration?: Duration;
  public readonly precision: TimePrecision;

  private constructor(
    start?: TimePoint,
    end?: TimePoint,
    startInclusive = true,
    endInclusive = true,
    duration?: Duration,
    precision = TimePrecision.TIME_RANGE
  ) {
    this.start = start;
    this.end = end;
    this.startInclusive = startInclusive;
    this.endInclusive = endInclusive;
    this.duration = duration;
    this.precision = precision;
  }

  /**
   * Factory constructor: validates that if both boundaries are known, start <= end.
   * Rejects reversed intervals.
   */
  public static create(
    start?: TimePoint,
    end?: TimePoint,
    startInclusive = true,
    endInclusive = true,
    duration?: Duration
  ): Result<TimeInterval> {
    if (start && end && !start.isUnknown && !end.isUnknown) {
      const comp = start.compare(end);
      if (comp !== null && comp > 0) {
        return failure(
          EngineErrorCode.INVALID_INTERVAL,
          `Reversed interval rejected: start (${start.toCanonical()}) occurs after end (${end.toCanonical()})`
        );
      }
    }

    return success(
      new TimeInterval(
        start,
        end,
        startInclusive,
        endInclusive,
        duration,
        TimePrecision.TIME_RANGE
      )
    );
  }

  /**
   * Creates an open-ended interval starting at a specific point.
   */
  public static fromStart(start: TimePoint, startInclusive = true): Result<TimeInterval> {
    return TimeInterval.create(start, undefined, startInclusive, false);
  }

  /**
   * Creates an open-ended interval ending at a specific point.
   */
  public static toEnd(end: TimePoint, endInclusive = true): Result<TimeInterval> {
    return TimeInterval.create(undefined, end, false, endInclusive);
  }

  /**
   * Creates a degenerate point-interval where start == end.
   */
  public static point(point: TimePoint): Result<TimeInterval> {
    return TimeInterval.create(point, point, true, true);
  }

  /**
   * Returns whether the interval is open-ended on either side.
   */
  public isOpenEnded(): boolean {
    return !this.start || this.start.isUnknown || !this.end || this.end.isUnknown;
  }

  /**
   * Returns whether this interval represents a single instantaneous point.
   */
  public isPointInterval(): boolean {
    if (!this.start || !this.end || this.start.isUnknown || this.end.isUnknown) {
      return false;
    }
    return this.start.equals(this.end);
  }

  /**
   * Evaluates if a given TimePoint falls within this interval.
   * Returns null if indeterminate due to unknown values.
   */
  public containsPoint(point: TimePoint): boolean | null {
    if (point.isUnknown) {
      return null;
    }

    if (this.start && !this.start.isUnknown) {
      const compStart = point.compare(this.start);
      if (compStart === null) return null;
      if (this.startInclusive ? compStart < 0 : compStart <= 0) {
        return false;
      }
    }

    if (this.end && !this.end.isUnknown) {
      const compEnd = point.compare(this.end);
      if (compEnd === null) return null;
      if (this.endInclusive ? compEnd > 0 : compEnd >= 0) {
        return false;
      }
    }

    return true;
  }

  public toJSON(): TimeIntervalData {
    return {
      start: this.start ? this.start.toJSON() : null,
      end: this.end ? this.end.toJSON() : null,
      startInclusive: this.startInclusive,
      endInclusive: this.endInclusive,
      duration: this.duration ? this.duration.toJSON() : undefined,
      precision: this.precision
    };
  }

  public toString(): string {
    const leftBracket = this.startInclusive ? '[' : '(';
    const rightBracket = this.endInclusive ? ']' : ')';
    const startStr = this.start ? this.start.toCanonical() : 'UNKNOWN';
    const endStr = this.end ? this.end.toCanonical() : 'UNKNOWN';
    return `${leftBracket}${startStr} -> ${endStr}${rightBracket}`;
  }
}
