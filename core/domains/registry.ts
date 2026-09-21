/**
 * Phase 7: Domain Registry
 *
 * Provides a centralized registry for domain ports/adapters.
 * Enforces that every registered domain has exactly one authoritative owner.
 */

import { DomainID, SystemID, makeDomainID } from '../types/identifiers.ts';
import { Result, success, failure } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';
import { getOwner, isKnownDomain } from '../architecture/ownership.ts';
import { DomainPort } from './contracts/common.ts';

export interface DomainStatusInfo {
  domainId: DomainID;
  ownerId?: SystemID;
  isRegistered: boolean;
  isOwnerValid: boolean;
  supportedOperations: string[];
  version?: string;
}

export class DomainRegistry {
  private static instance: DomainRegistry | null = null;
  private adapters: Map<string, DomainPort> = new Map();

  public static getInstance(): DomainRegistry {
    if (!DomainRegistry.instance) {
      DomainRegistry.instance = new DomainRegistry();
    }
    return DomainRegistry.instance;
  }

  /**
   * Resets the registry (primarily for testing isolation).
   */
  public reset(): void {
    this.adapters.clear();
  }

  /**
   * Registers a domain adapter.
   * Enforces that:
   * 1. The domain is a recognized core domain.
   * 2. The adapter's declared owner matches the authoritative owner in ownership.ts.
   * 3. Replaces previous adapter if updating.
   */
  public registerAdapter(adapter: DomainPort): Result<void> {
    const domainStr = String(adapter.domainId);
    if (!isKnownDomain(domainStr)) {
      return failure(
        EngineErrorCode.DOMAIN_NOT_FOUND,
        `Cannot register adapter for unknown domain "${domainStr}". Domain must be defined in CoreDomain.`
      );
    }

    const expectedOwner = getOwner(adapter.domainId);
    if (!expectedOwner) {
      return failure(
        EngineErrorCode.DOMAIN_OWNER_NOT_FOUND,
        `No authoritative owner registered for domain "${domainStr}".`
      );
    }

    if (adapter.ownerId !== expectedOwner.ownerId) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_DOMAIN_ACCESS,
        `Adapter owner mismatch for domain "${domainStr}": expected authoritative owner "${expectedOwner.ownerId}", got "${adapter.ownerId}".`
      );
    }

    this.adapters.set(domainStr, adapter);
    return success(undefined, `Adapter for domain "${domainStr}" registered under owner "${adapter.ownerId}".`);
  }

  /**
   * Retrieves the adapter for a domain.
   */
  public getAdapter(domainId: DomainID | string): DomainPort | undefined {
    return this.adapters.get(String(domainId));
  }

  /**
   * Checks if an adapter is registered for a domain.
   */
  public hasAdapter(domainId: DomainID | string): boolean {
    return this.adapters.has(String(domainId));
  }

  /**
   * Lists all currently registered domain IDs.
   */
  public listRegisteredDomains(): DomainID[] {
    return Array.from(this.adapters.keys()).map(id => makeDomainID(id));
  }

  /**
   * Queries status and supported operations for a domain.
   */
  public getDomainStatus(domainId: DomainID | string): DomainStatusInfo {
    const domainStr = String(domainId);
    const owner = getOwner(domainStr);
    const adapter = this.adapters.get(domainStr);

    return {
      domainId: makeDomainID(domainStr),
      ownerId: owner?.ownerId,
      isRegistered: !!adapter,
      isOwnerValid: !!owner && (!adapter || adapter.ownerId === owner.ownerId),
      supportedOperations: adapter ? [...adapter.supportedOperations] : [],
      version: adapter?.version
    };
  }
}
