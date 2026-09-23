/** Phase 34 — hardened durable Universe snapshot storage. */

import * as fs from 'fs';
import * as path from 'path';
import type { UniverseModel } from '../../UNIVERSE/CANON/universe.ts';
import { UniverseModelValidator } from '../../VALIDATION/universe-model.ts';
import { UniverseSerializer } from '../../UNIVERSE/CANON/serialization.ts';
import { PersistenceError } from '../../INFRA/PERSISTENCE/file.ts';

export interface StoredUniversePointer {
  readonly universeId: string;
  readonly universeScope: string;
}

export interface FileUniverseSnapshotStoreOptions { readonly rootDir?: string; }
let atomicWriteCounter = 0;

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
}

export class FileUniverseSnapshotStore {
  private readonly rootDir: string;
  private readonly memory = new Map<string, UniverseModel>();
  private ready = false;

  public constructor(options?: FileUniverseSnapshotStoreOptions) {
    this.rootDir = path.resolve(options?.rootDir || process.env.POCER_UNIVERSE_DATA_DIR || './data/runtime/universes');
  }

  public getRootDir(): string { return this.rootDir; }

  private ensureDir(): void {
    if (this.ready) return;
    try {
      fs.mkdirSync(this.rootDir, { recursive: true });
      this.ready = true;
    } catch (error) {
      throw new PersistenceError(`Universe persistence directory could not be prepared: ${this.rootDir}`, { cause: error });
    }
  }

  private filePath(universeId: string): string {
    if (!/^[A-Za-z0-9_.:-]+$/.test(universeId)) throw new PersistenceError(`Unsafe Universe ID for persistence path: '${universeId}'.`);
    return path.join(this.rootDir, `${universeId}.json`);
  }

  private currentPointerPath(): string { return path.join(this.rootDir, 'current.json'); }

  private atomicWrite(filePath: string, content: string): void {
    const tempPath = `${filePath}.tmp.${process.pid}.${++atomicWriteCounter}`;
    try {
      fs.writeFileSync(tempPath, content, 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      try { fs.rmSync(tempPath, { force: true }); } catch { /* best effort cleanup */ }
      throw new PersistenceError(`Universe persistence write failed: ${filePath}`, { cause: error });
    }
  }

  public save(universe: UniverseModel): void {
    const validation = UniverseModelValidator.validate(universe);
    if (!validation.isValid) {
      const first = validation.issues.find(issue => issue.severity === 'ERROR');
      throw new PersistenceError(`Universe snapshot rejected: ${first?.message ?? 'Universe validation failed.'}`);
    }
    this.ensureDir();
    this.atomicWrite(this.filePath(universe.universeId), UniverseSerializer.serialize(universe));
    this.memory.set(universe.universeId, universe);
  }

  public load(universeId: string): UniverseModel | null {
    const cached = this.memory.get(universeId);
    if (cached) return cached;
    this.ensureDir();
    const filePath = this.filePath(universeId);
    try {
      const result = UniverseSerializer.deserialize(fs.readFileSync(filePath, 'utf8'));
      if (!result.success || !result.data) throw new PersistenceError(result.message ?? String(result.error ?? 'Universe snapshot deserialization failed.'));
      this.memory.set(universeId, result.data);
      return result.data;
    } catch (error) {
      if (isNotFound(error)) return null;
      if (error instanceof PersistenceError) throw error;
      throw new PersistenceError(`Universe persistence read failed: ${filePath}`, { cause: error });
    }
  }

  public has(universeId: string): boolean {
    if (this.memory.has(universeId)) return true;
    this.ensureDir();
    return fs.existsSync(this.filePath(universeId));
  }

  public setCurrent(pointer: StoredUniversePointer): void {
    if (!pointer.universeId.trim()) throw new PersistenceError('Current Universe pointer requires universeId.');
    if (!pointer.universeScope.trim()) throw new PersistenceError('Current Universe pointer requires universeScope.');
    if (pointer.universeScope === 'SANDBOX') throw new PersistenceError('SANDBOX Universe cannot become the persistent current pointer.');
    if (!this.has(pointer.universeId)) throw new PersistenceError(`Cannot point current Universe to missing snapshot '${pointer.universeId}'.`);
    this.ensureDir();
    this.atomicWrite(this.currentPointerPath(), JSON.stringify({ universeId: pointer.universeId, universeScope: pointer.universeScope }, null, 2));
  }

  public getCurrent(): StoredUniversePointer | null {
    this.ensureDir();
    try {
      const parsed = JSON.parse(fs.readFileSync(this.currentPointerPath(), 'utf8')) as StoredUniversePointer;
      if (!parsed?.universeId || !parsed?.universeScope) throw new PersistenceError('Persistent Universe current pointer is malformed.');
      if (parsed.universeScope === 'SANDBOX') throw new PersistenceError('Persistent Universe current pointer may not target SANDBOX.');
      if (!this.has(parsed.universeId)) throw new PersistenceError(`Persistent Universe current pointer references missing snapshot '${parsed.universeId}'.`);
      return Object.freeze({ universeId: String(parsed.universeId), universeScope: String(parsed.universeScope) });
    } catch (error) {
      if (isNotFound(error)) return null;
      if (error instanceof PersistenceError) throw error;
      throw new PersistenceError('Persistent Universe current pointer could not be read.', { cause: error });
    }
  }

  public clearCurrent(): void {
    this.ensureDir();
    try { fs.unlinkSync(this.currentPointerPath()); } catch (error) {
      if (!isNotFound(error)) throw new PersistenceError('Persistent Universe current pointer could not be cleared.', { cause: error });
    }
  }

  public listUniverseIds(): readonly string[] {
    this.ensureDir();
    try {
      const ids = fs.readdirSync(this.rootDir).filter(name => name.endsWith('.json') && name !== 'current.json').map(name => name.slice(0, -5)).sort();
      return Object.freeze(ids);
    } catch (error) {
      throw new PersistenceError(`Universe persistence directory could not be listed: ${this.rootDir}`, { cause: error });
    }
  }
}
