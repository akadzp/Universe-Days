/**
 * Application Runtime: Central coordinator for the Application Boundary.
 * Connects Actor Commands & Queries -> Authorization -> Core Domain -> Persistence -> DTO Results.
 */

import { ApplicationCommand, CommandResult } from '../contracts/command.ts';
import { ApplicationQuery, QueryResult } from '../contracts/query.ts';
import { ApplicationCommandBus } from '../commands/bus.ts';
import { ApplicationQueryBus } from '../queries/bus.ts';
import { UniverseInstanceManager } from '../../core/INFRA/INSTANCE/instance.ts';
import { UniverseAuthorityStore } from '../../core/INFRA/INSTANCE/authority.ts';
import { FileUniverseSnapshotStore } from '../../core/INFRA/PERSISTENCE/universe.ts';
import { UniverseModel } from '../../core/UNIVERSE/CANON/universe.ts';

export interface ApplicationRuntimeOptions {
  readonly storageRootDir?: string;
}

export class ApplicationRuntime {
  private readonly instanceManager: UniverseInstanceManager;
  private readonly commandBus: ApplicationCommandBus;
  private readonly queryBus: ApplicationQueryBus;

  public constructor(instanceManager?: UniverseInstanceManager, options?: ApplicationRuntimeOptions) {
    if (instanceManager) {
      this.instanceManager = instanceManager;
    } else {
      const authority = new UniverseAuthorityStore();
      const store = new FileUniverseSnapshotStore({ rootDir: options?.storageRootDir ?? '/tmp/pocer_runtime_data' });
      this.instanceManager = new UniverseInstanceManager(authority, store);
    }

    this.commandBus = new ApplicationCommandBus(this.instanceManager);
    this.queryBus = new ApplicationQueryBus(this.instanceManager);
  }

  public static createDefault(rootDir: string = '/tmp/pocer_runtime_data'): ApplicationRuntime {
    return new ApplicationRuntime(undefined, { storageRootDir: rootDir });
  }

  public async executeCommand<TPayload, TResult>(command: ApplicationCommand<TPayload>): Promise<CommandResult<TResult>> {
    return this.commandBus.dispatch<TPayload, TResult>(command);
  }

  public async executeQuery<TParams, TResult>(query: ApplicationQuery<TParams>): Promise<QueryResult<TResult>> {
    return this.queryBus.dispatch<TParams, TResult>(query);
  }

  public mountUniverse(universe: UniverseModel, scope: string = 'MAIN'): void {
    this.instanceManager.persist(universe);
    this.instanceManager.load(universe.universeId, scope);
  }

  public getMountedUniverse(): UniverseModel | null {
    return this.instanceManager.getMounted()?.universe ?? null;
  }

  public getInstanceManager(): UniverseInstanceManager {
    return this.instanceManager;
  }
}
