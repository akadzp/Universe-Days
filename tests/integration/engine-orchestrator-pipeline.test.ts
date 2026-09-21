/**
 * Phase 9 Integration Test: End-to-End Pocer Execution Engine Pipeline
 *
 * Runs full deterministic pipeline on generic universe data:
 * COMMAND
 * -> LOAD UNIVERSE CONTEXT
 * -> RESOLVE RULES
 * -> CHECK AUTHORITY
 * -> READ DOMAIN DATA
 * -> REQUEST DOMAIN CHANGE
 * -> DOMAIN APPLY
 * -> TEMPORAL VALIDATION
 * -> CONTINUITY VALIDATION
 * -> POST-VALIDATION
 * -> COMMIT
 * -> EXECUTION RESULT
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PocerExecutionEngine,
  InMemoryUniverseRepository,
  createGenericSeedUniverse,
  WorkflowDefinition,
  EngineExecutionStatus,
  EntityType,
  makeSystemID,
  makeDomainID,
  makeEntityID,
  EntityIdentityFactory,
  createProvenanceMetadata,
  CharacterEntity,
  success
} from '../../core/index.ts';

describe('Phase 9 Integration: End-to-End Pocer Execution Pipeline', () => {
  it('executes a complete multi-step domain mutation workflow deterministically', async () => {
    // 1. Initialize Repository & Seed State
    const repository = new InMemoryUniverseRepository();
    const seed = createGenericSeedUniverse();
    repository.saveUniverse(seed, makeSystemID('ENGINE_SYSTEM'));

    // 2. Initialize Engine
    const engine = new PocerExecutionEngine({ repository });

    // 3. Define Generic Multi-Step Workflow
    const workflow: WorkflowDefinition = {
      workflowId: 'WF_MOVE_CHARACTER_GENERIC',
      name: 'Move Character to Adjacent Location',
      steps: [
        {
          stepId: 'STEP_1_READ_CHARACTER',
          name: 'Read Initial Character State',
          executor: (ctx) => {
            const char = ctx.universeSnapshot.characters['CHAR_GENERIC_A'];
            assert.ok(char, 'Character Alpha must exist in universe');
            return success({ characterId: char.identity.id, currentLocation: char.locationReference });
          }
        },
        {
          stepId: 'STEP_2_MUTATE_AND_STAGE',
          name: 'Apply Location Update and Stage in Transaction',
          dependencies: ['STEP_1_READ_CHARACTER'],
          executor: (ctx, tx) => {
            const char = ctx.universeSnapshot.characters['CHAR_GENERIC_A'];
            const updatedChar: CharacterEntity = {
              ...char,
              identity: EntityIdentityFactory.create({
                id: 'CHAR_GENERIC_A',
                entityType: EntityType.CHARACTER,
                displayName: 'Generic Character Alpha (Relocated)'
              }),
              locationReference: 'LOC_GENERIC_B' // Moved to Location B
            };

            tx.stageMutation({
              domain: makeDomainID('CHARACTER'),
              entityId: 'CHAR_GENERIC_A',
              entityData: updatedChar,
              authoritativeOwner: makeSystemID('CHARACTER_SYSTEM')
            });

            return success({ updatedLocation: 'LOC_GENERIC_B' });
          }
        }
      ]
    };

    // 4. Dispatch Command
    const command = {
      commandId: 'CMD_INTEGRATION_001',
      commandType: 'MOVE_CHARACTER',
      requestedBy: makeSystemID('CHARACTER_SYSTEM'),
      target: {
        domain: makeDomainID('CHARACTER'),
        entityId: 'CHAR_GENERIC_A'
      },
      input: { destinationLocation: 'LOC_GENERIC_B' },
      universeContext: {
        universeId: seed.universeId,
        universeTime: '2024-01-01T04:00:00Z'
      },
      executionMode: 'TRANSACTIONAL' as const,
      idempotencyKey: 'IDEMP_INTEG_001'
    };

    const result = await engine.executeCommand(command, workflow);

    // 5. Assertions on Execution Result
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, EngineExecutionStatus.SUCCESS);
    assert.strictEqual(result.validationSummary.failedChecks, 0);
    assert.strictEqual(result.changedEntityRefs.includes('CHAR_GENERIC_A'), true);
    assert.strictEqual(result.trace.length > 0, true);

    // 6. Assertions on Persisted Snapshot in Repository
    const updatedUniverseRes = repository.getUniverse(seed.universeId);
    assert.strictEqual(updatedUniverseRes.success, true);
    assert.strictEqual(
      updatedUniverseRes.data?.characters['CHAR_GENERIC_A'].locationReference,
      'LOC_GENERIC_B'
    );
  });

  it('blocks unauthorized command request when actor lacks domain authority', async () => {
    const seed = createGenericSeedUniverse();
    const repository = new InMemoryUniverseRepository();
    repository.saveUniverse(seed, makeSystemID('ENGINE_SYSTEM'));
    const engine = new PocerExecutionEngine({ repository });

    const unauthorizedCommand = {
      commandId: 'CMD_UNAUTH_001',
      commandType: 'MUTATE_UNAUTHORIZED',
      requestedBy: 'UNAUTHORIZED_ROGUE_AGENT',
      target: {
        domain: makeDomainID('CHARACTER')
      },
      universeContext: { universeId: seed.universeId }
    };

    const result = await engine.executeCommand(unauthorizedCommand);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, EngineExecutionStatus.BLOCKED);
    assert.strictEqual(result.error?.code, 'COMMAND_UNAUTHORIZED');
  });
});
