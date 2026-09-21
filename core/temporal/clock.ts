/**
 * UniverseClock Abstraction.
 * Explicit, deterministic manager of Universe Time.
 * Strictly decoupled from system machine time.
 * All mutations produce immutable audit traces.
 */

import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { TemporalTrace } from '../types/temporal.ts';
import { TimePoint } from './time-point.ts';
import { Duration } from './duration.ts';

export class UniverseClock {
  private currentTime: TimePoint;
  private readonly history: TemporalTrace[] = [];

  private constructor(initialTime: TimePoint) {
    this.currentTime = initialTime;
    this.recordTrace({
      operation: 'INITIALIZE_CLOCK',
      previousUniverseTime: undefined,
      newUniverseTime: initialTime.toCanonical(),
      engineExecutionTimestamp: Date.now(),
      source: 'UniverseClock.create',
      reason: 'Clock initialized with initial Universe Time',
      result: 'SUCCESS',
      success: true
    });
  }

  /**
   * Initializes a new UniverseClock with a validated TimePoint.
   */
  public static create(initialTime: TimePoint): Result<UniverseClock> {
    if (initialTime.isUnknown || !initialTime.date) {
      return failure(
        EngineErrorCode.INVALID_TIME_POINT,
        'UniverseClock cannot be initialized with an UNKNOWN or dateless TimePoint'
      );
    }
    return success(new UniverseClock(initialTime));
  }

  /**
   * Pure read operation: returns the current Universe Time.
   * GUARANTEE: Never mutates clock state.
   */
  public readCurrentTime(): TimePoint {
    return this.currentTime;
  }

  /**
   * Advances Universe Time forward by an explicit duration.
   * Day, month, and year boundaries are crossed deterministically.
   */
  public advanceTime(duration: Duration, reason = 'Deterministic temporal advancement'): Result<TimePoint> {
    if (duration.isZero()) {
      return success(this.currentTime);
    }

    const previousCanonical = this.currentTime.toCanonical();
    const advanced = this.currentTime.advance(duration);

    this.currentTime = advanced;

    this.recordTrace({
      operation: 'ADVANCE_TIME',
      previousUniverseTime: previousCanonical,
      newUniverseTime: advanced.toCanonical(),
      engineExecutionTimestamp: Date.now(),
      source: 'UniverseClock.advanceTime',
      reason: `${reason} (${duration.toString()})`,
      result: 'SUCCESS',
      success: true
    });

    return success(this.currentTime);
  }

  /**
   * Explicitly sets Universe Time to a new TimePoint.
   * Rejects retrograde (backward in time) movement unless allowRetrograde = true.
   */
  public setTime(
    newTime: TimePoint,
    reason = 'Manual temporal jump',
    allowRetrograde = false
  ): Result<TimePoint> {
    if (newTime.isUnknown || !newTime.date) {
      this.recordTrace({
        operation: 'SET_TIME',
        previousUniverseTime: this.currentTime.toCanonical(),
        newUniverseTime: 'UNKNOWN',
        engineExecutionTimestamp: Date.now(),
        source: 'UniverseClock.setTime',
        reason: 'Attempted to set clock to unknown TimePoint',
        result: 'REJECTED_UNKNOWN',
        success: false
      });
      return failure(
        EngineErrorCode.INVALID_TIME_POINT,
        'Cannot set UniverseClock to an unknown or invalid TimePoint'
      );
    }

    const comp = newTime.compare(this.currentTime);
    if (!allowRetrograde && comp !== null && comp < 0) {
      this.recordTrace({
        operation: 'SET_TIME',
        previousUniverseTime: this.currentTime.toCanonical(),
        newUniverseTime: newTime.toCanonical(),
        engineExecutionTimestamp: Date.now(),
        source: 'UniverseClock.setTime',
        reason: 'Retrograde temporal jump rejected',
        result: 'REJECTED_RETROGRADE',
        success: false
      });
      return failure(
        EngineErrorCode.CLOCK_RETROGRADE_REJECTED,
        `Retrograde temporal movement rejected: target (${newTime.toCanonical()}) is before current (${this.currentTime.toCanonical()})`
      );
    }

    const previousCanonical = this.currentTime.toCanonical();
    this.currentTime = newTime;

    this.recordTrace({
      operation: 'SET_TIME',
      previousUniverseTime: previousCanonical,
      newUniverseTime: newTime.toCanonical(),
      engineExecutionTimestamp: Date.now(),
      source: 'UniverseClock.setTime',
      reason,
      result: 'SUCCESS',
      success: true
    });

    return success(this.currentTime);
  }

  /**
   * Validates if a TimePoint is valid within this clock's current temporal universe context.
   */
  public validateTime(timePoint: TimePoint): Result<boolean> {
    if (timePoint.isUnknown || !timePoint.date) {
      return failure(EngineErrorCode.INVALID_TIME_POINT, 'TimePoint is invalid or unknown');
    }
    return success(true);
  }

  /**
   * Returns immutable audit trail of clock transitions.
   */
  public getHistory(): ReadonlyArray<TemporalTrace> {
    return Object.freeze([...this.history]);
  }

  public getTraceCount(): number {
    return this.history.length;
  }

  private recordTrace(trace: TemporalTrace): void {
    this.history.push(Object.freeze({ ...trace }));
  }
}
