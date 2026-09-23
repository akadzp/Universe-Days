/**
 * Phase 7: Domain Integration Gateway
 *
 * Provides the unified communication gateway between consumers (Daily Universe,
 * Orchestrator, Story Pipeline) and authoritative Domain Systems.
 *
 * Enforces:
 * 1. Strict Authority: Only owners can APPLY mutations. Consumers can only READ and REQUEST.
 * 2. Immutable Results: Deep-frozen read results to prevent reference leakage.
 * 3. Deterministic Conflict Arbitration: Conflicts route to owners, never auto-pick winners.
 * 4. Temporal & Continuity Integration: Validates temporal anchors and continuity constraints.
 * 5. Cross-Domain Multi-Requests: Preserves separate domain ownership without authority bleed.
 */

import { DomainID, SystemID, makeDomainID, makeSystemID, makeRequestID } from '../../SHARED/identifiers.ts';
import { Result, success, failure, blocked, conflict } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { ArchitectureAction, canPerformAction } from '../GOVERNANCE/authority.ts';
import { getOwner, isKnownDomain } from '../GOVERNANCE/ownership.ts';
import {
  routeConflict as routeArchConflict,
  ConflictRecord,
  ConflictDraft,
  ConflictStatus
} from '../GOVERNANCE/conflict.ts';
import { TimePoint } from '../TEMPORAL/time-point.ts';
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
  DomainTraceRecord,
  deepFreeze
} from './contracts/common.ts';
import { DomainRegistry } from './registry.ts';

export interface MultiDomainChangeResponse {
  allSucceeded: boolean;
  results: Record<string, DomainChangeResult>;
  traces: DomainTraceRecord[];
  errors: Record<string, string>;
}

export class DomainGateway {
  private static registry = DomainRegistry.getInstance();
  private static traces: DomainTraceRecord[] = [];

  /**
   * Clears in-memory traces for test isolation.
   */
  public static clearTraces(): void {
    this.traces = [];
  }

  /**
   * Retrieves all recorded gateway traces.
   */
  public static getAllTraces(): DomainTraceRecord[] {
    return [...this.traces];
  }

  /**
   * Unified READ Path:
   * Consumer -> Authorized Domain Query -> Domain Adapter -> Domain Owner -> Read-Only Result.
   */
  public static query<TFilter = unknown, TData = unknown>(
    actor: SystemID | string,
    domain: DomainID | string,
    request: DomainQueryRequest<TFilter>
  ): Result<DomainQueryResult<TData>> {
    const domainStr = String(domain);
    const domainId = makeDomainID(domainStr);

    // 1. Check Authority for READ
    const authCheck = canPerformAction(actor, domainStr, ArchitectureAction.READ);
    if (!authCheck.success) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_ACCESS,
        authCheck.message || `Actor "${actor}" is unauthorized to read domain "${domainStr}".`
      );
    }

    // 2. Lookup registered Domain Adapter
    const adapter = this.registry.getAdapter(domainId);
    if (!adapter) {
      return failure(
        EngineErrorCode.DOMAIN_ADAPTER_UNAVAILABLE,
        `No adapter registered for domain "${domainStr}".`
      );
    }

    // 3. Optional Temporal Validation on Query
    if (request.effectiveTime) {
      if (typeof request.effectiveTime === 'string') {
        const parsed = TimePoint.parse(request.effectiveTime);
        if (!parsed.success) {
          return failure(
            EngineErrorCode.INVALID_TIME_POINT,
            `Query temporal reference "${request.effectiveTime}" is invalid.`
          );
        }
      }
    }

    // 4. Execute Query on Adapter
    const queryResult = adapter.query(request as DomainQueryRequest);
    if (!queryResult.success || !queryResult.data) {
      return failure(
        EngineErrorCode.DOMAIN_VALIDATION_FAILED,
        queryResult.message || `Query failed on domain "${domainStr}".`
      );
    }

    // 5. Deep freeze result to prevent reference leakage / mutation by consumer
    const frozenData = deepFreeze(queryResult.data.data) as TData;
    const frozenResult: DomainQueryResult<TData> = {
      ...queryResult.data,
      data: frozenData
    };

    // 6. Record Trace
    const trace: DomainTraceRecord = {
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_TRACE_${Date.now()}`,
      timestamp: Date.now(),
      sourceSystem: makeSystemID(String(actor)),
      targetDomain: domainId,
      operation: request.operation,
      entityReference: request.entityReference,
      result: queryResult.data.status,
      owner: adapter.ownerId,
      validationStatus: 'VALID'
    };
    adapter.recordTrace(trace);
    this.traces.push(trace);

    return success(frozenResult, `Query on domain "${domainStr}" executed successfully.`);
  }

  /**
   * Unified CHANGE REQUEST Path:
   * Consumer -> CHANGE REQUEST -> Identify Domain Owner -> Authority Check ->
   * Domain Adapter -> Owner Validation -> Owner Result -> Consumer.
   *
   * Note: The owner result indicates ACCEPTED, REJECTED, BLOCKED, etc.
   * A change request NEVER implicitly directly applies the mutation.
   */
  public static requestChange<TPayload = unknown, TData = unknown>(
    actor: SystemID | string,
    domain: DomainID | string,
    request: DomainChangeRequest<TPayload>
  ): Result<DomainChangeResult<TData>> {
    const domainStr = String(domain);
    const domainId = makeDomainID(domainStr);

    // 1. Check Authority for REQUEST_CHANGE
    const authCheck = canPerformAction(actor, domainStr, ArchitectureAction.REQUEST_CHANGE);
    if (!authCheck.success) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_ACCESS,
        authCheck.message || `Actor "${actor}" is unauthorized to request changes in domain "${domainStr}".`
      );
    }

    // 2. Validate Domain & Adapter
    const adapter = this.registry.getAdapter(domainId);
    if (!adapter) {
      return failure(
        EngineErrorCode.DOMAIN_ADAPTER_UNAVAILABLE,
        `No adapter registered for domain "${domainStr}".`
      );
    }

    // 3. Temporal Validation (via Temporal Engine)
    if (request.effectiveTime) {
      if (typeof request.effectiveTime === 'string') {
        const parsed = TimePoint.parse(request.effectiveTime);
        if (!parsed.success) {
          return failure(
            EngineErrorCode.INVALID_TIME_POINT,
            `Change request effectiveTime "${request.effectiveTime}" is invalid.`
          );
        }
      }
    }

    // 4. Owner Validation
    const valResult = adapter.validate(request as DomainChangeRequest);
    if (!valResult.success || !valResult.data?.valid) {
      const reasons = valResult.data?.reasons?.join(', ') || valResult.message || 'Owner validation failed';
      return failure(
        EngineErrorCode.DOMAIN_VALIDATION_FAILED,
        `Domain owner (${adapter.ownerId}) validation failed: ${reasons}`
      );
    }

    // 5. Owner processes change request
    const ownerResult = adapter.requestChange(request as DomainChangeRequest);
    if (!ownerResult.success || !ownerResult.data) {
      return failure(
        EngineErrorCode.DOMAIN_VALIDATION_FAILED,
        ownerResult.message || `Domain owner rejected change request.`
      );
    }

    // 6. Record Trace
    const trace: DomainTraceRecord = {
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_TRACE_${Date.now()}`,
      timestamp: Date.now(),
      sourceSystem: makeSystemID(String(actor)),
      targetDomain: domainId,
      operation: request.operation,
      entityReference: request.entityReference,
      result: ownerResult.data.resultType,
      owner: adapter.ownerId,
      validationStatus: valResult.data.status
    };
    adapter.recordTrace(trace);
    this.traces.push(trace);

    return success(ownerResult.data as DomainChangeResult<TData>, ownerResult.message);
  }

  /**
   * Unified APPLY CHANGE Path:
   * ONLY the authoritative domain owner may apply mutations.
   * Consumers attempting this will be rejected with UNAUTHORIZED_MUTATION.
   */
  public static applyChange<TPayload = unknown, TData = unknown>(
    actor: SystemID | string,
    domain: DomainID | string,
    request: DomainChangeRequest<TPayload>
  ): Result<DomainChangeResult<TData>> {
    const domainStr = String(domain);
    const domainId = makeDomainID(domainStr);

    // 1. Strict Authority Check: ONLY Authoritative Domain Owner may APPLY_CHANGE
    const authCheck = canPerformAction(actor, domainStr, ArchitectureAction.APPLY_CHANGE);
    if (!authCheck.success) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
        authCheck.message || `Actor "${actor}" is NOT authorized to APPLY mutations to domain "${domainStr}". Only the authoritative owner can apply.`
      );
    }

    // 2. Validate Domain & Adapter
    const adapter = this.registry.getAdapter(domainId);
    if (!adapter) {
      return failure(
        EngineErrorCode.DOMAIN_ADAPTER_UNAVAILABLE,
        `No adapter registered for domain "${domainStr}".`
      );
    }

    // 3. Adapter applies change
    const applyResult = adapter.applyChange(request as DomainChangeRequest);
    if (!applyResult.success || !applyResult.data) {
      return failure(
        EngineErrorCode.DOMAIN_VALIDATION_FAILED,
        applyResult.message || `Apply change failed on domain "${domainStr}".`
      );
    }

    // 4. Record Trace
    const trace: DomainTraceRecord = {
      requestId: request.requestId,
      correlationId: request.correlationId,
      traceId: `${request.requestId}_APPLY_${Date.now()}`,
      timestamp: Date.now(),
      sourceSystem: makeSystemID(String(actor)),
      targetDomain: domainId,
      operation: request.operation,
      entityReference: request.entityReference,
      result: applyResult.data.resultType,
      owner: adapter.ownerId,
      validationStatus: 'VALID'
    };
    adapter.recordTrace(trace);
    this.traces.push(trace);

    return success(applyResult.data as DomainChangeResult<TData>, applyResult.message);
  }

  /**
   * Routes a domain conflict to its authoritative domain owner using architecture/conflict.ts.
   * Does NOT auto-select winners.
   */
  public static routeConflict(draft: ConflictDraft): Result<ConflictRecord> {
    return routeArchConflict(draft);
  }

  /**
   * Resolves a routed conflict via authoritative domain owner arbitration.
   */
  public static resolveConflict(
    resolverActor: SystemID | string,
    domain: DomainID | string,
    request: DomainConflictResolutionRequest
  ): Result<DomainConflictResolutionResult> {
    const domainStr = String(domain);
    const domainId = makeDomainID(domainStr);
    const owner = getOwner(domainStr);

    if (!owner) {
      return failure(
        EngineErrorCode.DOMAIN_OWNER_NOT_FOUND,
        `No owner found for domain "${domainStr}".`
      );
    }

    // Only authoritative owner can arbitrate conflict
    if (resolverActor !== owner.ownerId) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_ACCESS,
        `Actor "${resolverActor}" cannot resolve conflict for domain "${domainStr}". Only authoritative owner "${owner.ownerId}" may arbitrate.`
      );
    }

    const adapter = this.registry.getAdapter(domainId);
    if (!adapter) {
      return failure(
        EngineErrorCode.DOMAIN_ADAPTER_UNAVAILABLE,
        `No adapter registered for domain "${domainStr}".`
      );
    }

    const res = adapter.resolveConflict(request);
    return res;
  }

  /**
   * Multi-Domain / Cross-Domain Change Request Handler:
   * When a high-level operation spans multiple domains (e.g. Character + Object, Character + Location),
   * this dispatcher identifies each individual domain, checks separate authority, routes each mutation
   * directly to its respective owner adapter, and aggregates results without blurring domain ownership.
   */
  public static requestMultiDomainChange(
    actor: SystemID | string,
    requests: DomainChangeRequest[]
  ): MultiDomainChangeResponse {
    const results: Record<string, DomainChangeResult> = {};
    const traces: DomainTraceRecord[] = [];
    const errors: Record<string, string> = {};
    let allSucceeded = true;

    for (const req of requests) {
      const res = this.requestChange(actor, req.targetDomain, req);
      if (res.success && res.data) {
        results[String(req.targetDomain)] = res.data;
      } else {
        allSucceeded = false;
        errors[String(req.targetDomain)] = res.message || 'Change request failed';
      }
    }

    return {
      allSucceeded,
      results,
      traces,
      errors
    };
  }
}
