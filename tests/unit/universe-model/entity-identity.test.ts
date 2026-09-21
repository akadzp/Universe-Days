/**
 * Phase 8: Entity Identity Unit Tests
 *
 * Verifies stable identity generation, immutability, decoupling from display names/indices,
 * and valid ID format checking.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EntityIdentityFactory, EntityType, EntityLifecycleStatus } from '../../../core/universe/model/index.ts';
import { makeEntityID } from '../../../core/types/identifiers.ts';

describe('Phase 8: Entity Identity Model', () => {
  it('1. Generates frozen, immutable EntityIdentity with stable ID decoupled from display name', () => {
    const identity = EntityIdentityFactory.create({
      id: 'CHAR_STABLE_001',
      entityType: EntityType.CHARACTER,
      displayName: 'Lady Vespera',
      status: EntityLifecycleStatus.ACTIVE,
      tags: ['noble', 'archivist']
    });

    assert.strictEqual(identity.id, 'CHAR_STABLE_001');
    assert.strictEqual(identity.displayName, 'Lady Vespera');
    assert.strictEqual(identity.entityType, EntityType.CHARACTER);
    assert.strictEqual(identity.status, EntityLifecycleStatus.ACTIVE);
    assert.ok(Array.isArray(identity.tags));
    assert.strictEqual(identity.tags?.length, 2);

    // Verify immutability
    assert.throws(() => {
      (identity as any).displayName = 'Renamed Princess';
    });
  });

  it('2. Rejects blank or whitespace-only IDs', () => {
    assert.throws(() => {
      EntityIdentityFactory.create({
        id: '',
        entityType: EntityType.OBJECT,
        displayName: 'Amulet'
      });
    });

    assert.throws(() => {
      EntityIdentityFactory.create({
        id: '   ',
        entityType: EntityType.OBJECT,
        displayName: 'Amulet'
      });
    });
  });

  it('3. Correctly validates well-formed and malformed stable identifiers', () => {
    assert.strictEqual(EntityIdentityFactory.isValidId('CHAR_001'), true);
    assert.strictEqual(EntityIdentityFactory.isValidId('LOC_REALM_NORTH_02'), true);
    assert.strictEqual(EntityIdentityFactory.isValidId('OBJ:ARTIFACT:01'), true);
    assert.strictEqual(EntityIdentityFactory.isValidId(''), false);
    assert.strictEqual(EntityIdentityFactory.isValidId('A'), false); // Too short
    assert.strictEqual(EntityIdentityFactory.isValidId('CHAR WITH SPACES'), false);
  });
});
