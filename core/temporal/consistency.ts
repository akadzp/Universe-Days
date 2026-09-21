/**
 * Temporal Consistency Validator.
 * Deterministically audits temporal assertions, intervals, dependencies, and transitions.
 * STRICT INVARIANT: Never attempts retroactive repair. Flags CONFLICT, BLOCKED, or REVIEW_REQUIRED.
 */

import {
  TemporalValidationResult,
  TemporalValidationFinding,
  TemporalRelation,
  TemporalDependency
} from '../types/temporal.ts';
import { TimePoint } from './time-point.ts';
import { TimeInterval } from './time-interval.ts';
import { UniverseDate } from './date.ts';
import { TemporalRelationEngine } from './relations.ts';

export class TemporalConsistencyValidator {
  /**
   * Audits a TimeInterval for internal consistency (e.g. start <= end, valid dates).
   */
  public static validateInterval(interval: TimeInterval): TemporalValidationResult {
    const findings: TemporalValidationFinding[] = [];

    // Check boundary dates
    if (interval.start && interval.start.date) {
      if (!UniverseDate.isValid(interval.start.date.year, interval.start.date.month, interval.start.date.day)) {
        findings.push({
          code: 'INVALID_START_DATE',
          message: `Start date ${interval.start.date.toCanonical()} is not a valid Gregorian calendar date.`,
          severity: 'CRITICAL'
        });
      }
    }

    if (interval.end && interval.end.date) {
      if (!UniverseDate.isValid(interval.end.date.year, interval.end.date.month, interval.end.date.day)) {
        findings.push({
          code: 'INVALID_END_DATE',
          message: `End date ${interval.end.date.toCanonical()} is not a valid Gregorian calendar date.`,
          severity: 'CRITICAL'
        });
      }
    }

    // Check interval direction
    if (interval.start && interval.end && !interval.start.isUnknown && !interval.end.isUnknown) {
      const comp = interval.start.compare(interval.end);
      if (comp !== null && comp > 0) {
        findings.push({
          code: 'REVERSED_INTERVAL',
          message: `Reversed interval detected: start (${interval.start.toCanonical()}) is strictly after end (${interval.end.toCanonical()}).`,
          severity: 'CRITICAL'
        });
      }
    }

    const hasCritical = findings.some(f => f.severity === 'CRITICAL');
    return {
      status: hasCritical ? 'CONFLICT' : 'VALID',
      valid: !hasCritical,
      findings,
      repaired: false
    };
  }

  /**
   * Audits a set of temporal dependencies for contradictions or cyclic conflicts.
   */
  public static validateDependencies(
    dependencies: TemporalDependency[],
    entities: Record<string, TimePoint | TimeInterval>
  ): TemporalValidationResult {
    const findings: TemporalValidationFinding[] = [];

    for (const dep of dependencies) {
      const source = entities[dep.sourceId];
      const target = entities[dep.targetId];

      if (!source || !target) {
        findings.push({
          code: 'MISSING_TEMPORAL_ENTITY',
          message: `Dependency target or source missing: sourceId=${dep.sourceId}, targetId=${dep.targetId}`,
          severity: 'HIGH',
          source: dep.sourceId
        });
        continue;
      }

      // Evaluate relation
      let actualRelation: TemporalRelation;
      if (source instanceof TimePoint && target instanceof TimePoint) {
        actualRelation = TemporalRelationEngine.compareTimePoints(source, target);
      } else if (source instanceof TimeInterval && target instanceof TimeInterval) {
        actualRelation = TemporalRelationEngine.compareIntervals(source, target);
      } else if (source instanceof TimePoint && target instanceof TimeInterval) {
        actualRelation = TemporalRelationEngine.comparePointToInterval(source, target);
      } else {
        actualRelation = TemporalRelationEngine.comparePointToInterval(
          target as TimePoint,
          source as TimeInterval
        );
      }

      if (actualRelation === TemporalRelation.UNKNOWN) {
        findings.push({
          code: 'INDETERMINATE_DEPENDENCY',
          message: `Temporal dependency between ${dep.sourceId} and ${dep.targetId} cannot be verified due to incomplete boundaries.`,
          severity: 'MEDIUM',
          source: dep.sourceId
        });
      } else if (actualRelation !== dep.relation) {
        findings.push({
          code: 'TEMPORAL_CONTRADICTION',
          message: `Contradiction: expected ${dep.sourceId} to be ${dep.relation} ${dep.targetId}, but observed ${actualRelation}.`,
          severity: 'CRITICAL',
          source: dep.sourceId
        });
      }
    }

    const hasCritical = findings.some(f => f.severity === 'CRITICAL');
    const hasHigh = findings.some(f => f.severity === 'HIGH');
    const hasMedium = findings.some(f => f.severity === 'MEDIUM');

    let status: TemporalValidationResult['status'] = 'VALID';
    if (hasCritical) {
      status = 'CONFLICT';
    } else if (hasHigh) {
      status = 'BLOCKED';
    } else if (hasMedium) {
      status = 'REVIEW_REQUIRED';
    }

    return {
      status,
      valid: !hasCritical && !hasHigh,
      findings,
      repaired: false
    };
  }
}
