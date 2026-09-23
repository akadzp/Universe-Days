/**
 * Phase 12: deterministic validation harness.
 */

import { stableSerialize } from '../SHARED/determinism.ts';
import {
  ValidationCheck,
  ValidationFinding,
  ValidationReport,
  ValidationStatus
} from '../VALIDATION/types.ts';

export class ValidationHarness {
  public static run<TInput>(
    input: TInput,
    checks: readonly ValidationCheck<TInput>[]
  ): ValidationReport {
    const ordered = [...checks].sort((a, b) =>
      (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id)
    );

    const findings: ValidationFinding[] = [];
    const checksRun: string[] = [];

    for (const check of ordered) {
      checksRun.push(check.id);
      try {
        findings.push(...check.validate(input));
      } catch (error) {
        findings.push({
          checkId: check.id,
          code: 'VALIDATION_CHECK_EXCEPTION',
          message: error instanceof Error ? error.message : String(error),
          severity: 'ERROR'
        });
      }
    }

    return this.buildReport(findings, checksRun);
  }

  public static buildReport(
    findings: readonly ValidationFinding[],
    checksRun: readonly string[] = []
  ): ValidationReport {
    const hasBlocked = findings.some(f => f.severity === 'BLOCKED');
    const hasConflict = findings.some(f => f.severity === 'CONFLICT');
    const hasErrors = findings.some(f => f.severity === 'ERROR');
    const hasWarnings = findings.some(f => f.severity === 'WARNING');

    let status: ValidationStatus = 'VALID';
    if (hasBlocked) status = 'BLOCKED';
    else if (hasConflict) status = 'CONFLICT';
    else if (hasErrors) status = 'INVALID';
    else if (hasWarnings) status = 'REVIEW_REQUIRED';

    return Object.freeze({
      status,
      valid: status === 'VALID' || status === 'REVIEW_REQUIRED',
      findings: Object.freeze([...findings]),
      checksRun: Object.freeze([...checksRun])
    });
  }

  public static assertNonMutation<TInput>(
    input: TInput,
    operation: (value: TInput) => unknown
  ): ValidationFinding[] {
    const before = stableSerialize(input);
    operation(input);
    const after = stableSerialize(input);

    if (before === after) return [];

    return [{
      checkId: 'NON_MUTATION',
      code: 'VALIDATION_MUTATED_INPUT',
      message: 'Validation operation mutated its input.',
      severity: 'ERROR'
    }];
  }
}
