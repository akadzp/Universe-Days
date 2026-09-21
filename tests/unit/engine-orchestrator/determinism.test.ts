/**
 * Phase 9 Determinism Regression Tests
 *
 * These tests ensure the core execution path does not invent
 * wall-clock time or random identity values.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CommandValidator,
  PocerExecutionEngine,
  InMemoryUniverseRepository,
  createGenericSeedUniverse,
  FixedRuntimeClock,
  IdempotencyStore,
  makeSystemID,
  QueryProcessor,
  UniverseQuery
} from '../../../core/index.ts';

describe('Phase 9: Determinism Regression', () => {
  it('derives command defaults deterministically', () => {
    const input = {
      commandId: 'CMD_DETERMINISTIC_001',
      commandType: 'TEST',
      requestedBy: makeSystemID('ENGINE_SYSTEM'),
      universeContext: {
        universeId: 'UNIVERSE_GENERIC_SEED'
      }
    };

    const a = CommandValidator.validate(input);
    const b = CommandValidator.validate(input);

    assert.equal(a.success, true);
    assert.equal(b.success, true);
    assert.deepEqual(a.data, b.data);
    assert.equal(a.data?.requestedAt, 0);
    assert.equal(a.data?.correlationId, 'CORR_CMD_DETERMINISTIC_001');
  });

  it('produces identical execution identity, timestamps, traces and result metadata for identical inputs', async () => {
    const clock = new FixedRuntimeClock(424242);

    const repoA = new InMemoryUniverseRepository();
    const repoB = new InMemoryUniverseRepository();

    const seedA = createGenericSeedUniverse();
    const seedB = createGenericSeedUniverse();

    repoA.saveUniverse(seedA, makeSystemID('ENGINE_SYSTEM'));
    repoB.saveUniverse(seedB, makeSystemID('ENGINE_SYSTEM'));

    const engineA = new PocerExecutionEngine({
      repository: repoA,
      runtimeClock: clock
    });

    const engineB = new PocerExecutionEngine({
      repository: repoB,
      runtimeClock: new FixedRuntimeClock(424242)
    });

    const command = {
      commandId: 'CMD_DETERMINISTIC_002',
      commandType: 'DETERMINISTIC_EXECUTION',
      requestedBy: makeSystemID('ENGINE_SYSTEM'),
      universeContext: {
        universeId: seedA.universeId,
        universeTime: '2024-01-01T00:00:00Z'
      },
      executionMode: 'DRY_RUN' as const
    };

    const resultA = await engineA.executeCommand(command);
    const resultB = await engineB.executeCommand({
      ...command,
      universeContext: {
        ...command.universeContext,
        universeId: seedB.universeId
      }
    });

    assert.equal(resultA.success, true);
    assert.equal(resultB.success, true);
    assert.deepEqual(resultA, resultB);
    assert.equal(resultA.executionId, 'EXEC_CMD_DETERMINISTIC_002');
    assert.equal(resultA.executedAt, 424242);
    assert.equal(resultA.durationMs, 0);
    assert.ok(resultA.trace.every(entry => entry.timestamp === 424242));
  });

  it('uses deterministic requestedAt as query execution metadata', () => {
    const repo = new InMemoryUniverseRepository();
    const seed = createGenericSeedUniverse();
    repo.saveUniverse(seed, makeSystemID('ENGINE_SYSTEM'));

    const processor = new QueryProcessor(repo);

    const query: UniverseQuery = {
      queryId: 'Q_DETERMINISTIC_001',
      queryType: 'TEMPORAL',
      requestedBy: makeSystemID('ENGINE_SYSTEM'),
      universeId: seed.universeId,
      requestedAt: 919191
    };

    const first = processor.execute(query);
    const second = processor.execute(query);

    assert.equal(first.success, true);
    assert.deepEqual(first, second);
    assert.equal(first.data?.executedAt, 919191);
  });

  it('uses deterministic idempotency timestamps', () => {
    const command = CommandValidator.validate({
      commandId: 'CMD_DETERMINISTIC_003',
      commandType: 'TEST_IDEMPOTENCY',
      requestedBy: makeSystemID('ENGINE_SYSTEM'),
      universeContext: {
        universeId: 'UNIVERSE_GENERIC_SEED'
      },
      idempotencyKey: 'IDEMP_DETERMINISTIC_001'
    }).data!;

    const a = new IdempotencyStore(new FixedRuntimeClock(777));
    const b = new IdempotencyStore(new FixedRuntimeClock(777));

    const a1 = a.checkAndRegister(command);
    const b1 = b.checkAndRegister(command);

    assert.deepEqual(a1, b1);
    assert.equal(a1.data?.previousRecord, undefined);

    const a2 = a.checkAndRegister(command);
    const b2 = b.checkAndRegister(command);

    assert.deepEqual(a2, b2);
    assert.equal(a2.data?.previousRecord?.firstExecutedAt, 777);
    assert.equal(a2.data?.previousRecord?.lastExecutedAt, 777);
  });


});
