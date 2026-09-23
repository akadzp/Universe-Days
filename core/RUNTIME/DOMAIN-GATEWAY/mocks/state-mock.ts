/**
 * Phase 7: Mock State Domain Adapter
 *
 * Deterministic, abstract mock implementation for testing State domain integration.
 * Authoritative Owner: STATE_SYSTEM
 * Domain ID: STATE
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
  STATE_DOMAIN_ID,
  STATE_OWNER_ID,
  StateOperation,
  StateVectorRef,
  StatePreviousRef,
  StateTransitionPayload
} from '../contracts/state.ts';

export class MockStateDomainAdapter implements DomainPort {
  public readonly domainId: DomainID = STATE_DOMAIN_ID;
  public readonly ownerId: SystemID = STATE_OWNER_ID;
  public readonly version: string = '1.0.0-mock';
  public readonly supportedOperations: readonly string[] = Object.values(StateOperation);

  private traces: DomainTraceRecord[] = [];
  private stateVectors: Map<string, StateVectorRef> = new Map([
    [
      'STATE_ABSTRACT_01',
      {
        stateId: 'STATE_ABSTRACT_01',
        currentState: 'OPERATIONAL',
        previousState: 'INITIALIZING',
        stateVersion: 1,
        lastTransitionTime: '2024-01-01T08:00:00Z',
        activeFlags: ['FLAG_ACTIVE', 'FLAG_MONITORED'],
        metrics: { stabilityScore: 98, loadRatio: 0.12 }
      }
    ]
  ]);

  public query(request: DomainQueryRequest): Result<DomainQueryResult> {
    const sId = request.entityReference || (request.filter as { stateId?: string })?.stateId || 'STATE_ABSTRACT_01';
    const stateData = this.stateVectors.get(sId);

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: stateData?.stateVersion || 1,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_STATE_QUERY`
    };

    switch (request.operation) {
      case StateOperation.GET_PREVIOUS_STATE_REF: {
        const prev: StatePreviousRef = {
          stateId: sId,
          previousState: stateData?.previousState || 'NONE',
          transitionTime: '2024-01-01T08:00:00Z',
          triggerEventRef: 'EV_INIT_01'
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: prev,
          status: DomainResultType.ACCEPTED
        });
      }

      default: {
        const defaultVec: StateVectorRef = stateData || {
          stateId: sId,
          currentState: 'DEFAULT_STABLE',
          stateVersion: 1,
          lastTransitionTime: '2024-01-01T08:00:00Z',
          activeFlags: ['FLAG_DEFAULT'],
          metrics: { defaultMetric: 1 }
        };
        return success({
          requestId: request.requestId,
          domain: this.domainId,
          owner: this.ownerId,
          version: versionMeta,
          data: defaultVec,
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
        reasons: [`Operation "${op}" is not supported by State Domain.`]
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
    const payload = request.payload as StateTransitionPayload;
    const sId = payload?.stateId || request.entityReference || 'STATE_ABSTRACT_01';

    const versionMeta = {
      domainVersion: this.version,
      entityVersion: 2,
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_STATE_REQ`
    };

    if (payload?.targetState === 'FORBIDDEN_TRANSITION') {
      return success({
        requestId: request.requestId,
        domain: this.domainId,
        owner: this.ownerId,
        version: versionMeta,
        resultType: DomainResultType.REJECTED,
        reason: 'State transition rejected by state machine invariants.'
      });
    }

    const current = this.stateVectors.get(sId);
    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: versionMeta,
      resultType: DomainResultType.ACCEPTED,
      data: {
        stateId: sId,
        currentState: payload?.targetState || 'TARGET_STATE',
        previousState: current?.currentState || 'PREVIOUS_STATE',
        stateVersion: (current?.stateVersion || 1) + 1,
        lastTransitionTime: '2024-01-01T12:00:00Z',
        activeFlags: current?.activeFlags || [],
        metrics: current?.metrics || {}
      },
      reason: 'State change request accepted by owner.'
    });
  }

  public applyChange(request: DomainChangeRequest): Result<DomainChangeResult> {
    const payload = request.payload as StateTransitionPayload;
    const sId = payload?.stateId || request.entityReference || 'STATE_ABSTRACT_01';

    const current = this.stateVectors.get(sId) || {
      stateId: sId,
      currentState: 'OPERATIONAL',
      previousState: 'INITIALIZING',
      stateVersion: 1,
      lastTransitionTime: '2024-01-01T08:00:00Z',
      activeFlags: [],
      metrics: {}
    };

    const updated: StateVectorRef = {
      ...current,
      previousState: current.currentState,
      currentState: payload?.targetState || current.currentState,
      stateVersion: current.stateVersion + 1,
      lastTransitionTime: '2024-01-01T12:00:00Z'
    };
    this.stateVectors.set(sId, updated);

    return success({
      requestId: request.requestId,
      domain: this.domainId,
      owner: this.ownerId,
      version: {
        domainVersion: this.version,
        entityVersion: updated.stateVersion,
        requestId: request.requestId,
        correlationId: request.correlationId,
        traceId: `${request.requestId}_STATE_APPLY`
      },
      resultType: DomainResultType.APPLIED,
      data: updated,
      reason: 'State mutation authoritatively applied by owner.'
    });
  }

  public resolveConflict(request: DomainConflictResolutionRequest): Result<DomainConflictResolutionResult> {
    return success({
      conflictId: request.conflictId,
      status: 'RESOLVED',
      revalidationRequired: true,
      resolutionSummary: `State Domain Owner resolved conflict with decision: ${request.resolutionDecision}`
    });
  }

  public getTraces(): DomainTraceRecord[] {
    return [...this.traces];
  }

  public recordTrace(trace: DomainTraceRecord): void {
    this.traces.push(trace);
  }
}
