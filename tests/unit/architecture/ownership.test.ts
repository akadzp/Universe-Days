import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getOwner, isKnownDomain, DOMAIN_OWNERS } from '../../../core/architecture/ownership.ts';
import { makeDomainID } from '../../../core/types/identifiers.ts';

describe('Architecture Core - Ownership', () => {
  it('1. Known domain returns correct owner', () => {
    const temporalOwner = getOwner('TEMPORAL');
    assert.ok(temporalOwner, 'Temporal owner must be found');
    assert.strictEqual(temporalOwner.ownerId, 'TEMPORAL_SYSTEM');
    assert.strictEqual(temporalOwner.domainId, 'TEMPORAL');
    assert.strictEqual(temporalOwner.authorityLevel, 1);

    const characterOwner = getOwner('CHARACTER');
    assert.ok(characterOwner, 'Character owner must be found');
    assert.strictEqual(characterOwner.ownerId, 'CHARACTER_SYSTEM');
  });

  it('2. Unknown domain is rejected', () => {
    const unknownOwner = getOwner('NON_EXISTENT_COSMOS');
    assert.strictEqual(unknownOwner, undefined, 'Unknown domain must return undefined');

    const isKnown = isKnownDomain('FICTIONAL_REALM');
    assert.strictEqual(isKnown, false, 'Unknown domain must be marked as not known');
  });

  it('3. Same domain does not return multiple owners', () => {
    const domainKeys = Object.keys(DOMAIN_OWNERS);
    for (const key of domainKeys) {
      const owner1 = getOwner(key);
      const owner2 = getOwner(makeDomainID(key));
      assert.ok(owner1, `Owner for ${key} must exist`);
      assert.deepStrictEqual(owner1, owner2, `Domain ${key} must resolve to a single unique owner`);
    }
  });

  it('4. Ownership lookup is deterministic', () => {
    for (let i = 0; i < 50; i++) {
      const ownerA = getOwner('DAILY_UNIVERSE');
      const ownerB = getOwner('DAILY_UNIVERSE');
      assert.strictEqual(ownerA?.ownerId, 'DAILY_UNIVERSE_SYSTEM');
      assert.strictEqual(ownerA?.ownerId, ownerB?.ownerId);
      assert.strictEqual(ownerA?.authorityLevel, ownerB?.authorityLevel);
    }
  });
});
