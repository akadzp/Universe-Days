/** Production authority registry for the mounted Universe instance. */
import { freezeDeep } from '../shared.ts';
import type { UniverseModel } from '../../universe/model/universe.ts';
import { UniverseModelValidator } from '../../universe/model/validation.ts';

export interface MountedUniverse {
  readonly universe: UniverseModel;
  readonly universeScope: string;
  readonly mountedAtUniverseTime: string;
}

export class UniverseAuthorityStore {
  private mounted: MountedUniverse | null = null;

  public mount(universe: UniverseModel, universeScope: string): MountedUniverse {
    if (!universe?.universeId) throw new Error('Cannot mount Universe without universeId.');
    if (!universe.temporalContext?.currentUniverseDate) {
      throw new Error('Cannot mount Universe without authoritative universe date.');
    }
    if (!universe.temporalContext?.currentUniverseTime) {
      throw new Error('Cannot mount Universe without authoritative universe time.');
    }
    if (!universeScope?.trim()) throw new Error('Cannot mount Universe without universe scope.');

    const validation = UniverseModelValidator.validate(universe);
    if (!validation.isValid) {
      const first = validation.issues.find(issue => issue.severity === 'ERROR');
      throw new Error(`Universe mount rejected: ${first?.message ?? 'Universe validation failed.'}`);
    }

    // Detach caller-owned references before mounting. The mounted snapshot becomes read-only runtime input.
    const snapshot = freezeDeep(JSON.parse(JSON.stringify(universe)) as UniverseModel);
    this.mounted = Object.freeze({
      universe: snapshot,
      universeScope: universeScope.trim(),
      mountedAtUniverseTime: snapshot.temporalContext.currentUniverseTime
    });
    return this.mounted;
  }

  public unmount(): void {
    this.mounted = null;
  }

  public get(): MountedUniverse | null {
    return this.mounted;
  }

  public require(): MountedUniverse {
    if (!this.mounted) throw new Error('No authoritative Universe instance is mounted.');
    return this.mounted;
  }
}
