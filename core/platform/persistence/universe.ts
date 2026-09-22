/** Phase 03 — durable Universe snapshot storage.
 *
 * This class is storage only. It never decides what Universe is authoritative and
 * never exposes a mutation API to domain callers. Authority remains with the
 * UniverseInstanceManager + UniverseAuthorityStore boundary.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { UniverseModel } from '../../universe/model/universe.ts';
import { UniverseModelValidator } from '../../universe/model/validation.ts';
import { UniverseSerializer } from '../../universe/model/serialization.ts';

export interface StoredUniversePointer {
  readonly universeId: string;
  readonly universeScope: string;
}

export interface FileUniverseSnapshotStoreOptions {
  readonly rootDir?: string;
}

let atomicWriteCounter = 0;

export class FileUniverseSnapshotStore {
  private readonly rootDir: string;
  private readonly memory = new Map<string, UniverseModel>();
  private ready = false;

  public constructor(options?: FileUniverseSnapshotStoreOptions) {
    this.rootDir = path.resolve(
      options?.rootDir ||
      process.env.POCER_UNIVERSE_DATA_DIR ||
      './data/runtime/universes'
    );
  }

  public getRootDir(): string {
    return this.rootDir;
  }

  private ensureDir(): void {
    if (this.ready) return;
    fs.mkdirSync(this.rootDir, { recursive: true });
    this.ready = true;
  }

  private filePath(universeId: string): string {
    if (!/^[A-Za-z0-9_.:-]+$/.test(universeId)) {
      throw new Error(`Unsafe Universe ID for persistence path: '${universeId}'.`);
    }
    return path.join(this.rootDir, `${universeId}.json`);
  }

  private currentPointerPath(): string {
    return path.join(this.rootDir, 'current.json');
  }

  private atomicWrite(filePath: string, content: string): void {
    const tempPath = `${filePath}.tmp.${process.pid}.${++atomicWriteCounter}`;
    fs.writeFileSync(tempPath, content, 'utf8');
    fs.renameSync(tempPath, filePath);
  }

  public save(universe: UniverseModel): void {
    const validation = UniverseModelValidator.validate(universe);
    if (!validation.isValid) {
      const first = validation.issues.find(issue => issue.severity === 'ERROR');
      throw new Error(`Universe snapshot rejected: ${first?.message ?? 'Universe validation failed.'}`);
    }

    this.ensureDir();
    const filePath = this.filePath(universe.universeId);
    const serialized = UniverseSerializer.serialize(universe);
    this.atomicWrite(filePath, serialized);
    this.memory.set(universe.universeId, universe);
  }

  public load(universeId: string): UniverseModel | null {
    const cached = this.memory.get(universeId);
    if (cached) return cached;

    this.ensureDir();
    const filePath = this.filePath(universeId);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf8');
    const result = UniverseSerializer.deserialize(raw);
    if (!result.success) {
      const message = typeof result.error === 'object' && result.error && 'message' in result.error
        ? String((result.error as { message?: unknown }).message)
        : String(result.message ?? result.error ?? 'Universe snapshot deserialization failed.');
      throw new Error(message);
    }

    if (!result.data) {
      throw new Error('Universe snapshot deserialization returned no model.');
    }

    this.memory.set(universeId, result.data);
    return result.data;
  }

  public has(universeId: string): boolean {
    if (this.memory.has(universeId)) return true;
    this.ensureDir();
    return fs.existsSync(this.filePath(universeId));
  }

  public setCurrent(pointer: StoredUniversePointer): void {
    if (!pointer.universeId.trim()) throw new Error('Current Universe pointer requires universeId.');
    if (!pointer.universeScope.trim()) throw new Error('Current Universe pointer requires universeScope.');
    if (pointer.universeScope === 'SANDBOX') throw new Error('SANDBOX Universe cannot become the persistent current pointer.');
    this.ensureDir();
    this.atomicWrite(this.currentPointerPath(), JSON.stringify(pointer, null, 2));
  }

  public getCurrent(): StoredUniversePointer | null {
    this.ensureDir();
    const pointerPath = this.currentPointerPath();
    if (!fs.existsSync(pointerPath)) return null;

    try {
      const parsed = JSON.parse(fs.readFileSync(pointerPath, 'utf8')) as StoredUniversePointer;
      if (!parsed?.universeId || !parsed?.universeScope) return null;
      if (String(parsed.universeScope) === 'SANDBOX') return null;
      return Object.freeze({
        universeId: String(parsed.universeId),
        universeScope: String(parsed.universeScope)
      });
    } catch {
      throw new Error('Persistent Universe current pointer is malformed.');
    }
  }

  public clearCurrent(): void {
    this.ensureDir();
    const pointerPath = this.currentPointerPath();
    if (fs.existsSync(pointerPath)) fs.unlinkSync(pointerPath);
  }

  public listUniverseIds(): readonly string[] {
    this.ensureDir();
    const ids = fs.readdirSync(this.rootDir)
      .filter(name => name.endsWith('.json') && name !== 'current.json')
      .map(name => name.slice(0, -5))
      .sort();
    return Object.freeze(ids);
  }
}
