/**
 * Temporal Position Classifier.
 * Classifies target (TimePoint or TimeInterval) relative to a reference (UniverseClock or reference TimePoint)
 * into PAST, PRESENT, FUTURE, or UNKNOWN.
 * Strictly independent of TemporalStatus.
 */

import { TemporalPosition, TemporalPositionResult } from '../types/temporal.ts';
import { TimePoint } from './time-point.ts';
import { TimeInterval } from './time-interval.ts';
import { UniverseClock } from './clock.ts';

export class TemporalPositionClassifier {
  /**
   * Evaluates the relative position of a TimePoint or TimeInterval against a reference clock/point.
   */
  public static classify(
    target: TimePoint | TimeInterval,
    reference: TimePoint | UniverseClock
  ): TemporalPositionResult {
    const refPoint = reference instanceof UniverseClock ? reference.readCurrentTime() : reference;

    if (refPoint.isUnknown) {
      return {
        position: TemporalPosition.UNKNOWN,
        target: target.toString(),
        reference: refPoint.toCanonical(),
        reason: 'Reference TimePoint is UNKNOWN'
      };
    }

    // Target is a TimePoint
    if (target instanceof TimePoint) {
      if (target.isUnknown) {
        return {
          position: TemporalPosition.UNKNOWN,
          target: target.toCanonical(),
          reference: refPoint.toCanonical(),
          reason: 'Target TimePoint is UNKNOWN'
        };
      }

      const comp = target.compare(refPoint);
      if (comp === null) {
        return {
          position: TemporalPosition.UNKNOWN,
          target: target.toCanonical(),
          reference: refPoint.toCanonical(),
          reason: 'Comparison between target and reference is indeterminate'
        };
      }

      if (comp < 0) {
        return {
          position: TemporalPosition.PAST,
          target: target.toCanonical(),
          reference: refPoint.toCanonical()
        };
      }
      if (comp > 0) {
        return {
          position: TemporalPosition.FUTURE,
          target: target.toCanonical(),
          reference: refPoint.toCanonical()
        };
      }
      return {
        position: TemporalPosition.PRESENT,
        target: target.toCanonical(),
        reference: refPoint.toCanonical()
      };
    }

    // Target is a TimeInterval
    const interval = target;
    const contains = interval.containsPoint(refPoint);

    if (contains === true) {
      return {
        position: TemporalPosition.PRESENT,
        target: interval.toString(),
        reference: refPoint.toCanonical(),
        reason: 'Reference point is contained within target interval'
      };
    }

    if (interval.end && !interval.end.isUnknown) {
      const compEnd = interval.end.compare(refPoint);
      if (compEnd !== null && compEnd < 0) {
        return {
          position: TemporalPosition.PAST,
          target: interval.toString(),
          reference: refPoint.toCanonical(),
          reason: 'Target interval is entirely before reference'
        };
      }
    }

    if (interval.start && !interval.start.isUnknown) {
      const compStart = interval.start.compare(refPoint);
      if (compStart !== null && compStart > 0) {
        return {
          position: TemporalPosition.FUTURE,
          target: interval.toString(),
          reference: refPoint.toCanonical(),
          reason: 'Target interval is entirely after reference'
        };
      }
    }

    return {
      position: TemporalPosition.UNKNOWN,
      target: interval.toString(),
      reference: refPoint.toCanonical(),
      reason: 'Interval boundaries are open or insufficient to determine position'
    };
  }
}
