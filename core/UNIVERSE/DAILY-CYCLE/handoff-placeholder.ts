/**
 * Phase 5: Domain Handoff Placeholder.
 * Orchestrates change requests to external domain owners without directly mutating domain data.
 */

import { HandoffContract, HandoffStatus, validateHandoff } from '../../RUNTIME/GOVERNANCE/handoff.ts';
import { MessageType } from '../../RUNTIME/GOVERNANCE/protocol.ts';
import { makeRequestID, makeSystemID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export interface DomainChangeRequest<T = unknown> {
  targetDomain: string;
  entityReferences: string[];
  requestedChange: T;
  effectiveTime: string;
  sourcePeriodId: string;
}

export interface DomainChangeResponse<TResult = unknown> {
  requestId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'EXECUTED';
  result?: TResult;
  rejectionReason?: string;
}

export interface IDomainOwnerHandler {
  handleHandoff(contract: HandoffContract): Promise<DomainChangeResponse> | DomainChangeResponse;
}

export class DomainHandoffRouter {
  private handlers: Map<string, IDomainOwnerHandler> = new Map();

  public registerHandler(domainId: string, handler: IDomainOwnerHandler): void {
    this.handlers.set(domainId, handler);
  }

  /**
   * Dispatches a change request through the formal Phase 1 Handoff Contract.
   */
  public async requestDomainChange<T>(
    request: DomainChangeRequest<T>
  ): Promise<Result<DomainChangeResponse>> {
    const requestId = makeRequestID(`REQ_HANDOFF_${request.targetDomain}_${request.sourcePeriodId}_${request.entityReferences.join('_')}`);

    const contract: HandoffContract<T> = {
      sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      targetSystem: makeSystemID(request.targetDomain),
      requestId,
      messageType: MessageType.REQUEST,
      temporalContextRef: request.sourcePeriodId,
      entityReferences: request.entityReferences as any,
      requestedChange: request.requestedChange,
      effectiveTime: request.effectiveTime,
      dependencies: [],
      constraints: [],
      sourceReferences: [request.sourcePeriodId],
      status: HandoffStatus.INITIALIZED,
      version: '1.0.0',
      traceability: {
        requestId,
        sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
        timestamp: 0,
        version: '1.0.0'
      }
    };

    const val = validateHandoff<T>(contract);
    if (!val.success) {
      return failure(`Handoff validation failed: ${val.message ?? (val.error as any)?.message ?? 'validation error'}`);
    }

    const handler = this.handlers.get(request.targetDomain);
    if (!handler) {
      return failure(
        `No authoritative handler is registered for target domain '${request.targetDomain}'.`,
        EngineErrorCode.MISSING_REQUIRED_CONTEXT
      );
    }

    const response = await handler.handleHandoff(contract);
    return success(response);
  }
}
