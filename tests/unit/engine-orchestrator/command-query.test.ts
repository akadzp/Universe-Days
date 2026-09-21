/**
 * Phase 9 Unit Tests: Command & Query Models
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CommandValidator,
  UniverseCommand,
  QueryProcessor,
  UniverseQuery,
  InMemoryUniverseRepository,
  createGenericSeedUniverse,
  makeSystemID,
  makeDomainID,
  EngineErrorCode
} from '../../../core/index.ts';

describe('Phase 9: Command & Query Models', () => {
  const seed = createGenericSeedUniverse();
  const repo = new InMemoryUniverseRepository();
  repo.saveUniverse(seed, makeSystemID('ENGINE_SYSTEM'));

  describe('1. Command Model & Validation', () => {
    it('validates a well-formed UniverseCommand', () => {
      const cmdRes = CommandValidator.validate({
        commandId: 'CMD_001',
        commandType: 'UPDATE_CHARACTER_LOCATION',
        requestedBy: makeSystemID('CHARACTER_SYSTEM'),
        target: {
          domain: makeDomainID('CHARACTER'),
          entityId: 'CHAR_GENERIC_A'
        },
        input: { targetLocationRef: 'LOC_GENERIC_B' },
        universeContext: { universeId: 'UNIVERSE_GENERIC_SEED' },
        executionMode: 'TRANSACTIONAL'
      });

      assert.strictEqual(cmdRes.success, true);
      assert.strictEqual(cmdRes.data?.commandId, 'CMD_001');
      assert.strictEqual(cmdRes.data?.executionMode, 'TRANSACTIONAL');
      assert.strictEqual(Object.isFrozen(cmdRes.data), true);
    });

    it('rejects invalid command missing commandId or commandType', () => {
      const res1 = CommandValidator.validate({
        commandType: 'TEST',
        requestedBy: 'SYSTEM',
        universeContext: { universeId: 'U1' }
      });
      assert.strictEqual(res1.success, false);
      assert.strictEqual(res1.error, EngineErrorCode.INVALID_COMMAND);

      const res2 = CommandValidator.validate({
        commandId: 'CMD_002',
        requestedBy: 'SYSTEM',
        universeContext: { universeId: 'U1' }
      });
      assert.strictEqual(res2.success, false);
    });

    it('rejects command missing universeContext or universeId', () => {
      const res = CommandValidator.validate({
        commandId: 'CMD_003',
        commandType: 'TEST',
        requestedBy: 'SYSTEM'
      });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, EngineErrorCode.INVALID_COMMAND);
    });
  });

  describe('2. Query Model & Read Isolation', () => {
    const processor = new QueryProcessor(repo);

    it('executes read query for an entity without mutating repository state', () => {
      const query: UniverseQuery = {
        queryId: 'Q_001',
        queryType: 'ENTITY',
        requestedBy: makeSystemID('NARRATOR_SYSTEM'),
        universeId: seed.universeId,
        targetDomain: makeDomainID('CHARACTER'),
        targetEntityId: 'CHAR_GENERIC_A',
        requestedAt: Date.now()
      };

      const res = processor.execute<any>(query);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data?.readOnly, true);
      assert.strictEqual(res.data?.data?.identity?.id, 'CHAR_GENERIC_A');
      assert.strictEqual(Object.isFrozen(res.data?.data), true);
    });

    it('reads state, temporal context, and unresolved conditions accurately', () => {
      const temporalQuery: UniverseQuery = {
        queryId: 'Q_002',
        queryType: 'TEMPORAL',
        requestedBy: makeSystemID('DAILY_STORY_SYSTEM'),
        universeId: seed.universeId,
        requestedAt: Date.now()
      };

      const res = processor.execute<any>(temporalQuery);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.data?.data?.currentUniverseTime, '2024-01-01T00:00:00Z');
    });

    it('returns error when querying non-existent universe', () => {
      const query: UniverseQuery = {
        queryId: 'Q_003',
        queryType: 'ENTITY',
        requestedBy: 'ACTOR',
        universeId: 'NON_EXISTENT_UNIVERSE',
        targetEntityId: 'CHAR_01',
        requestedAt: Date.now()
      };

      const res = processor.execute(query);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.error, EngineErrorCode.UNIVERSE_VALIDATION_FAILED);
    });
  });
});
