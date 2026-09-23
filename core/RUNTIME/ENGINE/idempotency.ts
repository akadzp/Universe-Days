/**
 * Phase 9: Idempotency Manager
 *
 * Enforces command idempotency based on command policy and correlation/idempotency keys.
 *
 * Timestamp values are runtime metadata supplied by an injected clock.
 * The default clock is deterministic.
 */

import { UniverseCommand } from './command.ts';
import { Result, success, failure, conflict } from '../../SHARED/result.ts';
import { EngineErrorCode } from '../../SHARED/errors.ts';
import { FixedRuntimeClock, RuntimeClock } from './runtime-clock.ts';

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
  private readonly runtimeClock: RuntimeClock;
  private records: Map<string, IdempotencyRecord> = new Map();

  constructor(runtimeClock: RuntimeClock = new FixedRuntimeClock()) {
    this.runtimeClock = runtimeClock;
  }

  public checkAndRegister(
    command: UniverseCommand
  ): Result<{ isDuplicate: boolean; previousRecord?: IdempotencyRecord }> {
    const key = command.idempotencyKey ||
      (command.isIdempotent ? command.commandId : undefined);

    if (!key) {
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
      existing.lastExecutedAt = this.runtimeClock.now();

      return success({
        isDuplicate: true,
        previousRecord: Object.freeze({ ...existing })
      });
    }

    const timestamp = this.runtimeClock.now();

    const record: IdempotencyRecord = {
      idempotencyKey: key,
      commandId: command.commandId,
      commandType: command.commandType,
      firstExecutedAt: timestamp,
      lastExecutedAt: timestamp,
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
