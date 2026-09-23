/** Phase 34 — hardened authoritative Universe registry. */
import { freezeDeep } from '../../SHARED/platform.ts';
import type { SystemID } from '../../SHARED/identifiers.ts';
import { makeSystemID } from '../../SHARED/identifiers.ts';
import { getOwner } from '../../RUNTIME/GOVERNANCE/ownership.ts';
import type { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';
import { UniverseModelValidator } from '../../VALIDATION/universe-model.ts';

export interface MountedUniverse {
  readonly universe: UniverseModel;
  readonly universeScope: string;
  readonly mountedAtUniverseTime: string;
}

export const INSTANCE_MANAGEMENT_ACTOR = makeSystemID('INSTANCE_MANAGEMENT_SYSTEM');

export class UniverseAuthorityStore {
  private mounted: MountedUniverse | null = null;

  private assertInstanceAuthority(actor: SystemID): void {
    const owner = getOwner('INSTANCE_MANAGEMENT');
    if (!owner || owner.ownerId !== actor) throw new Error(`Universe authority mutation rejected for actor '${actor}'.`);
  }

  private validateAndMount(universe: UniverseModel, universeScope: string): MountedUniverse {
    if (!universe?.universeId) throw new Error('Cannot mount Universe without universeId.');
    if (!universe.temporalContext?.currentUniverseDate) throw new Error('Cannot mount Universe without authoritative universe date.');
    if (!universe.temporalContext?.currentUniverseTime) throw new Error('Cannot mount Universe without authoritative universe time.');
    if (!universeScope?.trim()) throw new Error('Cannot mount Universe without universe scope.');

    const validation = UniverseModelValidator.validate(universe);
    if (!validation.isValid) {
      const first = validation.issues.find(issue => issue.severity === 'ERROR');
      throw new Error(`Universe mount rejected: ${first?.message ?? 'Universe validation failed.'}`);
    }

    const snapshot = freezeDeep(JSON.parse(JSON.stringify(universe)) as UniverseModel);
    this.mounted = Object.freeze({
      universe: snapshot,
      universeScope: universeScope.trim(),
      mountedAtUniverseTime: snapshot.temporalContext.currentUniverseTime
    });
    return this.mounted;
  }

  public mountSandbox(universe: UniverseModel): MountedUniverse {
    return this.validateAndMount(universe, 'SANDBOX');
  }

  /**
   * Internal compatibility boundary. Canonical mounting requires an explicit owner actor.
   * Sandbox mounting remains available without authority credentials.
   */
  public mount(universe: UniverseModel, universeScope: string, actor?: SystemID): MountedUniverse {
    if (universeScope === 'SANDBOX') return this.mountSandbox(universe);
    if (!actor) throw new Error('Canonical Universe mounting requires the INSTANCE_MANAGEMENT owner actor.');
    return this.mountAuthoritative(universe, universeScope, actor);
  }

  public mountAuthoritative(universe: UniverseModel, universeScope: string, actor: SystemID): MountedUniverse {
    this.assertInstanceAuthority(actor);
    if (universeScope === 'SANDBOX') throw new Error('Use mountSandbox for SANDBOX Universes.');
    return this.validateAndMount(universe, universeScope);
  }

  public unmount(): void { this.mounted = null; }
  public get(): MountedUniverse | null { return this.mounted; }
  public require(): MountedUniverse {
    if (!this.mounted) throw new Error('No authoritative Universe instance is mounted.');
    return this.mounted;
  }
}
