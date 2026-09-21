/**
 * Phase 7: Mock Relationship Domain Adapter
 *
 * Deterministic, abstract mock implementation for testing Relationship domain integration.
 * Authoritative Owner: RELATIONSHIP_SYSTEM
 * Domain ID: RELATIONSHIP
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
  RELATIONSHIP_DOMAIN_ID,
  RELATIONSHIP_OWNER_ID,
  RelationshipOperation,
  RelationshipRef,
  RelationshipStatusRef,
  RelationshipParticipantsRef,
  RelationshipTransitionPayload
} from '../contracts/relationship.ts';

export class MockRelationshipDomainAdapter implements DomainPort {
  public readonly domainId: DomainID = RELATIONSHIP_DOMAIN_ID;
  public readonly ownerId: SystemID = RELATIONSHIP_OWNER_ID;
  public readonly version: string = '1.0.0-mock';
  public readonly supportedOperations: readonly string[] = Object.values(RelationshipOperation);

  private traces: DomainTraceRecord[] = [];
  private relationships: Map<string, RelationshipStatusRef> = new Map([
    [
      'REL_ABSTRACT_01',
      {
        relationshipId: 'REL_ABSTRACT_01',
        participants: ['CHAR_ABSTRACT_01', 'CHAR_ABSTRACT_02'],
        relationType: 'ALLY',
        status: 'ACTIVE',
        affinityLevel: 80,
        trustScore: 75,
        lastUpdated: '2024-01-01T08:00:00Z'
      }
    ]
  ]);

  public query(request: DomainQueryRequest): Result<DomainQueryResult> {
    const relId = request.entityReference || (request.filter as { relationshipId?: string })?.relationshipId || 'REL_ABSTRACT_01';
    const relData = this.relationships.get(relId);

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 1,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_REL_QUERY`
    };

    switch (request.operation) {
      case RelationshipOperation.GET_STATUS: {
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: relData || {
            relationshipId: relId,
            participants: ['CHAR_UNKNOWN_1', 'CHAR_UNKNOWN_2'],
            relationType: 'NEUTRAL',
            status: 'UNKNOWN',
            lastUpdated: '2024-01-01T08:00:00Z'
          },
          status: DomainResultType.ACCEPTED
        });
      }

      case RelationshipOperation.GET_PARTICIPANTS: {
        const parts: RelationshipParticipantsRef = {
          relationshipId: relId,
          participants: relData ? [...relData.participants] : ['CHAR_UNKNOWN_1', 'CHAR_UNKNOWN_2']
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: parts,
          status: DomainResultType.ACCEPTED
        });
      }

      default:
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: {
            relationshipId: relId,
            sourceEntityRef: relData?.participants[0] || 'CHAR_ABSTRACT_01',
            targetEntityRef: relData?.participants[1] || 'CHAR_ABSTRACT_02',
            relationType: relData?.relationType || 'GENERIC'
          },
          status: DomainResultType.ACCEPTED
        });
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
        reasons: [`Operation "${op}" is not supported by Relationship Domain.`]
      });
    }

    if (request.entityReference && !request.entityReference.startsWith('REL_')) {
      return success({
        valid: false,
        domain: this.domainId,
        owner: this.ownerId,
        status: 'INVALID',
        reasons: [`Invalid entity reference "${request.entityReference}". Relationship IDs must start with "REL_".`]
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
    const payload = request.payload as RelationshipTransitionPayload;
    const relId = payload?.relationshipId || request.entityReference || 'REL_ABSTRACT_01';

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 2,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_REL_REQ`
    };

    if (payload?.targetStatus === 'INVALID_BOND') {
      return success({
        requestId: request.requestId,
        domain: this.domainId,
        owner: this.ownerId,
        version: versionMeta,
        resultType: DomainResultType.REJECTED,
        reason: 'Target relationship status rejected by relationship owner invariants.'
      });
    }

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: versionMeta,
      resultType: DomainResultType.ACCEPTED,
      data: {
        relationshipId: relId,
        participants: ['CHAR_ABSTRACT_01', 'CHAR_ABSTRACT_02'],
        relationType: 'ALLY',
        status: (payload?.targetStatus as any) || 'ACTIVE',
        affinityLevel: (80 + (payload?.affinityDelta || 0)),
        lastUpdated: '2024-01-01T12:00:00Z'
      },
      reason: 'Relationship change request accepted by owner.'
    });
  }

  public applyChange(request: DomainChangeRequest): Result<DomainChangeResult> {
    const payload = request.payload as RelationshipTransitionPayload;
    const relId = payload?.relationshipId || request.entityReference || 'REL_ABSTRACT_01';

    const current = this.relationships.get(relId) || {
      relationshipId: relId,
      participants: ['CHAR_ABSTRACT_01', 'CHAR_ABSTRACT_02'],
      relationType: 'ALLY',
      status: 'ACTIVE',
      affinityLevel: 80,
      trustScore: 75,
      lastUpdated: '2024-01-01T08:00:00Z'
    };

    const updated: RelationshipStatusRef = {
      ...current,
      status: (payload?.targetStatus as any) || current.status,
      affinityLevel: (current.affinityLevel || 50) + (payload?.affinityDelta || 0),
      lastUpdated: '2024-01-01T12:00:00Z'
    };
    this.relationships.set(relId, updated);

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: {
        domainVersion: this.version,
        entityVersion: 3,
        requestId: request.requestId,
        correlationId: request.correlationId,
        traceId: `${request.requestId}_REL_APPLY`
      },
      resultType: DomainResultType.APPLIED,
      data: updated,
      reason: 'Relationship mutation authoritatively applied by owner.'
    });
  }

  public resolveConflict(request: DomainConflictResolutionRequest): Result<DomainConflictResolutionResult> {
    return success({
      conflictId: request.conflictId,
      status: 'RESOLVED',
      revalidationRequired: true,
      resolutionSummary: `Relationship Domain Owner resolved conflict with decision: ${request.resolutionDecision}`
    });
  }

  public getTraces(): DomainTraceRecord[] {
    return [...this.traces];
  }

  public recordTrace(trace: DomainTraceRecord): void {
    this.traces.push(trace);
  }
}
