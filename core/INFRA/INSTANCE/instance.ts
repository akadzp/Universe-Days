/** Phase 34 — persistent Universe instance boundary with explicit ownership. */

import type { SystemID } from '../../SHARED/identifiers.ts';
import { makeSystemID } from '../../SHARED/identifiers.ts';
import { getOwner } from '../../RUNTIME/GOVERNANCE/ownership.ts';
import type { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';
import { FileUniverseSnapshotStore } from '../../INFRA/PERSISTENCE/universe.ts';
import { UniverseAuthorityStore, type MountedUniverse } from '../../INFRA/INSTANCE/authority.ts';

export interface UniverseInstanceStatus {
  readonly mounted: boolean;
  readonly mountedUniverseId: string | null;
  readonly mountedUniverseDate: string | null;
  readonly mountedUniverseScope: string | null;
  readonly storedCurrent: { readonly universeId: string; readonly universeScope: string } | null;
  readonly storageRootDir: string;
  readonly storedUniverseIds: readonly string[];
}

export interface UniverseInstanceManagerOptions {
  readonly persistenceActor?: SystemID;
}

export const INSTANCE_MANAGEMENT_ACTOR = makeSystemID('INSTANCE_MANAGEMENT_SYSTEM');

export class UniverseInstanceManager {
  private readonly authority: UniverseAuthorityStore;
  private readonly store: FileUniverseSnapshotStore;
  private readonly persistenceActor: SystemID;

  public constructor(authority: UniverseAuthorityStore, store: FileUniverseSnapshotStore, options?: UniverseInstanceManagerOptions) {
    this.authority = authority;
    this.store = store;
    this.persistenceActor = options?.persistenceActor ?? INSTANCE_MANAGEMENT_ACTOR;
  }

  private assertPersistenceAuthority(actor: SystemID): void {
    const owner = getOwner('INSTANCE_MANAGEMENT');
    if (!owner || owner.ownerId !== actor || actor !== this.persistenceActor) {
      throw new Error(`Persistence mutation rejected for actor '${actor}'.`);
    }
  }

  public load(universeId: string, universeScope: string): MountedUniverse {
    const universe = this.store.load(universeId);
    if (!universe) throw new Error(`Persistent Universe '${universeId}' was not found.`);
    const mounted = this.authority.mountAuthoritative(universe, universeScope, this.persistenceActor);
    this.store.setCurrent({ universeId: mounted.universe.universeId, universeScope: mounted.universeScope });
    return mounted;
  }

  public loadSandbox(universeId: string): MountedUniverse {
    const universe = this.store.load(universeId);
    if (!universe) throw new Error(`Persistent Universe '${universeId}' was not found.`);
    return this.authority.mountSandbox(universe);
  }

  public loadCurrent(): MountedUniverse | null {
    const current = this.store.getCurrent();
    if (!current) return null;
    return this.load(current.universeId, current.universeScope);
  }

  public persist(universe: UniverseModel, actor: SystemID = this.persistenceActor): void {
    this.assertPersistenceAuthority(actor);
    this.store.save(universe);
  }

  public persistMounted(actor: SystemID = this.persistenceActor): MountedUniverse {
    this.assertPersistenceAuthority(actor);
    const mounted = this.authority.require();
    this.store.save(mounted.universe);
    if (mounted.universeScope !== 'SANDBOX') {
      this.store.setCurrent({ universeId: mounted.universe.universeId, universeScope: mounted.universeScope });
    }
    return mounted;
  }

  public clearCurrent(actor: SystemID = this.persistenceActor): void {
    this.assertPersistenceAuthority(actor);
    this.store.clearCurrent();
  }

  public status(): UniverseInstanceStatus {
    const mounted = this.authority.get();
    return Object.freeze({
      mounted: Boolean(mounted),
      mountedUniverseId: mounted?.universe.universeId ?? null,
      mountedUniverseDate: mounted?.universe.temporalContext.currentUniverseDate ?? null,
      mountedUniverseScope: mounted?.universeScope ?? null,
      storedCurrent: this.store.getCurrent(),
      storageRootDir: this.store.getRootDir(),
      storedUniverseIds: this.store.listUniverseIds()
    });
  }
}
