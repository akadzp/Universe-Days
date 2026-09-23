/**
 * Phase 4: Continuity Model.
 * Domain-neutral entity models, identities, statuses, and effective time representations.
 */

import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { TimePoint, TimeInterval, TemporalRelationEngine } from '../../RUNTIME/TEMPORAL';
import { TemporalRelation } from '../../RUNTIME/TEMPORAL/types.ts';
import { ConditionReference } from '../../UNIVERSE/CONTINUITY/condition-reference.ts';

export enum ContinuityStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  SUSPENDED = 'SUSPENDED',
  UNRESOLVED = 'UNRESOLVED',
  UNKNOWN = 'UNKNOWN',
  INVALID = 'INVALID'
}

export interface ContinuityIdentity {
  continuityId: string;
  entityRef: string;
  domainRef: string;
  version: number | string;
  createdAtEngineTime?: number;
}

export class EffectiveTime {
  public readonly point?: TimePoint;
  public readonly interval?: TimeInterval;
  public readonly raw?: string;

  private constructor(point?: TimePoint, interval?: TimeInterval, raw?: string) {
    this.point = point;
    this.interval = interval;
    this.raw = raw;
  }

  public static fromPoint(point: TimePoint): EffectiveTime {
    return new EffectiveTime(point, undefined, point.toString());
  }

  public static fromInterval(interval: TimeInterval): EffectiveTime {
    return new EffectiveTime(undefined, interval, interval.toString());
  }

  public static fromString(isoString: string): Result<EffectiveTime> {
    const parsedPoint = TimePoint.parse(isoString);
    if (parsedPoint.status === 'SUCCESS' && parsedPoint.data) {
      return success(new EffectiveTime(parsedPoint.data, undefined, isoString));
    }
    // Check if it represents an interval with '/' or '->'
    if (isoString.includes('/') || isoString.includes('->')) {
      const parts = isoString.includes('/') ? isoString.split('/') : isoString.split('->');
      const startRes = TimePoint.parse(parts[0].replace(/[[(]/g, '').trim());
      const endRes = TimePoint.parse(parts[1].replace(/[\])]/g, '').trim());
      if (startRes.status === 'SUCCESS' && endRes.status === 'SUCCESS') {
        const intervalRes = TimeInterval.create(startRes.data, endRes.data);
        if (intervalRes.status === 'SUCCESS' && intervalRes.data) {
          return success(new EffectiveTime(undefined, intervalRes.data, isoString));
        }
      }
    }
    return failure(EngineErrorCode.INVALID_TIME_POINT, `Failed to parse effective time: "${isoString}"`);
  }

  public static create(input?: TimePoint | TimeInterval | string | EffectiveTime): EffectiveTime | undefined {
    if (!input) return undefined;
    if (input instanceof EffectiveTime) return input;
    if (input instanceof TimePoint) return EffectiveTime.fromPoint(input);
    if (input instanceof TimeInterval) return EffectiveTime.fromInterval(input);
    if (typeof input === 'string') {
      const parsed = EffectiveTime.fromString(input);
      return parsed.status === 'SUCCESS' ? parsed.data : undefined;
    }
    return undefined;
  }

  /**
   * Compares two EffectiveTimes using the authoritative Phase 3 TemporalRelationEngine.
   */
  public compare(other: EffectiveTime): TemporalRelation {
    const p1 = this.point || (this.interval ? this.interval.start : undefined);
    const p2 = other.point || (other.interval ? other.interval.start : undefined);

    if (this.interval && other.interval) {
      return TemporalRelationEngine.compareIntervals(this.interval, other.interval);
    }

    if (p1 && p2) {
      return TemporalRelationEngine.compareTimePoints(p1, p2);
    }

    return TemporalRelation.UNKNOWN;
  }

  public toString(): string {
    if (this.point) return this.point.toString();
    if (this.interval) return this.interval.toString();
    return this.raw || 'UNKNOWN';
  }
}

export interface RevisionMetadata {
  previousVersion: number | string;
  currentVersion: number | string;
  revisionReference: string;
  revisionTime?: EffectiveTime;
  affectedScope?: string[];
  reason?: string;
}

export interface ContinuityItem {
  identity: ContinuityIdentity;
  status: ContinuityStatus;
  previousConditionRef?: ConditionReference | null;
  currentConditionRef?: ConditionReference | null;
  lastTransitionType?: string;
  effectiveTime?: EffectiveTime;
  revision?: RevisionMetadata;
  metadata?: Record<string, unknown>;
}

export class ContinuityIdentityValidator {
  /**
   * Validates a ContinuityIdentity. Rejects empty strings, derived names, or missing fields.
   */
  public static validate(identity: unknown): Result<ContinuityIdentity> {
    if (!identity || typeof identity !== 'object') {
      return failure(EngineErrorCode.INVALID_CONTINUITY_IDENTITY, 'ContinuityIdentity must be an object');
    }

    const id = identity as Partial<ContinuityIdentity>;

    if (!id.continuityId || typeof id.continuityId !== 'string' || id.continuityId.trim() === '') {
      return failure(EngineErrorCode.INVALID_CONTINUITY_IDENTITY, 'continuityId must be a non-empty string');
    }

    if (!id.entityRef || typeof id.entityRef !== 'string' || id.entityRef.trim() === '') {
      return failure(EngineErrorCode.INVALID_CONTINUITY_IDENTITY, 'entityRef must be a non-empty string');
    }

    if (!id.domainRef || typeof id.domainRef !== 'string' || id.domainRef.trim() === '') {
      return failure(EngineErrorCode.INVALID_CONTINUITY_IDENTITY, 'domainRef must be a non-empty string');
    }

    return success({
      continuityId: id.continuityId.trim(),
      entityRef: id.entityRef.trim(),
      domainRef: id.domainRef.trim(),
      version: id.version ?? 1,
      createdAtEngineTime: id.createdAtEngineTime ?? Date.now()
    });
  }

  /**
   * Checks if two identities are strictly equal (continuityId and entityRef and domainRef match).
   * Do not infer identity from similarity.
   */
  public static areEqual(a?: ContinuityIdentity | null, b?: ContinuityIdentity | null): boolean {
    if (!a || !b) return false;
    return (
      a.continuityId === b.continuityId &&
      a.entityRef === b.entityRef &&
      a.domainRef === b.domainRef
    );
  }

  /**
   * Checks if two identities refer to the same entity in the same domain, even if continuityId differs.
   */
  public static sameEntity(a?: ContinuityIdentity | null, b?: ContinuityIdentity | null): boolean {
    if (!a || !b) return false;
    return a.entityRef === b.entityRef && a.domainRef === b.domainRef;
  }
}
