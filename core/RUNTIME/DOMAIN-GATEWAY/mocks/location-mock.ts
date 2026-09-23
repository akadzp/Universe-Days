/**
 * Phase 7: Mock Location Domain Adapter
 *
 * Deterministic, abstract mock implementation for testing Location domain integration.
 * Authoritative Owner: LOCATION_SYSTEM
 * Domain ID: LOCATION
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../../SHARED/result.ts';
import {
  DomainPort,
  DomainQueryRequest,
  DomainQueryResult,
  DomainChangeRequest,
  DomainChangeResult,
  DomainResultType,
  DomainValidationResult,
  DomainConflictResolutionRequest,
  DomainConflictResolutionResult,
  DomainTraceRecord
} from '../contracts/common.ts';
import {
  LOCATION_DOMAIN_ID,
  LOCATION_OWNER_ID,
  LocationType,
  LocationOperation,
  LocationDetailsRef,
  LocationOccupancyRef,
  LocationAvailabilityRef,
  LocationTransitionPayload
} from '../contracts/location.ts';

export class MockLocationDomainAdapter implements DomainPort {
  public readonly domainId: DomainID = LOCATION_DOMAIN_ID;
  public readonly ownerId: SystemID = LOCATION_OWNER_ID;
  public readonly version: string = '1.0.0-mock';
  public readonly supportedOperations: readonly string[] = Object.values(LocationOperation);

  private traces: DomainTraceRecord[] = [];
  private locations: Map<string, LocationDetailsRef> = new Map([
    [
      'LOC_ABSTRACT_01',
      {
        locationId: 'LOC_ABSTRACT_01',
        name: 'Abstract Physical Zone 1',
        locationType: LocationType.PHYSICAL,
        status: 'ACCESSIBLE',
        capacity: 10,
        lastUpdated: '2024-01-01T08:00:00Z'
      }
    ],
    [
      'LOC_ABSTRACT_CONCEPTUAL',
      {
        locationId: 'LOC_ABSTRACT_CONCEPTUAL',
        name: 'Abstract Conceptual Nexus',
        locationType: LocationType.CONCEPTUAL,
        status: 'RESTRICTED',
        capacity: 1,
        lastUpdated: '2024-01-01T08:00:00Z'
      }
    ]
  ]);

  private occupancies: Map<string, string[]> = new Map([
    ['LOC_ABSTRACT_01', ['CHAR_ABSTRACT_01']]
  ]);

  public query(request: DomainQueryRequest): Result<DomainQueryResult> {
    const locId = request.entityReference || (request.filter as { locationId?: string })?.locationId || 'LOC_ABSTRACT_01';
    const locData = this.locations.get(locId);

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 1,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_LOC_QUERY`
    };

    switch (request.operation) {
      case LocationOperation.GET_OCCUPANCY_REF: {
        const occ = this.occupancies.get(locId) || [];
        const occRef: LocationOccupancyRef = {
          locationId: locId,
          occupantEntityRefs: [...occ],
          containedObjectRefs: ['OBJ_ABSTRACT_01'],
          occupancyCount: occ.length
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: occRef,
          status: DomainResultType.ACCEPTED
        });
      }

      case LocationOperation.GET_AVAILABILITY: {
        const avail: LocationAvailabilityRef = {
          locationId: locId,
          isAccessible: locData?.status === 'ACCESSIBLE',
          lockStatus: locData?.status === 'ACCESSIBLE' ? 'UNLOCKED' : 'LOCKED'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: avail,
          status: DomainResultType.ACCEPTED
        });
      }

      default: {
        const details: LocationDetailsRef = locData || {
          locationId: locId,
          name: `Location ${locId}`,
          locationType: (request.filter as { locationType?: LocationType })?.locationType || LocationType.PHYSICAL,
          status: 'ACCESSIBLE',
          capacity: 5,
          lastUpdated: '2024-01-01T08:00:00Z'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: details,
          status: DomainResultType.ACCEPTED
        });
      }
    }
  }

  public validate(request: DomainChangeRequest | DomainQueryRequest): Result<DomainValidationResult> {
    const op = request.operation;
    if (!this.supportedOperations.includes(op)) {
      return success({
        valid: false,
        domain: this.domainId,
        owner: this.ownerId,
        status: 'INVALID',
        reasons: [`Operation "${op}" is not supported by Location Domain.`]
      });
    }

    if (request.entityReference && !request.entityReference.startsWith('LOC_')) {
      return success({
        valid: false,
        domain: this.domainId,
        owner: this.ownerId,
        status: 'INVALID',
        reasons: [`Invalid entity reference "${request.entityReference}". Location IDs must start with "LOC_".`]
      });
    }

    return success({
      valid: true,
      domain: this.domainId,
      owner: this.ownerId,
      status: 'VALID',
      reasons: []
    });
  }

  public requestChange(request: DomainChangeRequest): Result<DomainChangeResult> {
    const payload = request.payload as LocationTransitionPayload;
    const locId = payload?.locationId || request.entityReference || 'LOC_ABSTRACT_01';

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 2,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_LOC_REQ`
    };

    if (payload?.targetLockStatus === 'SEALED') {
      return success({
        requestId: request.requestId,
        domain: this.domainId,
        owner: this.ownerId,
        version: versionMeta,
        resultType: DomainResultType.BLOCKED,
        reason: 'Location transition blocked: cannot seal root location node.'
      });
    }

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: versionMeta,
      resultType: DomainResultType.ACCEPTED,
      data: {
        locationId: locId,
        name: 'Abstract Physical Zone 1',
        locationType: LocationType.PHYSICAL,
        status: (payload?.targetLockStatus === 'LOCKED' ? 'LOCKED' : 'ACCESSIBLE') as any,
        capacity: 10,
        lastUpdated: '2024-01-01T12:00:00Z'
      },
      reason: 'Location change request accepted by owner.'
    });
  }

  public applyChange(request: DomainChangeRequest): Result<DomainChangeResult> {
    const payload = request.payload as LocationTransitionPayload;
    const locId = payload?.locationId || request.entityReference || 'LOC_ABSTRACT_01';

    const current = this.locations.get(locId) || {
      locationId: locId,
      name: 'Abstract Physical Zone 1',
      locationType: LocationType.PHYSICAL,
      status: 'ACCESSIBLE',
      capacity: 10,
      lastUpdated: '2024-01-01T08:00:00Z'
    };

    const updated: LocationDetailsRef = {
      ...current,
      status: (payload?.targetLockStatus === 'LOCKED' ? 'LOCKED' : 'ACCESSIBLE') as any,
      lastUpdated: '2024-01-01T12:00:00Z'
    };
    this.locations.set(locId, updated);

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: {
        domainVersion: this.version,
        entityVersion: 3,
        requestId: request.requestId,
        correlationId: request.correlationId,
        traceId: `${request.requestId}_LOC_APPLY`
      },
      resultType: DomainResultType.APPLIED,
      data: updated,
      reason: 'Location mutation authoritatively applied by owner.'
    });
  }

  public resolveConflict(request: DomainConflictResolutionRequest): Result<DomainConflictResolutionResult> {
    return success({
      conflictId: request.conflictId,
      status: 'RESOLVED',
      revalidationRequired: true,
      resolutionSummary: `Location Domain Owner resolved conflict with decision: ${request.resolutionDecision}`
    });
  }

  public getTraces(): DomainTraceRecord[] {
    return [...this.traces];
  }

  public recordTrace(trace: DomainTraceRecord): void {
    this.traces.push(trace);
  }
}
