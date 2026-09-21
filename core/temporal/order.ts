/**
 * Temporal Order Evaluator.
 * Deterministically orders items with temporal references.
 * Groups simultaneous and overlapping items.
 * Separates unresolved / unknown items without guessing.
 */

import { TemporalRelation, TemporalOrderResult } from '../types/temporal.ts';
import { TimePoint } from './time-point.ts';
import { TimeInterval } from './time-interval.ts';
import { TemporalRelationEngine } from './relations.ts';

export interface HasTemporalRef {
  temporal: TimePoint | TimeInterval;
  id?: string;
}

export class TemporalOrderEngine {
  /**
   * Evaluates order across a collection of items with temporal coordinates.
   */
  public static order<T extends HasTemporalRef>(items: T[]): TemporalOrderResult<T> {
    const unresolved: T[] = [];
    const resolvable: T[] = [];

    // 1. Separate items with completely unknown or unresolvable temporal coordinates
    for (const item of items) {
      const t = item.temporal;
      if (t instanceof TimePoint) {
        if (t.isUnknown || !t.date) {
          unresolved.push(item);
        } else {
          resolvable.push(item);
        }
      } else if (t instanceof TimeInterval) {
        if (!t.start || t.start.isUnknown) {
          unresolved.push(item);
        } else {
          resolvable.push(item);
        }
      } else {
        unresolved.push(item);
      }
    }

    // 2. Sort resolvable items using safe comparator
    const sorted = [...resolvable].sort((a, b) => {
      const getStartPoint = (t: TimePoint | TimeInterval): TimePoint =>
        t instanceof TimePoint ? t : t.start!;

      const ptA = getStartPoint(a.temporal);
      const ptB = getStartPoint(b.temporal);

      const comp = ptA.compare(ptB);
      return comp !== null ? comp : 0;
    });

    // 3. Group simultaneous items (SAME_TIME)
    const simultaneousGroups: T[][] = [];
    const processedSimultaneous = new Set<T>();

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (processedSimultaneous.has(current)) continue;

      const group: T[] = [current];
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        if (processedSimultaneous.has(next)) continue;

        let rel: TemporalRelation;
        if (current.temporal instanceof TimePoint && next.temporal instanceof TimePoint) {
          rel = TemporalRelationEngine.compareTimePoints(current.temporal, next.temporal);
        } else if (current.temporal instanceof TimeInterval && next.temporal instanceof TimeInterval) {
          rel = TemporalRelationEngine.compareIntervals(current.temporal, next.temporal);
        } else if (current.temporal instanceof TimePoint && next.temporal instanceof TimeInterval) {
          rel = TemporalRelationEngine.comparePointToInterval(current.temporal, next.temporal);
        } else {
          rel = TemporalRelationEngine.comparePointToInterval(
            next.temporal as TimePoint,
            current.temporal as TimeInterval
          );
        }

        if (rel === TemporalRelation.SAME_TIME) {
          group.push(next);
          processedSimultaneous.add(next);
        }
      }

      if (group.length > 1) {
        simultaneousGroups.push(group);
      }
    }

    // 4. Group overlapping items
    const overlappingGroups: T[][] = [];
    const intervalItems = sorted.filter(it => it.temporal instanceof TimeInterval);

    for (let i = 0; i < intervalItems.length; i++) {
      const intA = intervalItems[i].temporal as TimeInterval;
      const group: T[] = [intervalItems[i]];

      for (let j = i + 1; j < intervalItems.length; j++) {
        const intB = intervalItems[j].temporal as TimeInterval;
        const rel = TemporalRelationEngine.compareIntervals(intA, intB);
        if (rel === TemporalRelation.OVERLAPS || rel === TemporalRelation.CONTAINS || rel === TemporalRelation.DURING) {
          group.push(intervalItems[j]);
        }
      }

      if (group.length > 1) {
        overlappingGroups.push(group);
      }
    }

    return {
      ordered: sorted,
      simultaneousGroups,
      overlappingGroups,
      unresolved,
      isFullyOrdered: unresolved.length === 0
    };
  }
}
