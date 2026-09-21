/**
 * Generic Result types supporting standard architectural outcomes.
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

export const success = <T>(data?: T, message?: string): Result<T, never> => ({
  status: ResultStatus.SUCCESS,
  success: true,
  data,
  message,
  timestamp: Date.now()
});

export const failure = <E>(error: E, message?: string): Result<never, E> => ({
  status: ResultStatus.FAILURE,
  success: false,
  error,
  message,
  timestamp: Date.now()
});

export const blocked = <E>(error?: E, message?: string): Result<never, E> => ({
  status: ResultStatus.BLOCKED,
  success: false,
  error,
  message,
  timestamp: Date.now()
});

export const reviewRequired = <T, E>(data?: T, error?: E, message?: string): Result<T, E> => ({
  status: ResultStatus.REVIEW_REQUIRED,
  success: false,
  data,
  error,
  message,
  timestamp: Date.now()
});

export const conflict = <E>(error: E, message?: string): Result<never, E> => ({
  status: ResultStatus.CONFLICT,
  success: false,
  error,
  message,
  timestamp: Date.now()
});

export const notFound = (message = 'Resource not found'): Result<never, string> => ({
  status: ResultStatus.NOT_FOUND,
  success: false,
  error: message,
  message,
  timestamp: Date.now()
});
