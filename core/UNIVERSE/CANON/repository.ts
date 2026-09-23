/**
 * Phase 8: Universe Repository Abstraction
 *
 * Provides storage boundary separating:
 * 1. Universe Repository (API for storing/retrieving snapshots and domain entities)
 * 2. Domain Owner (Authoritative system with sole power to mutate domain entities)
 * 3. Storage Provider (In-memory, file, or mock persistence layer)
 *
 * INVARIANT: Storage does NOT become authority. Mutations require authoritative domain actor permission.
 */

import { DomainID, SystemID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';
import { RevisionRecord } from '../../SHARED/history.ts';
import { getOwner } from '../../RUNTIME/GOVERNANCE/ownership.ts';

export interface UniverseRepository {
  getUniverse(universeId: string): Result<UniverseModel | null>;
  saveUniverse(universe: UniverseModel, actor: SystemID): Result<boolean>;
  getDomainEntity<T = unknown>(domainId: DomainID, entityId: string): Result<T | null>;
  saveDomainEntity<T = unknown>(domainId: DomainID, entityId: string, entity: T, actor: SystemID): Result<boolean>;
  listDomainEntities<T = unknown>(domainId: DomainID): Result<T[]>;
  getRevisions(entityId: string): Result<RevisionRecord[]>;
}

export class InMemoryUniverseRepository implements UniverseRepository {
  private universes: Map<string, UniverseModel> = new Map();
  private domainEntities: Map<string, Map<string, unknown>> = new Map();
  private entityRevisions: Map<string, RevisionRecord[]> = new Map();

  public getUniverse(universeId: string): Result<UniverseModel | null> {
    const uni = this.universes.get(universeId);
    return success(uni ?? null);
  }

  public saveUniverse(universe: UniverseModel, actor: SystemID): Result<boolean> {
    if (!universe.universeId) {
      return failure(EngineErrorCode.UNIVERSE_VALIDATION_FAILED, 'Universe ID is required');
    }
    // Deep clone to ensure storage isolation
    const serialized = JSON.stringify(universe);
    const cloned = JSON.parse(serialized) as UniverseModel;
    this.universes.set(universe.universeId, cloned);
    return success(true);
  }

  public getDomainEntity<T = unknown>(domainId: DomainID, entityId: string): Result<T | null> {
    const domainMap = this.domainEntities.get(domainId);
    if (!domainMap) return success(null);
    const entity = domainMap.get(entityId);
    if (!entity) return success(null);
    // Deep clone to prevent direct state mutation by consumer
    const cloned = JSON.parse(JSON.stringify(entity)) as T;
    return success(cloned);
  }

  public saveDomainEntity<T = unknown>(
    domainId: DomainID,
    entityId: string,
    entity: T,
    actor: SystemID
  ): Result<boolean> {
    // ENFORCE DOMAIN OWNERSHIP AUTHORITY:
    // Storage cannot accept a save directly from a non-owner actor without domain authority check.
    const owner = getOwner(domainId);
    const isOwner = owner !== undefined && owner.ownerId === actor;
    if (!isOwner) {
      return failure(
        EngineErrorCode.UNAUTHORIZED_REPOSITORY_MUTATION,
        `Actor '${actor}' is not the authoritative owner of domain '${domainId}'. Direct repository write rejected.`
      );
    }

    if (!this.domainEntities.has(domainId)) {
      this.domainEntities.set(domainId, new Map());
    }
    const domainMap = this.domainEntities.get(domainId)!;
    domainMap.set(entityId, JSON.parse(JSON.stringify(entity)));

    // Track revision if available
    const entityObj = entity as Record<string, unknown>;
    if (entityObj.history && typeof entityObj.history === 'object') {
      const history = entityObj.history as { revisions?: RevisionRecord[] };
      if (Array.isArray(history.revisions)) {
        this.entityRevisions.set(entityId, [...history.revisions]);
      }
    }

    return success(true);
  }

  public listDomainEntities<T = unknown>(domainId: DomainID): Result<T[]> {
    const domainMap = this.domainEntities.get(domainId);
    if (!domainMap) return success([]);
    const list = Array.from(domainMap.values()).map(e => JSON.parse(JSON.stringify(e)) as T);
    return success(list);
  }

  public getRevisions(entityId: string): Result<RevisionRecord[]> {
    const revs = this.entityRevisions.get(entityId);
    return success(revs ? [...revs] : []);
  }

  public clear(): void {
    this.universes.clear();
    this.domainEntities.clear();
    this.entityRevisions.clear();
  }
}
