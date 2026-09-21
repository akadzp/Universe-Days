/**
 * Phase 8: Story & Canon Protection Unit Tests
 *
 * Verifies that:
 * 1. Daily Story is NOT Canon.
 * 2. Referencing Universe entities in a story does not mutate universe state or retroactively canonize story data.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createGenericSeedUniverse,
  InMemoryUniverseRepository
} from '../../../core/universe/model/index.ts';
import { makeDomainID, makeSystemID } from '../../../core/types/identifiers.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 8: Story & Canon Protection', () => {
  const seed = createGenericSeedUniverse();
  const repo = new InMemoryUniverseRepository();

  it('1. Daily Story cannot mutate Universe Canon directly via repository write', () => {
    const storyActor = makeSystemID('DAILY_STORY_ORCHESTRATOR');
    const charDomain = makeDomainID('CHARACTER');

    const unauthorizedMutation = {
      ...seed.characters['CHAR_GENERIC_A'],
      identity: {
        ...seed.characters['CHAR_GENERIC_A'].identity,
        displayName: 'Non-canon Story Title Mutation'
      }
    };

    const res = repo.saveDomainEntity(charDomain, 'CHAR_GENERIC_A', unauthorizedMutation, storyActor);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, EngineErrorCode.UNAUTHORIZED_REPOSITORY_MUTATION);
  });

  it('2. Universe data model remains immutable when queried by story layers', () => {
    const charA = seed.characters['CHAR_GENERIC_A'];
    assert.throws(() => {
      (charA as any).identity = { ...charA.identity, displayName: 'Modified In Story' };
    });
  });
});
