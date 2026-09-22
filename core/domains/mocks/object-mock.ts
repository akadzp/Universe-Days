/**
 * Phase 7: Mock Object Domain Adapter
 *
 * Deterministic, abstract mock implementation for testing Object domain integration.
 * Authoritative Owner: OBJECT_SYSTEM
 * Domain ID: OBJECT
 */

import { DomainID, SystemID, makeDomainID, makeSystemID } from '../../types/identifiers.ts';
import { Result, success, failure } from '../../types/result.ts';
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
  OBJECT_DOMAIN_ID,
  OBJECT_OWNER_ID,
  ObjectOperation,
  ObjectDetailsRef,
  ObjectPossessionRef,
  ObjectLocationRef,
  ObjectTransitionPayload
} from '../contracts/object.ts';

export class MockObjectDomainAdapter implements DomainPort {
  public readonly domainId: DomainID = OBJECT_DOMAIN_ID;
  public readonly ownerId: SystemID = OBJECT_OWNER_ID;
  public readonly version: string = '1.0.0-mock';
  public readonly supportedOperations: readonly string[] = Object.values(ObjectOperation);

  private traces: DomainTraceRecord[] = [];
  private objects: Map<string, ObjectDetailsRef> = new Map([
    [
      'OBJ_ABSTRACT_01',
      {
        objectId: 'OBJ_ABSTRACT_01',
        name: 'Abstract Test Object',
        category: 'ARTIFACT',
        status: 'INTACT',
        ownerEntityRef: 'CHAR_ABSTRACT_01',
        holderEntityRef: 'CHAR_ABSTRACT_01',
        locationRef: 'LOC_ABSTRACT_01',
        lastUpdated: '2024-01-01T08:00:00Z'
      }
    ]
  ]);

  public query(request: DomainQueryRequest): Result<DomainQueryResult> {
    const objId = request.entityReference || (request.filter as { objectId?: string })?.objectId || 'OBJ_ABSTRACT_01';
    const objData = this.objects.get(objId);

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 1,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_OBJ_QUERY`
    };

    switch (request.operation) {
      case ObjectOperation.GET_POSSESSION_REF: {
        const poss: ObjectPossessionRef = {
          objectId: objId,
          legalOwnerRef: objData?.ownerEntityRef,
          currentHolderRef: objData?.holderEntityRef,
          possessionType: objData?.holderEntityRef ? 'HELD' : 'UNCLAIMED'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: poss,
          status: DomainResultType.ACCEPTED
        });
      }

      case ObjectOperation.GET_LOCATION_REF: {
        const loc: ObjectLocationRef = {
          objectId: objId,
          locationRef: objData?.locationRef || 'LOC_UNKNOWN'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: loc,
          status: DomainResultType.ACCEPTED
        });
      }

      case ObjectOperation.GET_OWNER: {
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: { objectId: objId, ownerRef: objData?.ownerEntityRef ?? null },
          status: DomainResultType.ACCEPTED
        });
      }

      case ObjectOperation.GET_USER: {
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: { objectId: objId, userRef: objData?.userEntityRef ?? null },
          status: DomainResultType.ACCEPTED
        });
      }

      case ObjectOperation.GET_WEARER: {
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: { objectId: objId, wearerRef: objData?.wearerEntityRef ?? null },
          status: DomainResultType.ACCEPTED
        });
      }

      case ObjectOperation.GET_OBJECT_RELATIONS: {
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: [],
          status: DomainResultType.ACCEPTED
        });
      }

      case ObjectOperation.RESOLVE_OBJECT_REFERENCE: {
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: { status: 'RESOLVED', matchedObjectId: objId },
          status: DomainResultType.ACCEPTED
        });
      }

      default: {
        const details: ObjectDetailsRef = objData || {
          objectId: objId,
          name: `Object ${objId}`,
          category: 'MISC',
          status: 'INTACT',
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
        reasons: [`Operation "${op}" is not supported by Object Domain.`]
      });
    }

    if (request.entityReference && !request.entityReference.startsWith('OBJ_')) {
      return success({
        valid: false,
        domain: this.domainId,
        owner: this.ownerId,
        status: 'INVALID',
        reasons: [`Invalid entity reference "${request.entityReference}". Object IDs must start with "OBJ_".`]
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
    const payload = request.payload as ObjectTransitionPayload;
    const objId = payload?.objectId || request.entityReference || 'OBJ_ABSTRACT_01';

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 2,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_OBJ_REQ`
    };

    if (payload?.targetStatus === 'DESTROYED_IMPOSSIBLE') {
      return success({
        requestId: request.requestId,
        domain: this.domainId,
        owner: this.ownerId,
        version: versionMeta,
        resultType: DomainResultType.REJECTED,
        reason: 'Object state transition rejected by object owner invariants.'
      });
    }

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: versionMeta,
      resultType: DomainResultType.ACCEPTED,
      data: {
        objectId: objId,
        name: 'Abstract Test Object',
        category: 'ARTIFACT',
        status: (payload?.targetStatus as any) || 'INTACT',
        holderEntityRef: payload?.transferToHolderRef || 'CHAR_ABSTRACT_01',
        locationRef: payload?.transferToLocationRef || 'LOC_ABSTRACT_01',
        lastUpdated: '2024-01-01T12:00:00Z'
      },
      reason: 'Object change request accepted by owner.'
    });
  }

  public applyChange(request: DomainChangeRequest): Result<DomainChangeResult> {
    const payload = request.payload as ObjectTransitionPayload;
    const objId = payload?.objectId || request.entityReference || 'OBJ_ABSTRACT_01';

    const current = this.objects.get(objId) || {
      objectId: objId,
      name: 'Abstract Test Object',
      category: 'ARTIFACT',
      status: 'INTACT',
      ownerEntityRef: 'CHAR_ABSTRACT_01',
      holderEntityRef: 'CHAR_ABSTRACT_01',
      locationRef: 'LOC_ABSTRACT_01',
      lastUpdated: '2024-01-01T08:00:00Z'
    };

    const updated: ObjectDetailsRef = {
      ...current,
      status: (payload?.targetStatus as any) || current.status,
      holderEntityRef: payload?.transferToHolderRef ?? current.holderEntityRef,
      locationRef: payload?.transferToLocationRef ?? current.locationRef,
      lastUpdated: '2024-01-01T12:00:00Z'
    };
    this.objects.set(objId, updated);

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: {
        domainVersion: this.version,
        entityVersion: 3,
        requestId: request.requestId,
        correlationId: request.correlationId,
        traceId: `${request.requestId}_OBJ_APPLY`
      },
      resultType: DomainResultType.APPLIED,
      data: updated,
      reason: 'Object mutation authoritatively applied by owner.'
    });
  }

  public resolveConflict(request: DomainConflictResolutionRequest): Result<DomainConflictResolutionResult> {
    return success({
      conflictId: request.conflictId,
      status: 'RESOLVED',
      revalidationRequired: true,
      resolutionSummary: `Object Domain Owner resolved conflict with decision: ${request.resolutionDecision}`
    });
  }

  public getTraces(): DomainTraceRecord[] {
    return [...this.traces];
  }

  public recordTrace(trace: DomainTraceRecord): void {
    this.traces.push(trace);
  }
}
