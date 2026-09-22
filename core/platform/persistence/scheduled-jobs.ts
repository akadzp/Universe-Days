/** Phase 31 — durable scheduled job state. */

import * as fs from 'fs';
import * as path from 'path';
import { freezeDeep } from '../shared.ts';
import type { ScheduledJob, ScheduledJobStatus } from '../scheduler/types.ts';

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

export class FileScheduledJobStore {
  private readonly rootDir: string;
  private ready = false;
  private readonly memory = new Map<string, ScheduledJobRecord>();

  public constructor(options?: FileScheduledJobStoreOptions) {
    this.rootDir = path.resolve(
      options?.rootDir ||
      process.env.POCER_SCHEDULE_DATA_DIR ||
      './data/runtime/scheduled-jobs'
    );
  }

  public getRootDir(): string { return this.rootDir; }

  private async ensureDir(): Promise<void> {
    if (this.ready) return;
    await fs.promises.mkdir(this.rootDir, { recursive: true });
    this.ready = true;
  }

  public async get(jobId: string): Promise<ScheduledJobRecord | null> {
    const cached = this.memory.get(jobId);
    if (cached) return cached;
    await this.ensureDir();
    try {
      const raw = await fs.promises.readFile(path.join(this.rootDir, `${jobId}.json`), 'utf8');
      const record = freezeDeep(JSON.parse(raw) as ScheduledJobRecord);
      this.memory.set(jobId, record);
      return record;
    } catch {
      return null;
    }
  }

  public async save(record: ScheduledJobRecord): Promise<void> {
    const frozen = freezeDeep({ ...record });
    this.memory.set(record.jobId, frozen);
    await this.ensureDir();
    const target = path.join(this.rootDir, `${record.jobId}.json`);
    const temp = `${target}.tmp.${process.pid}`;
    await fs.promises.writeFile(temp, JSON.stringify(frozen, null, 2), 'utf8');
    await fs.promises.rename(temp, target);
  }

  public async list(options?: ListScheduledJobsOptions): Promise<readonly ScheduledJobRecord[]> {
    await this.ensureDir();
    let files: string[] = [];
    try { files = await fs.promises.readdir(this.rootDir); } catch { files = []; }

    for (const file of files.filter(item => item.endsWith('.json'))) {
      const jobId = file.slice(0, -5);
      if (this.memory.has(jobId)) continue;
      try {
        const raw = await fs.promises.readFile(path.join(this.rootDir, file), 'utf8');
        this.memory.set(jobId, freezeDeep(JSON.parse(raw) as ScheduledJobRecord));
      } catch { /* ignore malformed record */ }
    }

    let records = [...this.memory.values()];
    if (options?.universeDate) records = records.filter(record => record.universeDate === options.universeDate);
    if (options?.status) records = records.filter(record => record.status === options.status);
    records.sort((a, b) => b.universeDate.localeCompare(a.universeDate) || b.priority - a.priority || a.jobId.localeCompare(b.jobId));
    return Object.freeze(records.slice(0, options?.limit ?? 200));
  }
}
