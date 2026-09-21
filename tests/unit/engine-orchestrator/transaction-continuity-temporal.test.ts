/**
 * Phase 9 Unit Tests: Transaction Boundary, Temporal & Continuity Integration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TransactionBoundary,
  ExecutionContext,
  CommandValidator,
  InMemoryUniverseRepository,
  createGenericSeedUniverse,
  CharacterEntity,
  EntityType,
  EntityLifecycleStatus,
  RevisionHistoryManager,
  TemporalStatus,
  makeSystemID,
  makeDomainID,
  makeEntityID,
  EntityIdentityFactory,
  createProvenanceMetadata,
  EngineErrorCode
} from '../../../core/index.ts';

describe('Phase 9: Transaction Boundary, Temporal & Continuity Integration', () => {
  const seed = createGenericSeedUniverse();
  const repo = new InMemoryUniverseRepository();
  repo.saveUniverse(seed, makeSystemID('ENGINE_SYSTEM'));

  const validCmd = CommandValidator.validate({
    commandId: 'CMD_TX_01',
    commandType: 'UPDATE_ENTITY',
    requestedBy: makeSystemID('CHARACTER_SYSTEM'),
    universeContext: { universeId: seed.universeId, universeTime: '2024-01-01T12:00:00Z' }
  }).data!;

  const createCtx = () =>
    new ExecutionContext({
      executionId: 'EXEC_TX_01',
      command: validCmd,
      universe: seed,
      actor: makeSystemID('CHARACTER_SYSTEM'),
      temporalContext: {
        universeTime: '2024-01-01T12:00:00Z',
        engineTime: Date.now()
      }
    });

  describe('1. Transaction Mutation Boundary & Atomic Commit', () => {
    it('successfully stages and commits a valid entity mutation', () => {
      const ctx = createCtx();
      const tx = new TransactionBoundary(repo, ctx.executionId);

      const prepRes = tx.prepare(ctx);
      assert.strictEqual(prepRes.success, true);

      const updatedChar: CharacterEntity = {
        identity: EntityIdentityFactory.create({
          id: 'CHAR_GENERIC_A',
          entityType: EntityType.CHARACTER,
          displayName: 'Character Alpha (Updated)',
          status: EntityLifecycleStatus.ACTIVE
        }),
        roleReferences: ['ROLE_EXPLORER'],
        stateReference: 'STATE_CHAR_A_01',
        knowledgeReferences: ['KNOW_GENERIC_01'],
        relationshipReferences: ['REL_GENERIC_A_B'],
        locationReference: 'LOC_GENERIC_B',
        temporalValidity: {
          effectiveFrom: '2024-01-01T00:00:00Z',
          temporalCategory: TemporalStatus.ACTUAL
        },
        continuityReference: 'CONT_CHAR_A_INITIAL',
        history: RevisionHistoryManager.createInitial(makeSystemID('CHARACTER_SYSTEM'), '2024-01-01T00:00:00Z'),
        provenance: createProvenanceMetadata(makeSystemID('CHARACTER_SYSTEM'), makeDomainID('CHARACTER'))
      };

      tx.stageMutation({
        domain: makeDomainID('CHARACTER'),
        entityId: 'CHAR_GENERIC_A',
        entityData: updatedChar,
        authoritativeOwner: makeSystemID('CHARACTER_SYSTEM')
      });

      assert.strictEqual(tx.getPendingCount(), 1);

      const commitRes = tx.postValidateAndCommit(ctx);
      assert.strictEqual(commitRes.success, true);
      assert.strictEqual(ctx.changedEntityRefs.has('CHAR_GENERIC_A'), true);

      // Verify persisted state in repository
      const getRes = repo.getUniverse(seed.universeId);
      assert.strictEqual(getRes.data?.characters['CHAR_GENERIC_A'].locationReference, 'LOC_GENERIC_B');
    });

    it('aborts transaction and does not mutate repository when post-validation fails', () => {
      const ctx = createCtx();
      const tx = new TransactionBoundary(repo, ctx.executionId);
      tx.prepare(ctx);

      // Intentionally introduce an invalid reference that violates schema integrity
      const brokenChar: CharacterEntity = {
        identity: EntityIdentityFactory.create({
          id: 'CHAR_GENERIC_A',
          entityType: EntityType.CHARACTER,
          displayName: 'Broken Ref Character',
          status: EntityLifecycleStatus.ACTIVE
        }),
        roleReferences: ['ROLE_EXPLORER'],
        stateReference: 'STATE_NON_EXISTENT_GHOST', // Dangling reference
        knowledgeReferences: [],
        relationshipReferences: [],
        locationReference: 'LOC_GENERIC_A',
        temporalValidity: {
          effectiveFrom: '2024-01-01T00:00:00Z',
          temporalCategory: TemporalStatus.ACTUAL
        },
        history: RevisionHistoryManager.createInitial(makeSystemID('CHARACTER_SYSTEM'), '2024-01-01T00:00:00Z'),
        provenance: createProvenanceMetadata(makeSystemID('CHARACTER_SYSTEM'), makeDomainID('CHARACTER'))
      };

      tx.stageMutation({
        domain: makeDomainID('CHARACTER'),
        entityId: 'CHAR_GENERIC_A',
        entityData: brokenChar,
        authoritativeOwner: makeSystemID('CHARACTER_SYSTEM')
      });

      const commitRes = tx.postValidateAndCommit(ctx);
      assert.strictEqual(commitRes.success, false);
      assert.strictEqual(commitRes.error, EngineErrorCode.TRANSACTION_POST_VALIDATION_FAILED);

      // Verify repository remains unaltered (no silent partial commit)
      const freshGet = repo.getUniverse(seed.universeId);
      assert.strictEqual(freshGet.data?.characters['CHAR_GENERIC_A'].stateReference, 'STATE_CHAR_A_01');
    });
  });
});
