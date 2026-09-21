/**
 * Temporal Query API Facade.
 * Completely pure, deterministic, and side-effect free.
 */

import {
  TemporalRelation,
  TemporalPositionResult,
  TemporalComparisonResult,
  TemporalValidationResult,
  TemporalConstraint,
  TemporalConstraintResult,
  TemporalDependency
} from '../types/temporal.ts';
import { TimePoint } from './time-point.ts';
import { TimeInterval } from './time-interval.ts';
import { UniverseClock } from './clock.ts';
import { TemporalRelationEngine } from './relations.ts';
import { TemporalPositionClassifier } from './position.ts';
import { TemporalConsistencyValidator } from './consistency.ts';
import { TemporalStatusManager } from './status.ts';

export class TemporalQueryAPI {
  /**
   * Returns current Universe Time from clock without mutation.
   */
  public static getCurrentUniverseTime(clock: UniverseClock): TimePoint {
    return clock.readCurrentTime();
  }

  /**
   * Evaluates the relation between two temporal coordinates (TimePoint or TimeInterval).
   */
  public static getTemporalRelation(
    a: TimePoint | TimeInterval,
    b: TimePoint | TimeInterval
  ): TemporalRelation {
    if (a instanceof TimePoint && b instanceof TimePoint) {
      return TemporalRelationEngine.compareTimePoints(a, b);
    }
    if (a instanceof TimeInterval && b instanceof TimeInterval) {
      return TemporalRelationEngine.compareIntervals(a, b);
    }
    if (a instanceof TimePoint && b instanceof TimeInterval) {
      return TemporalRelationEngine.comparePointToInterval(a, b);
    }
    if (a instanceof TimeInterval && b instanceof TimePoint) {
      const inverse = TemporalRelationEngine.comparePointToInterval(b, a);
      if (inverse === TemporalRelation.BEFORE) return TemporalRelation.AFTER;
      if (inverse === TemporalRelation.AFTER) return TemporalRelation.BEFORE;
      if (inverse === TemporalRelation.DURING) return TemporalRelation.CONTAINS;
      return inverse;
    }
    return TemporalRelation.UNKNOWN;
  }

  /**
   * Compares two temporal coordinates and returns structured comparison result.
   */
  public static compareTemporalValues(
    a: TimePoint | TimeInterval,
    b: TimePoint | TimeInterval
  ): TemporalComparisonResult {
    const rel = TemporalQueryAPI.getTemporalRelation(a, b);

    let diffDays: number | undefined;
    if (a instanceof TimePoint && b instanceof TimePoint && a.date && b.date && !a.isUnknown && !b.isUnknown) {
      diffDays = a.date.diffDays(b.date);
    }

    return {
      relation: rel,
      differenceDays: diffDays,
      details: `Relation evaluated: ${rel}`
    };
  }

  /**
   * Evaluates target's relative position (PAST, PRESENT, FUTURE) relative to clock or reference.
   */
  public static getTemporalPosition(
    target: TimePoint | TimeInterval,
    reference: TimePoint | UniverseClock
  ): TemporalPositionResult {
    return TemporalPositionClassifier.classify(target, reference);
  }

  /**
   * Validates internal validity and consistency of a TimeInterval.
   */
  public static validateTemporalRange(interval: TimeInterval): TemporalValidationResult {
    return TemporalConsistencyValidator.validateInterval(interval);
  }

  /**
   * Validates a TemporalConstraint against context targets or clock reference.
   */
  public static validateTemporalConstraint(
    constraint: TemporalConstraint,
    context: {
      clock?: UniverseClock;
      targets?: Record<string, TimePoint | TimeInterval>;
    } = {}
  ): TemporalConstraintResult {
    const resolveItem = (
      item?: unknown
    ): TimePoint | TimeInterval | undefined => {
      if (!item) return undefined;
      if (item instanceof TimePoint || item instanceof TimeInterval) {
        return item;
      }
      if (typeof item === 'string') {
        if (context.targets && context.targets[item]) {
          return context.targets[item];
        }
        const parsed = TimePoint.parse(item);
        return parsed.status === 'SUCCESS' ? parsed.data : undefined;
      }
      return undefined;
    };

    const target = resolveItem(constraint.target);
    const reference = resolveItem(constraint.reference) || (context.clock ? context.clock.readCurrentTime() : undefined);

    if (!target) {
      return {
        status: 'BLOCKED',
        satisfied: false,
        constraint,
        reason: 'Constraint target could not be resolved'
      };
    }

    switch (constraint.type) {
      case 'WITHIN_RANGE': {
        let resolvedRange: TimeInterval | undefined;
        if (constraint.range instanceof TimeInterval) {
          resolvedRange = constraint.range;
        } else if (typeof constraint.range === 'string' && context.targets && context.targets[constraint.range] instanceof TimeInterval) {
          resolvedRange = context.targets[constraint.range] as TimeInterval;
        }

        if (!resolvedRange) {
          return {
            status: 'BLOCKED',
            satisfied: false,
            constraint,
            reason: 'WITHIN_RANGE constraint requires a valid TimeInterval range'
          };
        }
        if (!(target instanceof TimePoint)) {
          return {
            status: 'CONFLICT',
            satisfied: false,
            constraint,
            reason: 'WITHIN_RANGE target must be a TimePoint'
          };
        }
        const contains = resolvedRange.containsPoint(target);
        if (contains === null) {
          return {
            status: 'UNKNOWN',
            satisfied: false,
            constraint,
            reason: 'Range contains unknown boundaries'
          };
        }
        return {
          status: contains ? 'VALID' : 'CONFLICT',
          satisfied: contains,
          constraint,
          reason: contains ? 'Target is within range' : 'Target is outside specified range'
        };
      }

      default: {
        if (!reference) {
          return {
            status: 'BLOCKED',
            satisfied: false,
            constraint,
            reason: 'Constraint reference could not be resolved'
          };
        }

        const relation = TemporalQueryAPI.getTemporalRelation(target, reference);
        if (relation === TemporalRelation.UNKNOWN) {
          return {
            status: 'UNKNOWN',
            satisfied: false,
            constraint,
            reason: 'Relation between target and reference is indeterminate'
          };
        }

        let satisfied = false;
        if (constraint.type === 'BEFORE' && relation === TemporalRelation.BEFORE) satisfied = true;
        if (constraint.type === 'AFTER' && relation === TemporalRelation.AFTER) satisfied = true;
        if (constraint.type === 'SAME_TIME' && relation === TemporalRelation.SAME_TIME) satisfied = true;
        if (constraint.type === 'DURING' && relation === TemporalRelation.DURING) satisfied = true;
        if (constraint.type === 'NOT_BEFORE' && relation !== TemporalRelation.BEFORE) satisfied = true;
        if (constraint.type === 'NOT_AFTER' && relation !== TemporalRelation.AFTER) satisfied = true;

        return {
          status: satisfied ? 'VALID' : 'CONFLICT',
          satisfied,
          constraint,
          reason: satisfied
            ? `Constraint satisfied (${constraint.type} holds: relation is ${relation})`
            : `Constraint violated (expected ${constraint.type}, but observed ${relation})`
        };
      }
    }
  }

  /**
   * Verifies if a status string is a valid TemporalStatus enum value.
   */
  public static isTemporalStatusValid(status: string): boolean {
    return TemporalStatusManager.isValidStatus(status);
  }

  /**
   * Evaluates a set of temporal dependencies across entities.
   */
  public static evaluateTemporalDependency(
    dep: TemporalDependency,
    entities: Record<string, TimePoint | TimeInterval>
  ): TemporalValidationResult {
    return TemporalConsistencyValidator.validateDependencies([dep], entities);
  }
}
