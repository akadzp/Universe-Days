/**
 * Phase 5: Domain Handoff Placeholder.
 * Orchestrates change requests to external domain owners without directly mutating domain data.
 */

import { HandoffContract, HandoffStatus, validateHandoff } from '../../architecture/handoff.ts';
import { MessageType } from '../../architecture/protocol.ts';
import { makeRequestID, makeSystemID } from '../../types/identifiers.ts';
import { Result, success, failure } from '../../types/result.ts';

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
    const requestId = makeRequestID(`REQ_HANDOFF_${request.targetDomain}_${Date.now()}`);

    const contract: HandoffContract<T> = {
      sourceSystem: makeSystemID('DAILY_UNIVERSE_CORE'),
      targetSystem: makeSystemID(request.targetDomain),
      requestId,
      messageType: MessageType.DATA_MUTATION,
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
        sourceSystem: makeSystemID('DAILY_UNIVERSE_CORE'),
        timestamp: 0,
        version: '1.0.0'
      }
    };

    const val = validateHandoff<T>(contract);
    if (!val.success) {
      return failure(`Handoff validation failed: ${val.error.message}`);
    }

    const handler = this.handlers.get(request.targetDomain);
    if (!handler) {
      // Return accepted placeholder if no mock/real handler is registered
      return success({
        requestId,
        status: 'ACCEPTED',
        result: { acknowledgedBy: 'PLACEHOLDER_NOOP', domain: request.targetDomain }
      });
    }

    const response = await handler.handleHandoff(contract);
    return success(response);
  }
}
