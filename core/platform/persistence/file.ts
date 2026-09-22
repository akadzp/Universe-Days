/** Phase 30 — File-based Production Run Persistence.
 * Provides atomic, durable JSON persistence of production runs.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  FileProductionStoreOptions,
  ListProductionRunsOptions,
  ProductionRunRecord
} from './types.ts';

export class FileProductionStore {
  private readonly rootDir: string;
  private isDirReady = false;
  private readonly memoryCache = new Map<string, ProductionRunRecord>();

  public constructor(options?: FileProductionStoreOptions) {
    this.rootDir = path.resolve(
      options?.rootDir ||
      process.env.POCER_DATA_DIR ||
      './data/runtime/production-runs'
    );
  }

  public getRootDir(): string {
    return this.rootDir;
  }

  private async ensureDir(): Promise<void> {
    if (this.isDirReady) return;
    try {
      await fs.promises.mkdir(this.rootDir, { recursive: true });
      this.isDirReady = true;
    } catch {
      // In case directory creation fails, memory cache acts as fallback
    }
  }

  public async save(record: ProductionRunRecord): Promise<void> {
    this.memoryCache.set(record.runId, Object.freeze({ ...record }));
    await this.ensureDir();
    try {
      const filePath = path.join(this.rootDir, `${record.runId}.json`);
      const tempPath = `${filePath}.tmp.${Date.now()}`;
      const serialized = JSON.stringify(record, null, 2);
      await fs.promises.writeFile(tempPath, serialized, 'utf8');
      await fs.promises.rename(tempPath, filePath);
    } catch (err) {
      // If disk write fails, the record is safely retained in memoryCache
      console.warn(`[FileProductionStore] Failed to write to disk: ${String(err)}`);
    }
  }

  public async get(runId: string): Promise<ProductionRunRecord | null> {
    if (this.memoryCache.has(runId)) {
      return this.memoryCache.get(runId)!;
    }
    await this.ensureDir();
    try {
      const filePath = path.join(this.rootDir, `${runId}.json`);
      const content = await fs.promises.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content) as ProductionRunRecord;
      this.memoryCache.set(runId, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  public async list(options?: ListProductionRunsOptions): Promise<readonly ProductionRunRecord[]> {
    await this.ensureDir();
    const diskRecords: ProductionRunRecord[] = [];

    try {
      const files = await fs.promises.readdir(this.rootDir);
      for (const file of files) {
        if (!file.endsWith('.json') || file.endsWith('.tmp')) continue;
        const runId = file.replace(/\.json$/, '');
        if (this.memoryCache.has(runId)) {
          diskRecords.push(this.memoryCache.get(runId)!);
        } else {
          try {
            const content = await fs.promises.readFile(path.join(this.rootDir, file), 'utf8');
            const record = JSON.parse(content) as ProductionRunRecord;
            this.memoryCache.set(runId, record);
            diskRecords.push(record);
          } catch {
            // Ignore malformed files
          }
        }
      }
    } catch {
      // If readdir fails, fallback to memoryCache
      diskRecords.push(...this.memoryCache.values());
    }

    // Sort by timestamp descending
    diskRecords.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const filtered = options?.status
      ? diskRecords.filter(r => r.status === options.status)
      : diskRecords;

    const offset = Math.max(0, options?.offset ?? 0);
    const limit = options?.limit !== undefined ? Math.max(0, options.limit) : 25;

    return Object.freeze(filtered.slice(offset, offset + limit));
  }

  public async delete(runId: string): Promise<boolean> {
    this.memoryCache.delete(runId);
    await this.ensureDir();
    try {
      const filePath = path.join(this.rootDir, `${runId}.json`);
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
