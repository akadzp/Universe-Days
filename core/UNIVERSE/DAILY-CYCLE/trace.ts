/**
 * Phase 5: Period Execution Trace.
 * Compact, machine-readable, deterministic audit trail for Daily Universe operations.
 */

export interface PeriodExecutionTrace {
  traceId: string;
  operation: string;
  periodId: string;
  universeTime: string;
  previousState: string;
  transition?: string;
  result: string;
  affectedReferences: string[];
  validationResult: {
    valid: boolean;
    errors?: string[];
  };
  details?: Record<string, unknown>;
}

export class PeriodTraceRecorder {
  private traces: PeriodExecutionTrace[] = [];
  private counter = 0;

  public record(trace: Omit<PeriodExecutionTrace, 'traceId'>): PeriodExecutionTrace {
    this.counter++;
    const fullTrace: PeriodExecutionTrace = {
      traceId: `TRACE_P_${trace.periodId}_${String(this.counter).padStart(4, '0')}`,
      ...trace
    };
    this.traces.push(fullTrace);
    return fullTrace;
  }

  public getAll(): PeriodExecutionTrace[] {
    return [...this.traces];
  }

  public getByOperation(op: string): PeriodExecutionTrace[] {
    return this.traces.filter(t => t.operation === op);
  }

  public clear(): void {
    this.traces = [];
    this.counter = 0;
  }
}
