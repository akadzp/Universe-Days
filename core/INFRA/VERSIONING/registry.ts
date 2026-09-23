import { hash32, stableSerialize } from '../../SHARED/platform.ts';
import { Migration, VersionId, VersionedEnvelope } from '../../INFRA/VERSIONING/types.ts';

function compare(a: VersionId, b: VersionId): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

export class VersionRegistry {
  private readonly versions = new Map<string, VersionId>();
  private readonly migrations = new Map<string, Migration<any, any>>();

  public register(name: string, version: VersionId): void {
    if (this.versions.has(name)) throw new Error(`Version already registered: ${name}`);
    this.versions.set(name, Object.freeze({ ...version }));
  }

  public get(name: string): VersionId | null {
    return this.versions.get(name) ?? null;
  }

  public addMigration<TFrom, TTo>(schema: string, migration: Migration<TFrom, TTo>): void {
    const key = `${schema}:${migration.from.major}.${migration.from.minor}.${migration.from.patch}->${migration.to.major}.${migration.to.minor}.${migration.to.patch}`;
    this.migrations.set(key, migration as Migration<any, any>);
  }

  public migrate<T>(schema: string, envelope: VersionedEnvelope<T>, target: VersionId): VersionedEnvelope<unknown> {
    if (compare(envelope.version, target) === 0) return envelope;
    let current: any = envelope.payload;
    let version = envelope.version;
    const candidates = [...this.migrations.values()].sort((a, b) => compare(a.to, b.to));
    let guard = 0;
    while (compare(version, target) !== 0 && guard < 100) {
      const migration = candidates.find(item => item.from.major === version.major && item.from.minor === version.minor && item.from.patch === version.patch);
      if (!migration) throw new Error(`No migration path for ${schema} from ${version.major}.${version.minor}.${version.patch}.`);
      current = migration.migrate(current);
      version = migration.to;
      guard += 1;
    }
    if (compare(version, target) !== 0) throw new Error(`Incomplete migration path for ${schema}.`);
    return Object.freeze({ schema, version: Object.freeze({ ...version }), payload: current, fingerprint: hash32(stableSerialize(current)) });
  }
}
