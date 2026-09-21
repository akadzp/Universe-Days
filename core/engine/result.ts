/**
 * Phase 9: Execution Result Model
 *
 * Defines the standard structured output of engine execution.
 * Avoids exceptions for business failures.
 */

import { ConflictRecord } from '../architecture/conflict.ts';
import { ExecutionTraceEntry } from './trace.ts';
import { ValidationRecord } from './context.ts';

export enum EngineExecutionStatus {
  SUCCESS = 'SUCCESS',
  BLOCKED = 'BLOCKED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface ValidationSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  violations: string[];
}

export interface ExecutionResult<TOutputs = Record<string, unknown>> {
  executionId: string;
  status: EngineExecutionStatus;
  success: boolean;
  outputs: TOutputs;
  validationSummary: ValidationSummary;
  conflicts: ConflictRecord[];
  trace: ReadonlyArray<ExecutionTraceEntry>;
  changedEntityRefs: string[];
  unresolvedConditions: string[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  executedAt: number;
  durationMs: number;
}

export class ExecutionResultBuilder {
  public static buildSummary(validations: ValidationRecord[]): ValidationSummary {
    let passed = 0;
    let failed = 0;
    const violations: string[] = [];

    for (const v of validations) {
      if (v.valid) {
        passed++;
      } else {
        failed++;
        violations.push(...v.violations);
      }
    }

    return {
      totalChecks: validations.length,
      passedChecks: passed,
      failedChecks: failed,
      violations
    };
  }
}
