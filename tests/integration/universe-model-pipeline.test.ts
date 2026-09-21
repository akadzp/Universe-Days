/**
 * Phase 8: Universe Data Model End-to-End Integration Pipeline Test
 *
 * Integrates:
 * - Phase 3: Temporal Engine (TimePoint, UniverseDate, TemporalStatus)
 * - Phase 4: Continuity Engine (Continuity references, conditions)
 * - Phase 5: Daily Universe (Period context, Carryover processes/unresolved conditions)
 * - Phase 6: Daily Story (Canon protection, read-only references)
 * - Phase 7: Domain System Integration (DomainGateway, DomainRegistry, single ownership)
 * - Phase 8: Universe Data Model (Root container, typed domain entities, repository, validation, serialization)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createGenericSeedUniverse,
  UniverseModelValidator,
  UniverseSerializer,
  InMemoryUniverseRepository,
  EntityTypeRegistry,
  EntityType
} from '../../core/universe/model/index.ts';
import {
  DomainGateway,
  CHARACTER_DOMAIN_ID,
  CHARACTER_OWNER_ID,
  registerAllMockDomainAdapters
} from '../../core/domains/index.ts';
import { makeRequestID, makeSystemID, makeDomainID } from '../../core/types/identifiers.ts';

describe('Phase 8: Universe Model End-to-End Pipeline Integration', () => {
  registerAllMockDomainAdapters();
  const repo = new InMemoryUniverseRepository();
  const seed = createGenericSeedUniverse();

  it('1. Validates registered entity type architecture metadata in EntityTypeRegistry', () => {
    const allMeta = EntityTypeRegistry.getAll();
    assert.strictEqual(allMeta.length, 9);

    const charMeta = EntityTypeRegistry.get(EntityType.CHARACTER);
    assert.ok(charMeta);
    assert.strictEqual(charMeta?.domainId, 'CHARACTER');
    assert.strictEqual(charMeta?.supportsTemporalValidity, true);
    assert.strictEqual(charMeta?.supportsHistoryRevision, true);
    assert.ok(charMeta?.relationCapabilities.includes('LOCATION'));
  });

  it('2. Passes full Universe model validation without issues', () => {
    const report = UniverseModelValidator.validate(seed);
    assert.strictEqual(report.isValid, true);
    assert.strictEqual(report.issues.length, 0);
  });

  it('3. Interacts with DomainGateway while maintaining Phase 7 single-owner authority', () => {
    const universe = makeSystemID('UNIVERSE_SEED_01');
    const queryRes = DomainGateway.query(universe, CHARACTER_DOMAIN_ID, {
      requestId: makeRequestID('REQ_PIPELINE_01'),
      sourceSystem: universe,
      targetDomain: CHARACTER_DOMAIN_ID,
      operation: 'GET_CHARACTER',
      entityReference: 'CHAR_GENERIC_A'
    });

    assert.strictEqual(queryRes.success, true);
    assert.strictEqual(queryRes.data?.owner, CHARACTER_OWNER_ID);
  });

  it('4. Serializes, persists, retrieves, and deserializes universe state losslessly', () => {
    // Save to repository
    const actor = makeSystemID('UNIVERSE_ROOT_SYSTEM');
    const saveRes = repo.saveUniverse(seed, actor);
    assert.strictEqual(saveRes.success, true);

    // Retrieve from repository
    const getRes = repo.getUniverse('UNIVERSE_SEED_01');
    assert.strictEqual(getRes.success, true);
    assert.ok(getRes.data);

    // Serialize
    const json = UniverseSerializer.serialize(getRes.data!);
    assert.ok(json.length > 0);

    // Deserialize
    const restored = UniverseSerializer.deserialize(json);
    assert.strictEqual(restored.success, true);
    assert.strictEqual(restored.data?.universeId, 'UNIVERSE_SEED_01');
    assert.strictEqual(restored.data?.characters['CHAR_GENERIC_A'].identity.displayName, 'Character Alpha');
  });
});
