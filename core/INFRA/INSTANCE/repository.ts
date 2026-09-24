import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { DomainID, SystemID } from '../../SHARED/identifiers.ts';
import { UniverseRepository } from '../../UNIVERSE/CANON/repository.ts';
import { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';
import { RevisionRecord } from '../../SHARED/history.ts';
import { getOwner } from '../../RUNTIME/GOVERNANCE/ownership.ts';
import { UniverseInstanceManager } from './instance.ts';

export class InstanceUniverseRepository implements UniverseRepository {
  public constructor(private readonly instances: UniverseInstanceManager) {}

  public getUniverse(universeId: string): Result<UniverseModel | null> {
    try {
      const status = this.instances.status();
      if (status.mounted && status.mountedUniverseId === universeId) return success(this.instances.requireMountedUniverse());
      return success(null);
    } catch (error) {
      return failure(EngineErrorCode.COMMAND_TARGET_NOT_FOUND, error instanceof Error ? error.message : String(error));
    }
  }

  public saveUniverse(universe: UniverseModel, actor: SystemID): Result<boolean> {
    const owner = getOwner('INSTANCE_MANAGEMENT');
    if (!owner || owner.ownerId !== actor) return failure(EngineErrorCode.UNAUTHORIZED_REPOSITORY_MUTATION, `Actor '${actor}' cannot persist Universe snapshots.`);
    try {
      this.instances.persist(universe, actor);
      return success(true);
    } catch (error) {
      return failure(EngineErrorCode.TRANSACTION_COMMIT_FAILED, error instanceof Error ? error.message : String(error));
    }
  }

  public getDomainEntity<T = unknown>(domainId: DomainID, entityId: string): Result<T | null> {
    const universe = this.currentUniverse();
    if (!universe) return success(null);
    const domain = String(domainId).toUpperCase();
    const maps: Record<string, Readonly<Record<string, unknown>> | undefined> = {
      CHARACTER: universe.characters,
      RELATIONSHIP: universe.relationships,
      OBJECT: { ...universe.objects, ...(universe.objectRelations ?? {}) },
      KNOWLEDGE: universe.knowledge,
      STATE: universe.states,
      LOCATION: universe.locations,
      EVENT: universe.events,
      PROCESS: universe.processes,
      UNRESOLVED: universe.unresolvedConditions
    };
    const entity = maps[domain]?.[entityId];
    return success(entity ? JSON.parse(JSON.stringify(entity)) as T : null);
  }

  public saveDomainEntity<T = unknown>(_domainId: DomainID, _entityId: string, _entity: T, actor: SystemID): Result<boolean> {
    return failure(EngineErrorCode.CANON_MUTATION_PROHIBITED, `Direct domain repository writes are disabled for actor '${actor}'. Use TransactionBoundary.`);
  }

  public listDomainEntities<T = unknown>(domainId: DomainID): Result<T[]> {
    const universe = this.currentUniverse();
    if (!universe) return success([]);
    const domain = String(domainId).toUpperCase();
    const source = this.getMap(domain, universe);
    return success(Object.values(source ?? {}).map(item => JSON.parse(JSON.stringify(item)) as T));
  }

  public getRevisions(_entityId: string): Result<RevisionRecord[]> {
    const universe = this.currentUniverse();
    return success(universe ? [...universe.revisionHistory.revisions] : []);
  }

  private currentUniverse(): UniverseModel | null {
    const mounted = this.instances.getMounted();
    return mounted?.universe ?? null;
  }

  private getMap(domain: string, universe: UniverseModel): Readonly<Record<string, unknown>> | undefined {
    switch (domain) {
      case 'CHARACTER': return universe.characters;
      case 'RELATIONSHIP': return universe.relationships;
      case 'OBJECT': return { ...universe.objects, ...(universe.objectRelations ?? {}) };
      case 'KNOWLEDGE': return universe.knowledge;
      case 'STATE': return universe.states;
      case 'LOCATION': return universe.locations;
      case 'EVENT': return universe.events;
      case 'PROCESS': return universe.processes;
      case 'UNRESOLVED': return universe.unresolvedConditions;
      default: return undefined;
    }
  }
}
