/**
 * Phase 5: Ongoing Process Model & Management.
 * Ongoing processes cross period boundaries and cannot be automatically completed.
 */

import { TimePoint } from '../../temporal/time-point.ts';
import { Duration } from '../../temporal/duration.ts';
import { TraceabilityMetadata } from '../../types/common.ts';
import { makeRequestID, makeSystemID } from '../../types/identifiers.ts';
import { Result, success, failure } from '../../types/result.ts';
import { EngineErrorCode } from '../../types/errors.ts';

export enum UniverseProcessStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  SUSPENDED = 'SUSPENDED',
  INTERRUPTED = 'INTERRUPTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  UNRESOLVED = 'UNRESOLVED',
  UNKNOWN = 'UNKNOWN'
}

export interface ProcessTemporalScope {
  start?: TimePoint;
  expectedEnd?: TimePoint;
  maxDuration?: Duration;
}

export interface UniverseProcess {
  processId: string;
  startReference: string;
  currentStatus: UniverseProcessStatus;
  temporalScope?: ProcessTemporalScope;
  dependencies: string[];
  completionCriteria?: string[];
  metadata?: Record<string, unknown>;
  traceability: TraceabilityMetadata;
}

export interface CreateProcessParams {
  processId: string;
  startReference: string | TimePoint;
  initialStatus?: UniverseProcessStatus;
  temporalScope?: ProcessTemporalScope;
  dependencies?: string[];
  completionCriteria?: string[];
  metadata?: Record<string, unknown>;
}

export function createUniverseProcess(params: CreateProcessParams): UniverseProcess {
  const startRef = typeof params.startReference === 'string'
    ? params.startReference
    : params.startReference.toCanonical();

  return {
    processId: params.processId,
    startReference: startRef,
    currentStatus: params.initialStatus ?? UniverseProcessStatus.PLANNED,
    temporalScope: params.temporalScope,
    dependencies: params.dependencies ?? [],
    completionCriteria: params.completionCriteria ?? [],
    metadata: params.metadata,
    traceability: {
      requestId: makeRequestID(`REQ_PROC_${params.processId}`),
      sourceSystem: makeSystemID('DAILY_UNIVERSE_CORE'),
      timestamp: 0,
      version: '1.0.0'
    }
  };
}

export class ProcessRegistry {
  private processes: Map<string, UniverseProcess> = new Map();

  constructor(initialProcesses: UniverseProcess[] = []) {
    for (const p of initialProcesses) {
      this.register(p);
    }
  }

  public register(process: UniverseProcess): Result<void> {
    if (!process.processId) {
      return failure('Process must have an ID', EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }
    this.processes.set(process.processId, { ...process });
    return success(undefined);
  }

  public get(id: string): UniverseProcess | undefined {
    const found = this.processes.get(id);
    return found ? { ...found } : undefined;
  }

  public getAll(): UniverseProcess[] {
    return Array.from(this.processes.values()).map(p => ({ ...p }));
  }

  public getActiveProcesses(): UniverseProcess[] {
    return this.getAll().filter(p => p.currentStatus === UniverseProcessStatus.ACTIVE);
  }

  /**
   * Starts a planned process.
   */
  public start(processId: string): Result<UniverseProcess> {
    const proc = this.processes.get(processId);
    if (!proc) {
      return failure(`Process not found: ${processId}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }
    if (proc.currentStatus !== UniverseProcessStatus.PLANNED && proc.currentStatus !== UniverseProcessStatus.PAUSED) {
      return failure(`Cannot start process in status ${proc.currentStatus}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }

    const updated: UniverseProcess = {
      ...proc,
      currentStatus: UniverseProcessStatus.ACTIVE
    };
    this.processes.set(processId, updated);
    return success(updated);
  }

  /**
   * Pauses an active process.
   */
  public pause(processId: string): Result<UniverseProcess> {
    const proc = this.processes.get(processId);
    if (!proc) {
      return failure(`Process not found: ${processId}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }
    if (proc.currentStatus !== UniverseProcessStatus.ACTIVE) {
      return failure(`Cannot pause non-active process (${proc.currentStatus})`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }

    const updated: UniverseProcess = {
      ...proc,
      currentStatus: UniverseProcessStatus.PAUSED
    };
    this.processes.set(processId, updated);
    return success(updated);
  }

  /**
   * Interrupts an active process.
   */
  public interrupt(processId: string, reason?: string): Result<UniverseProcess> {
    const proc = this.processes.get(processId);
    if (!proc) {
      return failure(`Process not found: ${processId}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }
    if (proc.currentStatus !== UniverseProcessStatus.ACTIVE) {
      return failure(`Cannot interrupt non-active process (${proc.currentStatus})`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }

    const updated: UniverseProcess = {
      ...proc,
      currentStatus: UniverseProcessStatus.INTERRUPTED,
      metadata: { ...proc.metadata, interruptReason: reason }
    };
    this.processes.set(processId, updated);
    return success(updated);
  }

  /**
   * Resumes an interrupted process. Explicit transition required (no auto-resume).
   */
  public resumeInterrupted(processId: string): Result<UniverseProcess> {
    const proc = this.processes.get(processId);
    if (!proc) {
      return failure(`Process not found: ${processId}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }
    if (proc.currentStatus !== UniverseProcessStatus.INTERRUPTED && proc.currentStatus !== UniverseProcessStatus.PAUSED && proc.currentStatus !== UniverseProcessStatus.SUSPENDED) {
      return failure(`Cannot resume process in status ${proc.currentStatus}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }

    const updated: UniverseProcess = {
      ...proc,
      currentStatus: UniverseProcessStatus.ACTIVE
    };
    this.processes.set(processId, updated);
    return success(updated);
  }

  /**
   * Completes a process. Requires explicit satisfaction confirmation.
   * Day or period ending never completes a process automatically.
   */
  public complete(processId: string, explicitEvidence?: string): Result<UniverseProcess> {
    const proc = this.processes.get(processId);
    if (!proc) {
      return failure(`Process not found: ${processId}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }
    if (proc.currentStatus !== UniverseProcessStatus.ACTIVE && proc.currentStatus !== UniverseProcessStatus.PAUSED) {
      return failure(`Cannot complete process from status ${proc.currentStatus}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }

    const updated: UniverseProcess = {
      ...proc,
      currentStatus: UniverseProcessStatus.COMPLETED,
      metadata: { ...proc.metadata, completionEvidence: explicitEvidence }
    };
    this.processes.set(processId, updated);
    return success(updated);
  }

  /**
   * Cancels a process explicitly.
   */
  public cancel(processId: string, reason?: string): Result<UniverseProcess> {
    const proc = this.processes.get(processId);
    if (!proc) {
      return failure(`Process not found: ${processId}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }

    const updated: UniverseProcess = {
      ...proc,
      currentStatus: UniverseProcessStatus.CANCELLED,
      metadata: { ...proc.metadata, cancelReason: reason }
    };
    this.processes.set(processId, updated);
    return success(updated);
  }

  /**
   * Marks a process failed.
   */
  public fail(processId: string, reason?: string): Result<UniverseProcess> {
    const proc = this.processes.get(processId);
    if (!proc) {
      return failure(`Process not found: ${processId}`, EngineErrorCode.INVALID_PROCESS_TRANSITION);
    }

    const updated: UniverseProcess = {
      ...proc,
      currentStatus: UniverseProcessStatus.FAILED,
      metadata: { ...proc.metadata, failureReason: reason }
    };
    this.processes.set(processId, updated);
    return success(updated);
  }
}
