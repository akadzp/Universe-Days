/**
 * Phase 9: Execution Trace
 *
 * Provides structured execution tracing for auditability, debugging,
 * and deterministic inspection.
 */

import { SystemID, DomainID } from '../types/identifiers.ts';

export interface ExecutionTraceEntry {
  executionId: string;
  stepId: string;
  timestamp: number;
  action: string;
  owner?: SystemID | string;
  domain?: DomainID | string;
  inputRef?: string;
  resultStatus: string;
  ruleRefs?: string[];
  validationRefs?: string[];
  details?: Record<string, unknown>;
}

export class ExecutionTracer {
  private entries: ExecutionTraceEntry[] = [];

  constructor(private readonly executionId: string) {}

  public record(entry: Omit<ExecutionTraceEntry, 'executionId' | 'timestamp'>): void {
    const traceItem: ExecutionTraceEntry = Object.freeze({
      executionId: this.executionId,
      timestamp: Date.now(),
      ...entry,
      ruleRefs: entry.ruleRefs ? Object.freeze([...entry.ruleRefs]) : undefined,
      validationRefs: entry.validationRefs ? Object.freeze([...entry.validationRefs]) : undefined,
      details: entry.details ? Object.freeze({ ...entry.details }) : undefined
    });

    this.entries.push(traceItem);
  }

  public getTrace(): ReadonlyArray<ExecutionTraceEntry> {
    return Object.freeze([...this.entries]);
  }

  public getEntriesByStep(stepId: string): ExecutionTraceEntry[] {
    return this.entries.filter(e => e.stepId === stepId);
  }

  public clear(): void {
    this.entries = [];
  }
}
