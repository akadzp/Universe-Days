/**
 * Phase 9: Retry Policy
 *
 * Implements deterministic retry policy abstraction separating
 * transient infrastructure errors from permanent business/domain failures.
 */

import { EngineErrorCode } from '../../SHARED/errors.ts';

export type RetryStrategy = 'IMMEDIATE' | 'EXPONENTIAL_BACKOFF' | 'FIXED_DELAY';

export interface RetryPolicy {
  maxAttempts: number;
  strategy: RetryStrategy;
  initialDelayMs?: number;
  maxDelayMs?: number;
  retryableErrorCodes?: string[];
  nonRetryableErrorCodes?: string[];
}

export const DEFAULT_NON_RETRYABLE_ERRORS: ReadonlyArray<string> = Object.freeze([
  EngineErrorCode.UNAUTHORIZED_DOMAIN_ACCESS,
  EngineErrorCode.UNAUTHORIZED_DOMAIN_MUTATION,
  EngineErrorCode.UNAUTHORIZED_REPOSITORY_MUTATION,
  EngineErrorCode.COMMAND_UNAUTHORIZED,
  EngineErrorCode.DOMAIN_VALIDATION_FAILED,
  EngineErrorCode.UNIVERSE_VALIDATION_FAILED,
  EngineErrorCode.INVALID_STATE,
  EngineErrorCode.INVALID_TRANSITION,
  EngineErrorCode.INVALID_DATE,
  EngineErrorCode.INVALID_TIME,
  EngineErrorCode.TEMPORAL_CONFLICT,
  EngineErrorCode.CONTINUITY_CONFLICT,
  EngineErrorCode.CANON_MUTATION_PROHIBITED,
  EngineErrorCode.IDEMPOTENCY_CONFLICT,
  EngineErrorCode.WORKFLOW_CYCLE_DETECTED
]);

export class RetryEvaluator {
  public static isRetryable(
    error: { code?: string; message?: string } | string,
    policy?: RetryPolicy
  ): boolean {
    const errorCode = typeof error === 'string' ? error : (error.code ?? '');

    // Check non-retryable list first
    const nonRetryable = policy?.nonRetryableErrorCodes ?? DEFAULT_NON_RETRYABLE_ERRORS;
    if (nonRetryable.includes(errorCode)) {
      return false;
    }

    // Check explicitly retryable list if defined
    if (policy?.retryableErrorCodes && policy.retryableErrorCodes.length > 0) {
      return policy.retryableErrorCodes.includes(errorCode);
    }

    // Default: Business validation errors are non-retryable
    return false;
  }
}
