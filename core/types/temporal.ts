/**
 * Phase 3: Core Temporal Engine Types, Enums, and Result Definitions.
 * Strictly deterministic, immutable, and decoupled from runtime machine time.
 */

import { TemporalID } from './identifiers.ts';
import { ResultStatus } from './result.ts';

/**
 * Precision level of temporal values.
 * Must never silently coerce DATE into DATETIME.
 */
export enum TimePrecision {
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TIME_POINT = 'TIME_POINT',
  TIME_RANGE = 'TIME_RANGE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Deterministic temporal relation between two points, intervals, or references.
 */
export enum TemporalRelation {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
  SAME_TIME = 'SAME_TIME',
  OVERLAPS = 'OVERLAPS',
  CONTAINS = 'CONTAINS',
  DURING = 'DURING',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Relative temporal position with respect to a reference (e.g. UniverseClock).
 */
export enum TemporalPosition {
  PAST = 'PAST',
  PRESENT = 'PRESENT',
  FUTURE = 'FUTURE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Epistemic or ontological status of a temporal assertion.
 * Strictly independent of TemporalPosition (e.g. FUTURE + PLAN, PAST + MEMORY).
 */
export enum TemporalStatus {
  ACTUAL = 'ACTUAL',
  MEMORY = 'MEMORY',
  REPORT = 'REPORT',
  IMAGINED = 'IMAGINED',
  HYPOTHETICAL = 'HYPOTHETICAL',
  PLAN = 'PLAN',
  PREDICTION = 'PREDICTION',
  POSSIBILITY = 'POSSIBILITY',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Supported temporal constraints for deterministic validation without LLM.
 */
export enum TemporalConstraintType {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
  SAME_TIME = 'SAME_TIME',
  WITHIN_RANGE = 'WITHIN_RANGE',
  DURING = 'DURING',
  NOT_BEFORE = 'NOT_BEFORE',
  NOT_AFTER = 'NOT_AFTER'
}

/**
 * Canonical calendar date representation (Proleptic Gregorian Calendar).
 */
export interface UniverseDateData {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

/**
 * Time of day representation within a 24-hour cycle.
 */
export interface TimeOfDayData {
  hour: number;        // 0-23
  minute: number;      // 0-59
  second: number;      // 0-59
  millisecond?: number; // 0-999
}

/**
 * TimePoint data structure.
 */
export interface TimePointData {
  id?: TemporalID | string;
  date?: UniverseDateData | string;
  timeOfDay?: TimeOfDayData;
  precision: TimePrecision;
  zone?: string;
  isUnknown?: boolean;
}

/**
 * Duration data structure with explicit calendar and time units.
 * Calendar months/years are preserved as calendar units rather than fixed seconds.
 */
export interface DurationData {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

/**
 * Time interval representation supporting closed and open-ended boundaries.
 */
export interface TimeIntervalData {
  id?: TemporalID | string;
  start?: TimePointData | null;
  end?: TimePointData | null;
  startInclusive?: boolean;
  endInclusive?: boolean;
  duration?: DurationData;
  precision?: TimePrecision;
}

/**
 * Explicit ambiguous temporal value holding candidate values without guessing.
 */
export interface AmbiguousTemporalData {
  candidates: (TimePointData | TimeIntervalData)[];
  source?: string;
  precision: TimePrecision;
  unresolved: boolean;
}

/**
 * Generic temporal dependency specification between two temporal items.
 */
export interface TemporalDependency {
  dependencyId?: string;
  sourceId: string;
  targetId: string;
  relation: TemporalRelation;
  description?: string;
}

/**
 * Generic temporal constraint definition.
 */
export interface TemporalConstraint {
  constraintId?: string;
  type: TemporalConstraintType;
  target: TimePointData | TimeIntervalData | string;
  reference?: TimePointData | TimeIntervalData | string;
  range?: TimeIntervalData;
  description?: string;
}

/**
 * Generic temporal audit trace entry.
 * ENGINE_TIME (execution timestamp) is explicitly separate from UNIVERSE_TIME.
 */
export interface TemporalTrace {
  operation: string;
  previousUniverseTime?: string | Record<string, unknown>;
  newUniverseTime?: string | Record<string, unknown>;
  engineExecutionTimestamp: number; // Real engine execution time (metadata only)
  source?: string;
  reason?: string;
  result: string;
  success: boolean;
}

/**
 * Generic classification statuses for temporal validation and queries.
 */
export type TemporalValidationStatus =
  | 'VALID'
  | 'INVALID'
  | 'CONFLICT'
  | 'REVIEW_REQUIRED'
  | 'BLOCKED'
  | 'UNKNOWN';

export interface TemporalComparisonResult {
  relation: TemporalRelation;
  differenceDays?: number;
  differenceSeconds?: number;
  details?: string;
}

export interface TemporalPositionResult {
  position: TemporalPosition;
  target: string;
  reference: string;
  reason?: string;
}

export interface TemporalValidationFinding {
  code: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  source?: string;
}

export interface TemporalValidationResult {
  status: TemporalValidationStatus;
  valid: boolean;
  findings: TemporalValidationFinding[];
  repaired: false; // Invariant: strict no retroactive repair
}

export interface TemporalAdvanceResult {
  status: ResultStatus;
  previousTime: TimePointData;
  currentTime: TimePointData;
  trace: TemporalTrace;
  error?: string;
}

export interface TemporalConstraintResult {
  status: TemporalValidationStatus;
  satisfied: boolean;
  constraint: TemporalConstraint;
  reason?: string;
}

export interface TemporalOrderResult<T = unknown> {
  ordered: T[];
  simultaneousGroups: T[][];
  overlappingGroups: T[][];
  unresolved: T[];
  isFullyOrdered: boolean;
}
