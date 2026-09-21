/**
 * Phase 9: Domain Router
 *
 * Routes domain operations to authoritative Domain Owners using Phase 7 DomainGateway.
 * Strictly enforces READ -> REQUEST -> APPLY -> RESULT and rejects unauthorized or unknown owners.
 *
 * Determinism:
 * - Query request IDs are derived from explicit request inputs.
 * - No wall-clock or random fallback is used.
 */

import { DomainID, SystemID, makeDomainID } from '../types/identifiers.ts';
import { Result, success, failure, blocked } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { getOwner, isKnownDomain } from '../architecture/ownership.ts';
import { ArchitectureAction, canPerformAction } from '../architecture/authority.ts';
import { DomainGateway } from '../domains/gateway.ts';
import { DomainChangeRequest, DomainChangeResult, DomainQueryResult } from '../domains/contracts/common.ts';
import { deterministicId } from './determinism.ts';

export interface RoutedDomainOperation<TData = unknown> {
  domain: DomainID;
  targetOwner: SystemID;
  action: ArchitectureAction;
  data: TData;
}

export class DomainRouter {
  public static resolveOwner(domain: DomainID | string): Result<SystemID> {
    const domainStr = String(domain);
    const domainId = makeDomainID(domainStr);

    if (!isKnownDomain(domainStr)) {
      return failure(
        EngineErrorCode.DOMAIN_OWNER_NOT_FOUND,
        `DomainRouter: Cannot route operation to unknown domain "${domainStr}".`
      );
    }

    const owner = getOwner(domainId);
    if (!owner) {
      return failure(
        EngineErrorCode.DOMAIN_OWNER_NOT_FOUND,
        `DomainRouter: No authoritative owner registered for domain "${domainStr}".`
      );
    }

    return success(owner.ownerId);
  }

  public static executeQuery<TFilter = unknown, TData = unknown>(
    actor: SystemID | string,
    domain: DomainID | string,
    query: { queryType: string; filter?: TFilter }
  ): Result<DomainQueryResult<TData>> {
    const ownerRes = this.resolveOwner(domain);
    if (!ownerRes.success) {
      return failure(ownerRes.error, ownerRes.message);
    }

    const requestId = deterministicId(
      'Q',
      String(actor),
      String(domain),
      query.queryType,
      query.filter ?? null
    );

    return DomainGateway.query<TFilter, TData>(actor, domain, {
      requestId: requestId as any,
      queryType: query.queryType,
      filter: query.filter
    });
  }

  public static executeChangeRequest<TChange = unknown, TResult = unknown>(
    actor: SystemID | string,
    domain: DomainID | string,
    request: DomainChangeRequest<TChange>
  ): Result<DomainChangeResult<TResult>> {
    const ownerRes = this.resolveOwner(domain);
    if (!ownerRes.success) {
      return failure(ownerRes.error, ownerRes.message);
    }

    const canReq = canPerformAction(actor, domain, ArchitectureAction.REQUEST);
    const canWrite = canPerformAction(actor, domain, ArchitectureAction.WRITE);

    if (!canReq && !canWrite) {
      return blocked(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_ACCESS,
        `Actor "${actor}" is not authorized to request modifications in domain "${domain}".`
      );
    }

    return DomainGateway.requestChange<TChange, TResult>(actor, domain, request);
  }
}
