/**
 * Generic Result types supporting standard architectural outcomes.
 *
 * Determinism:
 * Result timestamps are explicit metadata. The core default is 0.
 * Callers that require a runtime timestamp must provide it explicitly.
 */

export enum ResultStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  BLOCKED = 'BLOCKED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  CONFLICT = 'CONFLICT',
  NOT_FOUND = 'NOT_FOUND'
}

export interface Result<T = unknown, E = unknown> {
  status: ResultStatus;
  success?: boolean;
  data?: T;
  error?: E;
  message?: string;
  timestamp: number;
}

export const success = <T>(
  data?: T,
  message?: string,
  timestamp = 0
): Result<T, never> => ({
  status: ResultStatus.SUCCESS,
  success: true,
  data,
  message,
  timestamp
});

export const failure = <E>(
  error: E,
  message?: string,
  timestamp = 0
): Result<never, E> => ({
  status: ResultStatus.FAILURE,
  success: false,
  error,
  message,
  timestamp
});

export const blocked = <E>(
  error?: E,
  message?: string,
  timestamp = 0
): Result<never, E> => ({
  status: ResultStatus.BLOCKED,
  success: false,
  error,
  message,
  timestamp
});

export const reviewRequired = <T, E>(
  data?: T,
  error?: E,
  message?: string,
  timestamp = 0
): Result<T, E> => ({
  status: ResultStatus.REVIEW_REQUIRED,
  success: false,
  data,
  error,
  message,
  timestamp
});

export const conflict = <E>(
  error: E,
  message?: string,
  timestamp = 0
): Result<never, E> => ({
  status: ResultStatus.CONFLICT,
  success: false,
  error,
  message,
  timestamp
});

export const notFound = (
  message = 'Resource not found',
  timestamp = 0
): Result<never, string> => ({
  status: ResultStatus.NOT_FOUND,
  success: false,
  error: message,
  message,
  timestamp
});
