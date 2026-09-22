/** Phase 34 — fail-fast durable Production Run persistence. */

import * as fs from 'fs';
import * as path from 'path';
import type {
  FileProductionStoreOptions,
  ListProductionRunsOptions,
  ProductionRunRecord
} from './types.ts';

let atomicWriteCounter = 0;

export class PersistenceError extends Error {
  public readonly code = 'PERSISTENCE_IO_ERROR';
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = 'PersistenceError';
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
}

export class FileProductionStore {
  private readonly rootDir: string;
  private isDirReady = false;
  private readonly memoryCache = new Map<string, ProductionRunRecord>();

  public constructor(options?: FileProductionStoreOptions) {
    this.rootDir = path.resolve(options?.rootDir || process.env.POCER_DATA_DIR || './data/runtime/production-runs');
  }

  public getRootDir(): string { return this.rootDir; }

  private ensureDir(): void {
    if (this.isDirReady) return;
    try {
      fs.mkdirSync(this.rootDir, { recursive: true });
      this.isDirReady = true;
    } catch (error) {
      throw new PersistenceError(`Production persistence directory could not be prepared: ${this.rootDir}`, { cause: error });
    }
  }

  private atomicWrite(filePath: string, serialized: string): void {
    const tempPath = `${filePath}.tmp.${process.pid}.${++atomicWriteCounter}`;
    try {
      fs.writeFileSync(tempPath, serialized, 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      try { fs.rmSync(tempPath, { force: true }); } catch { /* best effort cleanup */ }
      throw new PersistenceError(`Production persistence write failed: ${filePath}`, { cause: error });
    }
  }

  private filePath(runId: string): string {
    if (!/^[A-Za-z0-9_.:-]+$/.test(runId)) throw new PersistenceError(`Unsafe production run ID '${runId}'.`);
    return path.join(this.rootDir, `${runId}.json`);
  }

  public async save(record: ProductionRunRecord): Promise<void> {
    if (!record.runId) throw new PersistenceError('Production run persistence requires runId.');
    this.ensureDir();
    const filePath = this.filePath(record.runId);
    this.atomicWrite(filePath, JSON.stringify(record, null, 2));
    this.memoryCache.set(record.runId, Object.freeze({ ...record }));
  }

  public async get(runId: string): Promise<ProductionRunRecord | null> {
    const cached = this.memoryCache.get(runId);
    if (cached) return cached;
    this.ensureDir();
    const filePath = this.filePath(runId);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const record = JSON.parse(content) as ProductionRunRecord;
      if (!record.runId || record.runId !== runId) throw new PersistenceError(`Stored production run identity mismatch: ${runId}`);
      this.memoryCache.set(runId, Object.freeze({ ...record }));
      return this.memoryCache.get(runId)!;
    } catch (error) {
      if (isNotFound(error)) return null;
      if (error instanceof PersistenceError) throw error;
      throw new PersistenceError(`Production persistence read failed: ${filePath}`, { cause: error });
    }
  }

  public async list(options?: ListProductionRunsOptions): Promise<readonly ProductionRunRecord[]> {
    this.ensureDir();
    let files: string[];
    try {
      files = (await fs.promises.readdir(this.rootDir)).filter(file => file.endsWith('.json'));
    } catch (error) {
      throw new PersistenceError(`Production persistence directory could not be listed: ${this.rootDir}`, { cause: error });
    }

    const records: ProductionRunRecord[] = [];
    for (const file of files) {
      const runId = file.slice(0, -5);
      const cached = this.memoryCache.get(runId);
      if (cached) {
        records.push(cached);
        continue;
      }
      const filePath = path.join(this.rootDir, file);
      try {
        const parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as ProductionRunRecord;
        if (!parsed.runId || parsed.runId !== runId) throw new PersistenceError(`Stored production run identity mismatch: ${runId}`);
        const frozen = Object.freeze({ ...parsed });
        this.memoryCache.set(runId, frozen);
        records.push(frozen);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw new PersistenceError(`Production persistence read failed: ${filePath}`, { cause: error });
      }
    }

    records.sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.runId.localeCompare(a.runId));
    const filtered = options?.status ? records.filter(r => r.status === options.status) : records;
    const offset = Math.max(0, options?.offset ?? 0);
    const limit = options?.limit !== undefined ? Math.max(0, options.limit) : 25;
    return Object.freeze(filtered.slice(offset, offset + limit));
  }

  public async delete(runId: string): Promise<boolean> {
    this.ensureDir();
    const filePath = this.filePath(runId);
    try {
      await fs.promises.unlink(filePath);
      this.memoryCache.delete(runId);
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw new PersistenceError(`Production persistence delete failed: ${filePath}`, { cause: error });
    }
  }
}
