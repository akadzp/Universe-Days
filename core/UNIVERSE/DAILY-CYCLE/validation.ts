/**
 * Phase 5: Period Validation.
 * Deterministic validation functions for the Daily Universe lifecycle.
 */

import { UniversePeriod, DailyUniverseStatus } from '../../UNIVERSE/DAILY-CYCLE/period.ts';
import type { UniversePeriodContext } from './initialization.ts';
import { CarryoverBatchResult } from '../../UNIVERSE/DAILY-CYCLE/carryover.ts';
import { FinalizationResult } from '../../UNIVERSE/DAILY-CYCLE/finalization.ts';
import { NextPeriodContext } from '../../UNIVERSE/DAILY-CYCLE/next-period.ts';
import { ProgressionStepResult } from '../../UNIVERSE/DAILY-CYCLE/progression.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PeriodValidator {
  /**
   * Validates initialized period context.
   */
  public static validateInitialization(
    period: UniversePeriod,
    ctx: UniversePeriodContext
  ): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!period.periodId) {
      errors.push('Period is missing periodId');
    }
    if (!period.startTime) {
      errors.push('Period is missing startTime');
    }
    if (period.status !== DailyUniverseStatus.INITIALIZED) {
      errors.push(`Period status must be INITIALIZED, found ${period.status}`);
    }
    if (period.initializationState !== 'INITIALIZED') {
      errors.push(`Period initializationState must be INITIALIZED, found ${period.initializationState}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates carryover batch results.
   */
  public static validateCarryover(carryover: CarryoverBatchResult): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!carryover.allowed) {
      errors.push(...carryover.blockedReasons);
    }
    if (carryover.severity === 'REVIEW_REQUIRED') {
      warnings.push('Carryover has items requiring review');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates progression step result.
   */
  public static validateProgression(
    period: UniversePeriod,
    res: ProgressionStepResult
  ): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (period.status !== DailyUniverseStatus.PROGRESSING) {
      errors.push(`Period status must be PROGRESSING during progression, found ${period.status}`);
    }
    if (!res.universeTime) {
      errors.push('Progression result missing universeTime');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates finalization outcome.
   */
  public static validateFinalization(
    period: UniversePeriod,
    res: FinalizationResult
  ): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (period.status !== DailyUniverseStatus.FINALIZED) {
      errors.push(`Period status must be FINALIZED upon finalization, found ${period.status}`);
    }
    if (period.finalizationState !== 'FINALIZED') {
      errors.push(`Period finalizationState must be FINALIZED, found ${period.finalizationState}`);
    }
    if (!period.endTime) {
      errors.push('Finalized period must have an endTime');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates NextPeriodContext.
   */
  public static validateNextPeriodContext(nextCtx: NextPeriodContext): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!nextCtx.sourcePeriodId) {
      errors.push('NextPeriodContext missing sourcePeriodId');
    }
    if (!nextCtx.nextTemporalReference) {
      errors.push('NextPeriodContext missing nextTemporalReference');
    }
    if (!Array.isArray(nextCtx.continuityReferences)) {
      errors.push('NextPeriodContext continuityReferences must be an array');
    }
    if (!Array.isArray(nextCtx.activeProcesses)) {
      errors.push('NextPeriodContext activeProcesses must be an array');
    }
    if (!Array.isArray(nextCtx.unresolvedConditions)) {
      errors.push('NextPeriodContext unresolvedConditions must be an array');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
