/**
 * Phase 9: Command Model
 *
 * Defines the generic Universe Command model strictly separating
 * mutating Commands from read-only Queries and output Results.
 *
 * Determinism:
 * - No wall-clock fallback.
 * - No random fallback.
 * - requestedAt is caller-provided metadata; when omitted it is 0.
 * - correlationId defaults deterministically from commandId.
 */

import { DomainID, SystemID, makeSystemID, makeDomainID } from '../../SHARED/identifiers.ts';
import { Result, success, failure } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';

export type ExecutionMode = 'STRICT' | 'TRANSACTIONAL' | 'DRY_RUN' | 'PROVISIONAL';

export interface CommandTarget {
  entityId?: string;
  domain?: DomainID | string;
  entityType?: string;
  path?: string;
}

export interface UniverseContextRef {
  universeId: string;
  periodRef?: string;
  universeTime?: string;
}

export interface TemporalContextRef {
  effectiveTime?: string;
  expectedDurationMs?: number;
  temporalAnchor?: string;
}

export interface UniverseCommand<TInput = Record<string, unknown>> {
  commandId: string;
  commandType: string;
  requestedBy: SystemID | string;
  target?: CommandTarget;
  input: TInput;
  universeContext: UniverseContextRef;
  temporalContext?: TemporalContextRef;
  executionMode: ExecutionMode;
  requestedAt: number;
  correlationId: string;
  idempotencyKey?: string;
  isIdempotent?: boolean;
  metadata?: Record<string, unknown>;
}

export class CommandValidator {
  public static validate(command: Partial<UniverseCommand>): Result<UniverseCommand> {
    if (!command.commandId || typeof command.commandId !== 'string' || !command.commandId.trim()) {
      return failure(
        EngineErrorCode.INVALID_COMMAND,
        'Command validation failed: commandId is required and must be non-empty.'
      );
    }

    if (!command.commandType || typeof command.commandType !== 'string' || !command.commandType.trim()) {
      return failure(
        EngineErrorCode.INVALID_COMMAND,
        'Command validation failed: commandType is required.'
      );
    }

    if (!command.requestedBy || (typeof command.requestedBy === 'string' && !command.requestedBy.trim())) {
      return failure(
        EngineErrorCode.INVALID_COMMAND,
        'Command validation failed: requestedBy is required.'
      );
    }

    if (!command.universeContext || !command.universeContext.universeId) {
      return failure(
        EngineErrorCode.INVALID_COMMAND,
        'Command validation failed: universeContext with universeId is required.'
      );
    }

    const commandId = command.commandId.trim();

    const validated: UniverseCommand = {
      commandId,
      commandType: command.commandType.trim(),
      requestedBy: typeof command.requestedBy === 'string'
        ? makeSystemID(command.requestedBy.trim())
        : command.requestedBy,
      target: command.target
        ? {
            entityId: command.target.entityId?.trim(),
            domain: command.target.domain
              ? makeDomainID(String(command.target.domain).trim())
              : undefined,
            entityType: command.target.entityType?.trim(),
            path: command.target.path?.trim()
          }
        : undefined,
      input: command.input ?? {},
      universeContext: {
        universeId: command.universeContext.universeId.trim(),
        periodRef: command.universeContext.periodRef?.trim(),
        universeTime: command.universeContext.universeTime?.trim()
      },
      temporalContext: command.temporalContext
        ? {
            effectiveTime: command.temporalContext.effectiveTime?.trim(),
            expectedDurationMs: command.temporalContext.expectedDurationMs,
            temporalAnchor: command.temporalContext.temporalAnchor?.trim()
          }
        : undefined,
      executionMode: command.executionMode ?? 'TRANSACTIONAL',

      // Runtime must never invent nondeterministic time.
      requestedAt: command.requestedAt ?? 0,

      // Stable fallback derived only from explicit input.
      correlationId: command.correlationId?.trim() || `CORR_${commandId}`,

      idempotencyKey: command.idempotencyKey?.trim(),
      isIdempotent: command.isIdempotent ?? (command.idempotencyKey !== undefined),
      metadata: Object.freeze({ ...(command.metadata ?? {}) })
    };

    return success(Object.freeze(validated));
  }
}
