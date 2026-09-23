/** Phase 34 — hardened durable scheduler job state. */

import * as fs from 'fs';
import * as path from 'path';
import { freezeDeep } from '../../SHARED/platform.ts';
import type { ScheduledJob, ScheduledJobStatus } from '../../INFRA/SCHEDULER/types.ts';
import { PersistenceError } from '../../INFRA/PERSISTENCE/file.ts';

let atomicWriteCounter = 0;

export interface ScheduledJobRecord {
  readonly jobId: string;
  readonly scheduleId: string;
  readonly pageDefinitionId: string;
  readonly universeDate: string;
  readonly priority: number;
  readonly status: Exclude<ScheduledJobStatus, 'PENDING'>;
  readonly attempt: number;
  readonly universeTime: string;
  readonly productionRunId?: string;
  readonly reason?: string;
}

export interface ListScheduledJobsOptions {
  readonly universeDate?: string;
  readonly status?: ScheduledJobRecord['status'];
  readonly limit?: number;
}

export interface FileScheduledJobStoreOptions {
  readonly rootDir?: string;
}

const VALID_STATUSES: readonly ScheduledJobRecord['status'][] = ['DISPATCHED', 'COMPLETED', 'BLOCKED', 'FAILED', 'SKIPPED'];

function validateRecord(record: ScheduledJobRecord): void {
  if (!record.jobId || !/^[A-Za-z0-9_.:-]+$/.test(record.jobId)) throw new PersistenceError(`Invalid scheduled job ID '${record.jobId}'.`);
  if (!record.scheduleId || !record.pageDefinitionId || !record.universeDate || !record.universeTime) throw new PersistenceError(`Incomplete scheduled job record '${record.jobId}'.`);
  if (!VALID_STATUSES.includes(record.status)) throw new PersistenceError(`Invalid scheduled job status '${record.status}'.`);
  if (!Number.isInteger(record.attempt) || record.attempt < 1) throw new PersistenceError(`Invalid scheduled job attempt for '${record.jobId}'.`);
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
}

export class FileScheduledJobStore {
  private readonly rootDir: string;
  private ready = false;
  private readonly memory = new Map<string, ScheduledJobRecord>();

  public constructor(options?: FileScheduledJobStoreOptions) {
    this.rootDir = path.resolve(options?.rootDir || process.env.POCER_SCHEDULE_DATA_DIR || './data/runtime/scheduled-jobs');
  }

  public getRootDir(): string { return this.rootDir; }

  private ensureDir(): void {
    if (this.ready) return;
    try {
      fs.mkdirSync(this.rootDir, { recursive: true });
      this.ready = true;
    } catch (error) {
      throw new PersistenceError(`Scheduler persistence directory could not be prepared: ${this.rootDir}`, { cause: error });
    }
  }

  private filePath(jobId: string): string {
    if (!/^[A-Za-z0-9_.:-]+$/.test(jobId)) throw new PersistenceError(`Unsafe scheduled job ID '${jobId}'.`);
    return path.join(this.rootDir, `${jobId}.json`);
  }

  private atomicWrite(filePath: string, serialized: string): void {
    const tempPath = `${filePath}.tmp.${process.pid}.${++atomicWriteCounter}`;
    try {
      fs.writeFileSync(tempPath, serialized, 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      try { fs.rmSync(tempPath, { force: true }); } catch { /* best effort cleanup */ }
      throw new PersistenceError(`Scheduler persistence write failed: ${filePath}`, { cause: error });
    }
  }

  public async get(jobId: string): Promise<ScheduledJobRecord | null> {
    const cached = this.memory.get(jobId);
    if (cached) return cached;
    this.ensureDir();
    const filePath = this.filePath(jobId);
    try {
      const record = freezeDeep(JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as ScheduledJobRecord);
      validateRecord(record);
      this.memory.set(jobId, record);
      return record;
    } catch (error) {
      if (isNotFound(error)) return null;
      if (error instanceof PersistenceError) throw error;
      throw new PersistenceError(`Scheduler persistence read failed: ${filePath}`, { cause: error });
    }
  }

  public async save(record: ScheduledJobRecord): Promise<void> {
    validateRecord(record);
    this.ensureDir();
    const frozen = freezeDeep({ ...record });
    const target = this.filePath(record.jobId);
    this.atomicWrite(target, JSON.stringify(frozen, null, 2));
    this.memory.set(record.jobId, frozen);
  }

  public async list(options?: ListScheduledJobsOptions): Promise<readonly ScheduledJobRecord[]> {
    this.ensureDir();
    let files: string[];
    try {
      files = (await fs.promises.readdir(this.rootDir)).filter(item => item.endsWith('.json'));
    } catch (error) {
      throw new PersistenceError(`Scheduler persistence directory could not be listed: ${this.rootDir}`, { cause: error });
    }

    for (const file of files) {
      const jobId = file.slice(0, -5);
      if (this.memory.has(jobId)) continue;
      const filePath = path.join(this.rootDir, file);
      try {
        const record = freezeDeep(JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as ScheduledJobRecord);
        validateRecord(record);
        this.memory.set(jobId, record);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw new PersistenceError(`Scheduler persistence read failed: ${filePath}`, { cause: error });
      }
    }

    let records = [...this.memory.values()];
    if (options?.universeDate) records = records.filter(record => record.universeDate === options.universeDate);
    if (options?.status) records = records.filter(record => record.status === options.status);
    records.sort((a, b) => b.universeDate.localeCompare(a.universeDate) || b.priority - a.priority || a.jobId.localeCompare(b.jobId));
    return Object.freeze(records.slice(0, options?.limit ?? 200));
  }
}
