/**
 * Phase 7: Mock Character Domain Adapter
 *
 * Deterministic, abstract mock implementation for testing Character domain integration.
 * Authoritative Owner: CHARACTER_SYSTEM
 * Domain ID: CHARACTER
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
  CHARACTER_DOMAIN_ID,
  CHARACTER_OWNER_ID,
  CharacterOperation,
  CharacterProfileRef,
  CharacterStateRef,
  CharacterKnowledgeRef,
  CharacterAvailabilityRef,
  CharacterTransitionPayload
} from '../contracts/character.ts';

export class MockCharacterDomainAdapter implements DomainPort {
  public readonly domainId: DomainID = CHARACTER_DOMAIN_ID;
  public readonly ownerId: SystemID = CHARACTER_OWNER_ID;
  public readonly version: string = '1.0.0-mock';
  public readonly supportedOperations: readonly string[] = Object.values(CharacterOperation);

  private traces: DomainTraceRecord[] = [];
  private stateStore: Map<string, { condition: string; availability: boolean; location?: string }> = new Map([
    ['CHAR_ABSTRACT_01', { condition: 'NORMAL', availability: true, location: 'LOC_ABSTRACT_01' }],
    ['CHAR_ABSTRACT_02', { condition: 'ACTIVE', availability: false, location: 'LOC_ABSTRACT_02' }]
  ]);

  public query(request: DomainQueryRequest): Result<DomainQueryResult> {
    const charId = request.entityReference || (request.filter as { characterId?: string })?.characterId || 'CHAR_ABSTRACT_01';
    const charData = this.stateStore.get(charId);

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 1,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_CHAR_QUERY`
    };

    switch (request.operation) {
      case CharacterOperation.GET_PROFILE_REF: {
        const profile: CharacterProfileRef = {
          characterId: charId,
          archetypeReference: 'ABSTRACT_ARCHETYPE',
          canonicalName: `Abstract Character ${charId}`,
          status: charData ? 'ACTIVE' : 'UNKNOWN'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: profile,
          status: DomainResultType.ACCEPTED
        });
      }

      case CharacterOperation.GET_STATE_REF: {
        const stateRef: CharacterStateRef = {
          characterId: charId,
          stateVectorRef: `VEC_${charId}`,
          conditionStatus: charData?.condition || 'UNKNOWN',
          lastUpdated: '2024-01-01T08:00:00Z'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: stateRef,
          status: DomainResultType.ACCEPTED
        });
      }

      case CharacterOperation.GET_AVAILABILITY: {
        const avail: CharacterAvailabilityRef = {
          characterId: charId,
          isAvailable: charData?.availability ?? false,
          occupancyStatus: charData?.availability ? 'FREE' : 'ENGAGED',
          locationRef: charData?.location
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

      case CharacterOperation.GET_KNOWLEDGE_REF: {
        const knowRef: CharacterKnowledgeRef = {
          characterId: charId,
          epistemicBoundaryRef: `EPI_BOUND_${charId}`,
          knownItemCount: 3
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: knowRef,
          status: DomainResultType.ACCEPTED
        });
      }

      default:
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: { characterId: charId, scope: 'ABSTRACT' },
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
        reasons: [`Operation "${op}" is not supported by Character Domain.`]
      });
    }

    if (request.entityReference && !request.entityReference.startsWith('CHAR_')) {
      return success({
        valid: false,
        domain: this.domainId,
        owner: this.ownerId,
        status: 'INVALID',
        reasons: [`Invalid entity reference "${request.entityReference}". Character IDs must start with "CHAR_".`]
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
    const payload = request.payload as CharacterTransitionPayload;
    const charId = payload?.characterId || request.entityReference || 'CHAR_ABSTRACT_01';

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 2,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_CHAR_REQ`
    };

    // If requested condition is 'INVALID_STATE', reject
    if (payload?.targetCondition === 'INVALID_STATE') {
      return success({
        requestId: request.requestId,
        domain: this.domainId,
        owner: this.ownerId,
        version: versionMeta,
        resultType: DomainResultType.REJECTED,
        reason: 'Target state rejected by character owner invariants.'
      });
    }

    // If blocked
    if (payload?.targetCondition === 'BLOCKED_STATE') {
      return success({
        requestId: request.requestId,
        domain: this.domainId,
        owner: this.ownerId,
        version: versionMeta,
        resultType: DomainResultType.BLOCKED,
        reason: 'Character transition blocked by current condition constraints.'
      });
    }

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: versionMeta,
      resultType: DomainResultType.ACCEPTED,
      data: {
        characterId: charId,
        stateVectorRef: `VEC_${charId}_NEW`,
        conditionStatus: payload?.targetCondition || 'UPDATED',
        lastUpdated: '2024-01-01T12:00:00Z'
      },
      reason: 'Character change request accepted by owner.'
    });
  }

  public applyChange(request: DomainChangeRequest): Result<DomainChangeResult> {
    const payload = request.payload as CharacterTransitionPayload;
    const charId = payload?.characterId || request.entityReference || 'CHAR_ABSTRACT_01';

    const current = this.stateStore.get(charId) || { condition: 'NORMAL', availability: true };
    this.stateStore.set(charId, {
      ...current,
      condition: payload?.targetCondition || current.condition
    });

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: {
        domainVersion: this.version,
        entityVersion: 3,
        requestId: request.requestId,
        correlationId: request.correlationId,
        traceId: `${request.requestId}_CHAR_APPLY`
      },
      resultType: DomainResultType.APPLIED,
      data: {
        characterId: charId,
        stateVectorRef: `VEC_${charId}`,
        conditionStatus: payload?.targetCondition || current.condition,
        lastUpdated: '2024-01-01T12:00:00Z'
      },
      reason: 'Character mutation authoritatively applied by owner.'
    });
  }

  public resolveConflict(request: DomainConflictResolutionRequest): Result<DomainConflictResolutionResult> {
    return success({
      conflictId: request.conflictId,
      status: 'RESOLVED',
      revalidationRequired: true,
      resolutionSummary: `Character Domain Owner resolved conflict with decision: ${request.resolutionDecision}`
    });
  }

  public getTraces(): DomainTraceRecord[] {
    return [...this.traces];
  }

  public recordTrace(trace: DomainTraceRecord): void {
    this.traces.push(trace);
  }
}
