/**
 * Application Boundary: Command Contracts.
 */

import { ActorContext } from './actor-context.ts';

export interface CommandHeader {
  readonly commandId: string;
  readonly commandType: string;
  readonly timestamp: number;
  readonly actor: ActorContext;
  readonly correlationId?: string;
}

export interface ApplicationCommand<TPayload = unknown> {
  readonly header: CommandHeader;
  readonly payload: TPayload;
}

export interface CommandResult<TData = unknown> {
  readonly success: boolean;
  readonly commandId: string;
  readonly timestamp: number;
  readonly data?: TData;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

export function successCommandResult<TData>(commandId: string, data: TData): CommandResult<TData> {
  return Object.freeze({
    success: true,
    commandId,
    timestamp: Date.now(),
    data
  });
}

export function failureCommandResult<TData = unknown>(commandId: string, code: string, message: string, details?: unknown): CommandResult<TData> {
  return Object.freeze({
    success: false,
    commandId,
    timestamp: Date.now(),
    error: Object.freeze({
      code,
      message,
      details
    })
  });
}
