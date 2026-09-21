/**
 * Phase 8: Repository Boundary & Ownership Enforcement Unit Tests
 *
 * Verifies that:
 * 1. Storage does NOT become authority.
 * 2. Non-owner actors are rejected when attempting direct domain writes.
 * 3. Authorized domain owners can persist entities and retrieve revision logs.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  InMemoryUniverseRepository,
  createGenericSeedUniverse
} from '../../../core/universe/model/index.ts';
import { makeDomainID, makeSystemID } from '../../../core/types/identifiers.ts';
import { EngineErrorCode } from '../../../core/types/errors.ts';

describe('Phase 8: Repository Boundary & Ownership Enforcement', () => {
  const repo = new InMemoryUniverseRepository();
  const seed = createGenericSeedUniverse();

  it('1. Saves and retrieves complete Universe model snapshots', () => {
    const actor = makeSystemID('UNIVERSE_ROOT_SYSTEM');
    const saveRes = repo.saveUniverse(seed, actor);
    assert.strictEqual(saveRes.success, true);

    const getRes = repo.getUniverse(seed.universeId);
    assert.strictEqual(getRes.success, true);
    assert.ok(getRes.data);
    assert.strictEqual(getRes.data?.universeId, seed.universeId);
  });

  it('2. Rejects direct entity save from unauthorized actor (Ownership Enforcement)', () => {
    const intruder = makeSystemID('UNAUTHORIZED_ACTOR');
    const charDomain = makeDomainID('CHARACTER');
    const char = seed.characters['CHAR_GENERIC_A'];

    const writeRes = repo.saveDomainEntity(charDomain, char.identity.id, char, intruder);
    assert.strictEqual(writeRes.success, false);
    assert.strictEqual(writeRes.error, EngineErrorCode.UNAUTHORIZED_REPOSITORY_MUTATION);
  });

  it('3. Allows authorized domain owner to save entity and tracks revisions', () => {
    const charOwner = makeSystemID('CHARACTER_SYSTEM');
    const charDomain = makeDomainID('CHARACTER');
    const char = seed.characters['CHAR_GENERIC_A'];

    const writeRes = repo.saveDomainEntity(charDomain, char.identity.id, char, charOwner);
    assert.strictEqual(writeRes.success, true);

    const getRes = repo.getDomainEntity(charDomain, char.identity.id);
    assert.strictEqual(getRes.success, true);
    assert.ok(getRes.data);
    assert.strictEqual((getRes.data as any)?.identity.id, char.identity.id);

    const revsRes = repo.getRevisions(char.identity.id);
    assert.strictEqual(revsRes.success, true);
    assert.ok(revsRes.data!.length >= 1);
  });
});
