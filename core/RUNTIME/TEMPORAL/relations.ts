/**
 * Deterministic Temporal Relations Evaluator.
 * Computes relations between TimePoints, TimeIntervals, and references:
 * BEFORE, AFTER, SAME_TIME, OVERLAPS, CONTAINS, DURING, UNKNOWN.
 */

import { TemporalRelation } from './types.ts';
import { TimePoint } from './time-point.ts';
import { TimeInterval } from './time-interval.ts';

export class TemporalRelationEngine {
  /**
   * Evaluates the relationship between two TimePoints:
   *   a < b  -> BEFORE
   *   a > b  -> AFTER
   *   a == b -> SAME_TIME
   *   indeterminate -> UNKNOWN
   */
  public static compareTimePoints(a: TimePoint, b: TimePoint): TemporalRelation {
    if (a.isUnknown || b.isUnknown) {
      return TemporalRelation.UNKNOWN;
    }

    const comp = a.compare(b);
    if (comp === null) {
      return TemporalRelation.UNKNOWN;
    }
    if (comp < 0) return TemporalRelation.BEFORE;
    if (comp > 0) return TemporalRelation.AFTER;
    return TemporalRelation.SAME_TIME;
  }

  /**
   * Evaluates the relationship of a TimePoint relative to a TimeInterval.
   */
  public static comparePointToInterval(point: TimePoint, interval: TimeInterval): TemporalRelation {
    if (point.isUnknown) {
      return TemporalRelation.UNKNOWN;
    }

    // Check if interval is a degenerate point interval
    if (interval.isPointInterval() && interval.start) {
      return TemporalRelationEngine.compareTimePoints(point, interval.start);
    }

    // If point is strictly before interval start
    if (interval.start && !interval.start.isUnknown) {
      const compStart = point.compare(interval.start);
      if (compStart !== null && (interval.startInclusive ? compStart < 0 : compStart <= 0)) {
        return TemporalRelation.BEFORE;
      }
    }

    // If point is strictly after interval end
    if (interval.end && !interval.end.isUnknown) {
      const compEnd = point.compare(interval.end);
      if (compEnd !== null && (interval.endInclusive ? compEnd > 0 : compEnd >= 0)) {
        return TemporalRelation.AFTER;
      }
    }

    // Point falls within interval
    const contains = interval.containsPoint(point);
    if (contains === true) {
      return TemporalRelation.DURING;
    }
    if (contains === false) {
      // If not during and wasn't before/after, could be due to open-ended bounds
      return TemporalRelation.UNKNOWN;
    }

    return TemporalRelation.UNKNOWN;
  }

  /**
   * Evaluates the relationship between two TimeIntervals:
   *   a ends before b starts -> BEFORE
   *   a starts after b ends -> AFTER
   *   identical start and end -> SAME_TIME
   *   a completely encloses b -> CONTAINS
   *   a is completely enclosed by b -> DURING
   *   partial intersection without containment -> OVERLAPS
   *   insufficient/unknown boundaries -> UNKNOWN
   */
  public static compareIntervals(a: TimeInterval, b: TimeInterval): TemporalRelation {
    // Check if either is degenerate point interval
    if (a.isPointInterval() && a.start) {
      return TemporalRelationEngine.comparePointToInterval(a.start, b);
    }

    const aStart = a.start;
    const aEnd = a.end;
    const bStart = b.start;
    const bEnd = b.end;

    // Check BEFORE: a.end < b.start
    if (aEnd && bStart && !aEnd.isUnknown && !bStart.isUnknown) {
      const comp = aEnd.compare(bStart);
      if (comp !== null && comp < 0) {
        return TemporalRelation.BEFORE;
      }
    }

    // Check AFTER: a.start > b.end
    if (aStart && bEnd && !aStart.isUnknown && !bEnd.isUnknown) {
      const comp = aStart.compare(bEnd);
      if (comp !== null && comp > 0) {
        return TemporalRelation.AFTER;
      }
    }

    // If any bound is unknown, we cannot be certain of overlap/contains/during/same_time
    if (!aStart || aStart.isUnknown || !aEnd || aEnd.isUnknown ||
        !bStart || bStart.isUnknown || !bEnd || bEnd.isUnknown) {
      return TemporalRelation.UNKNOWN;
    }

    const compStart = aStart.compare(bStart);
    const compEnd = aEnd.compare(bEnd);

    if (compStart === null || compEnd === null) {
      return TemporalRelation.UNKNOWN;
    }

    // Exact match
    if (compStart === 0 && compEnd === 0) {
      return TemporalRelation.SAME_TIME;
    }

    // a CONTAINS b: a starts on or before b, and a ends on or after b
    if (compStart <= 0 && compEnd >= 0) {
      return TemporalRelation.CONTAINS;
    }

    // a DURING b: a starts on or after b, and a ends on or before b
    if (compStart >= 0 && compEnd <= 0) {
      return TemporalRelation.DURING;
    }

    // OVERLAPS:
    // a starts before b and ends during b (aStart < bStart && aEnd > bStart && aEnd < bEnd)
    // or a starts during b and ends after b (aStart > bStart && aStart < bEnd && aEnd > bEnd)
    const compAEndBStart = aEnd.compare(bStart);
    const compAStartBEnd = aStart.compare(bEnd);

    if (compAEndBStart !== null && compAEndBStart > 0 &&
        compAStartBEnd !== null && compAStartBEnd < 0) {
      return TemporalRelation.OVERLAPS;
    }

    return TemporalRelation.UNKNOWN;
  }
}
