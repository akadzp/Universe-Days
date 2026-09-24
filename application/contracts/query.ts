/**
 * Application Boundary: Query Contracts.
 */

import { ActorContext } from './actor-context.ts';

export interface QueryHeader {
  readonly queryId: string;
  readonly queryType: string;
  readonly timestamp: number;
  readonly actor: ActorContext;
}

export interface ApplicationQuery<TParams = unknown> {
  readonly header: QueryHeader;
  readonly params: TParams;
}

export interface QueryResult<TData = unknown> {
  readonly success: boolean;
  readonly queryId: string;
  readonly timestamp: number;
  readonly data?: TData;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

export function successQueryResult<TData>(queryId: string, data: TData): QueryResult<TData> {
  return Object.freeze({
    success: true,
    queryId,
    timestamp: Date.now(),
    data
  });
}

export function failureQueryResult<TData = unknown>(queryId: string, code: string, message: string): QueryResult<TData> {
  return Object.freeze({
    success: false,
    queryId,
    timestamp: Date.now(),
    error: Object.freeze({
      code,
      message
    })
  });
}
