/**
 * Phase 9: Idempotency Manager
 *
 * Enforces command idempotency based on command policy and correlation/idempotency keys.
 */

import { UniverseCommand } from './command.ts';
import { Result, success, failure, conflict } from '../types/result.ts';
import { EngineErrorCode } from '../types/errors.ts';

export interface IdempotencyRecord {
  idempotencyKey: string;
  commandId: string;
  commandType: string;
  firstExecutedAt: number;
  lastExecutedAt: number;
  executionCount: number;
  result?: unknown;
}

export class IdempotencyStore {
  private records: Map<string, IdempotencyRecord> = new Map();

  public checkAndRegister(command: UniverseCommand): Result<{ isDuplicate: boolean; previousRecord?: IdempotencyRecord }> {
    const key = command.idempotencyKey || (command.isIdempotent ? command.commandId : undefined);

    if (!key) {
      // Non-idempotent command, allowed to execute
      return success({ isDuplicate: false });
    }

    const existing = this.records.get(key);
    if (existing) {
      if (existing.commandType !== command.commandType) {
        return conflict(
          EngineErrorCode.IDEMPOTENCY_CONFLICT,
          `Idempotency conflict: key "${key}" was previously used with commandType "${existing.commandType}", cannot reuse for "${command.commandType}".`
        );
      }

      existing.executionCount++;
      existing.lastExecutedAt = Date.now();
      return success({ isDuplicate: true, previousRecord: Object.freeze({ ...existing }) });
    }

    // Register new key
    const record: IdempotencyRecord = {
      idempotencyKey: key,
      commandId: command.commandId,
      commandType: command.commandType,
      firstExecutedAt: Date.now(),
      lastExecutedAt: Date.now(),
      executionCount: 1
    };

    this.records.set(key, record);
    return success({ isDuplicate: false });
  }

  public recordResult(key: string, result: unknown): void {
    const record = this.records.get(key);
    if (record) {
      record.result = Object.freeze(result);
    }
  }

  public clear(): void {
    this.records.clear();
  }
}
