/**
 * Phase 12: Shared validation contracts.
 * Validation observes system state; it does not repair or mutate it.
 */

export type ValidationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CONFLICT' | 'BLOCKED';
export type ValidationStatus = 'VALID' | 'REVIEW_REQUIRED' | 'INVALID' | 'CONFLICT' | 'BLOCKED';

export interface ValidationFinding {
  readonly checkId: string;
  readonly code: string;
  readonly path?: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

export interface ValidationReport {
  readonly status: ValidationStatus;
  readonly valid: boolean;
  readonly findings: readonly ValidationFinding[];
  readonly checksRun: readonly string[];
}

export interface ValidationCheck<TInput = unknown> {
  readonly id: string;
  readonly order?: number;
  readonly validate: (input: TInput) => readonly ValidationFinding[];
}

export enum ModelValidationStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
  REQUIRES_REVALIDATION = 'REQUIRES_REVALIDATION'
}
