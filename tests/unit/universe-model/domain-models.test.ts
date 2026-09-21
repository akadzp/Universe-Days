/**
 * Phase 8: Domain Models & Conceptual Separation Unit Tests
 *
 * Verifies domain-specific contracts:
 * - Character decoupling from internal details of other subsystems
 * - Relationship as a standalone first-class entity
 * - Object ownership vs possession/holder vs location separation
 * - Knowledge distinction between character belief vs Universe ground truth
 * - State representation compatible with State Machine Engine
 * - Location structural hierarchy
 * - Event as factual universe event distinct from story/narrative
 * - Process persisting across periods
 * - Unresolved Condition persistence
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createGenericSeedUniverse,
  EntityType,
  EntityLifecycleStatus,
  EpistemicCertainty,
  TemporalStatus
} from '../../../core/universe/model/index.ts';

describe('Phase 8: Domain Models & Conceptual Separation', () => {
  const seed = createGenericSeedUniverse();

  it('1. Character domain references roles, states, relationships, and locations via stable IDs', () => {
    const char = seed.characters['CHAR_GENERIC_A'];
    assert.ok(char);
    assert.strictEqual(char.identity.id, 'CHAR_GENERIC_A');
    assert.strictEqual(char.locationReference, 'LOC_GENERIC_A');
    assert.deepStrictEqual([...char.roleReferences], ['ROLE_EXPLORER']);
    assert.strictEqual(char.stateReference, 'STATE_CHAR_A_01');
    assert.deepStrictEqual([...char.relationshipReferences], ['REL_GENERIC_A_B']);
    assert.deepStrictEqual([...char.knowledgeReferences], ['KNOW_GENERIC_01']);
  });

  it('2. Relationship is a first-class entity linking subject and target', () => {
    const rel = seed.relationships['REL_GENERIC_A_B'];
    assert.ok(rel);
    assert.strictEqual(rel.subjectRef, 'CHAR_GENERIC_A');
    assert.strictEqual(rel.targetRef, 'CHAR_GENERIC_B');
    assert.strictEqual(rel.relationshipType, 'ALLY');
    assert.strictEqual(rel.direction, 'BIDIRECTIONAL');
    assert.strictEqual(rel.strength, 0.8);
  });

  it('3. Object distinguishes authoritative owner from current possessor and location', () => {
    const obj = seed.objects['OBJ_GENERIC_A'];
    assert.ok(obj);
    assert.strictEqual(obj.ownershipRef, 'CHAR_GENERIC_A');
    assert.strictEqual(obj.possessionRef, 'CHAR_GENERIC_A');
    assert.strictEqual(obj.locationRef, 'LOC_GENERIC_A');
    assert.strictEqual(obj.accessStatus, 'ACCESSIBLE');
  });

  it('4. Knowledge entity captures subjective knower belief and certainty separate from universe fact', () => {
    const know = seed.knowledge['KNOW_GENERIC_01'];
    assert.ok(know);
    assert.strictEqual(know.knowerRef, 'CHAR_GENERIC_A');
    assert.strictEqual(know.referencedSubject, 'OBJ_GENERIC_A');
    assert.strictEqual(know.certainty, 'FACT');
    assert.strictEqual(know.isUniverseFactConfirmed, true);
  });

  it('5. Location forms spatial containment hierarchy without conflating hierarchy with temporal truth', () => {
    const parentLoc = seed.locations['LOC_GENERIC_A'];
    const childLoc = seed.locations['LOC_GENERIC_SUB_A'];
    assert.ok(parentLoc);
    assert.ok(childLoc);
    assert.strictEqual(childLoc.parentLocationRef, 'LOC_GENERIC_A');
    assert.deepStrictEqual([...parentLoc.containedLocationRefs], ['LOC_GENERIC_SUB_A']);
  });

  it('6. Event models factual universe state transition', () => {
    const evt = seed.events['EVT_GENERIC_01'];
    assert.ok(evt);
    assert.strictEqual(evt.eventType, 'EXPEDITION_LAUNCH');
    assert.strictEqual(evt.locationRef, 'LOC_GENERIC_A');
    assert.deepStrictEqual([...evt.participantRefs], ['CHAR_GENERIC_A']);
    assert.strictEqual(evt.status, 'RESOLVED');
  });

  it('7. Process and Unresolved Condition persist with active status across periods', () => {
    const proc = seed.processes['PROC_GENERIC_01'];
    assert.ok(proc);
    assert.strictEqual(proc.currentStatus, 'ACTIVE');
    assert.strictEqual(proc.progressRatio, 0.25);
    assert.deepStrictEqual([...proc.unresolvedConditionRefs], ['UNRES_GENERIC_WEATHER']);

    const unres = seed.unresolvedConditions['UNRES_GENERIC_WEATHER'];
    assert.ok(unres);
    assert.strictEqual(unres.currentStatus, 'CARRYOVER');
    assert.strictEqual(unres.temporalScope.temporalCategory, TemporalStatus.POSSIBILITY);
  });
});
