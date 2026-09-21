/**
 * Phase 8: Cross-Domain References Unit Tests
 *
 * Verifies that entities across different domains reference each other via stable IDs
 * without cloning or duplicating entity state.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createGenericSeedUniverse,
  CrossDomainReferenceResolver,
  EntityType
} from '../../../core/universe/model/index.ts';

describe('Phase 8: Cross-Domain References', () => {
  const seed = createGenericSeedUniverse();

  it('1. Formats and parses typed entity references', () => {
    const formatted = CrossDomainReferenceResolver.makeRef(EntityType.CHARACTER, 'CHAR_001');
    assert.strictEqual(formatted, 'CHARACTER:CHAR_001');

    const parsed = CrossDomainReferenceResolver.parseRef(formatted);
    assert.ok(parsed);
    assert.strictEqual(parsed.entityType, EntityType.CHARACTER);
    assert.strictEqual(parsed.entityId, 'CHAR_001');
  });

  it('2. Traverses cross-domain graph: Character -> Location -> SubLocation', () => {
    const char = seed.characters['CHAR_GENERIC_A'];
    assert.ok(char.locationReference);
    const loc = seed.locations[char.locationReference];
    assert.ok(loc);
    assert.strictEqual(loc.identity.id, 'LOC_GENERIC_A');
    assert.ok(loc.containedLocationRefs.includes('LOC_GENERIC_SUB_A'));
    const subLoc = seed.locations[loc.containedLocationRefs[0]];
    assert.ok(subLoc);
    assert.strictEqual(subLoc.parentLocationRef, 'LOC_GENERIC_A');
  });

  it('3. Traverses cross-domain graph: Process -> UnresolvedCondition -> Target Location', () => {
    const proc = seed.processes['PROC_GENERIC_01'];
    assert.ok(proc.unresolvedConditionRefs.length > 0);
    const unresId = proc.unresolvedConditionRefs[0];
    const unres = seed.unresolvedConditions[unresId];
    assert.ok(unres);
    assert.strictEqual(unres.targetEntityRef, 'LOC_GENERIC_B');
    const targetLoc = seed.locations[unres.targetEntityRef!];
    assert.ok(targetLoc);
    assert.strictEqual(targetLoc.identity.id, 'LOC_GENERIC_B');
  });
});
