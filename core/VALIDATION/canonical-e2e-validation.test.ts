import test from 'node:test';
import assert from 'node:assert/strict';
const assertEquals = (actual: unknown, expected: unknown): void => { assert.deepStrictEqual(actual, expected); };
const assertNotEquals = (actual: unknown, expected: unknown): void => { assert.notDeepStrictEqual(actual, expected); };
import { stableSerialize } from '../SHARED/determinism.ts';
import { integrateResolvedEventWithCharacter } from '../CHARACTER/resolved-event-integration.ts';
import { CharacterAggregate } from '../CHARACTER/character-aggregate.ts';
import { ActorDataSource } from '../CHARACTER/actor.ts';
import { TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';
import { EntityLifecycleStatus, EntityType, ModelValidationStatus, AuthorityLevel } from '../SHARED/model-types.ts';
import { makeDomainID, makeEntityID, makeSystemID } from '../SHARED/identifiers.ts';

const provenance = Object.freeze({
  ownerSystem: makeSystemID('CHARACTER_SYSTEM'),
  domainId: makeDomainID('CHARACTER'),
  authorityLevel: AuthorityLevel.AUTHORITATIVE,
  validationStatus: ModelValidationStatus.VALID,
  revision: 'REV_0001',
  recordedTimestamp: 0
});

const history = Object.freeze({ currentRevisionId: 'REV_0001', revisions: Object.freeze([]) });

function fixture(): CharacterAggregate {
  return {
    character: {
      identity: { id: makeEntityID('char_e2e_001'), entityType: EntityType.CHARACTER, displayName: 'E2E Character', status: EntityLifecycleStatus.ACTIVE },
      roleReferences: [], knowledgeReferences: [], relationshipReferences: [], behaviorReferences: [], styleReferences: [],
      indicators: {
        personality: {}, behavior: {}, capability: {}, motivation: {}, social: {},
        condition: {
          mood: {
            indicatorId: 'ind_mood', key: 'mood', type: 'CONTINUOUS', persistence: 'DYNAMIC', mutable: true,
            range: { min: 0, max: 100 }, current: 70, temporalValidity: { effectiveFrom: '2026-01-01' },
            source: ActorDataSource.USER_DEFINED, provenance
          }
        },
        history: []
      },
      temporalValidity: { effectiveFrom: '2026-01-01', temporalCategory: TemporalStatus.ACTUAL },
      history, provenance
    } as any,
    behaviors: {}, styles: {},
  };
}

function resolvedEvent() {
  return {
    eventId: 'evt_e2e_001', eventType: 'DISCOVERY', title: 'Canonical Discovery',
    participantRefs: [makeEntityID('char_e2e_001')], objectRefs: [], locationRef: 'loc_e2e_001',
    temporalInterval: { start: '2026-01-03', temporalCategory: TemporalStatus.ACTUAL },
    status: 'RESOLVED', causeRefs: [], consequenceRefs: [], sourceSystem: makeSystemID('STORY_SYSTEM'),
    validationStatus: ModelValidationStatus.VALID, provenance
  } as any;
}

function runCanonicalScenario() {
  return integrateResolvedEventWithCharacter({
    event: resolvedEvent(),
    aggregate: fixture(),
    indicatorEffects: [{
      effectId: 'eff_e2e_mood', characterId: 'char_e2e_001', indicatorKey: 'mood', triggerType: 'EVENT',
      value: 5, operation: 'DECREASE', ruleReference: 'RULE_E2E_MOOD', source: ActorDataSource.STORY_DERIVED
    }],
    acquisitions: [{
      knowledgeId: 'know_e2e_001', referencedSubject: 'obj_e2e_001',
      statement: 'Character mengetahui objek dari Event yang resolved.',
      knowledgeStatus: 'KNOWN', acquisitionSource: 'EVENT_DISCOVERY', certainty: 'FACT'
    }],
    recordedAt: '2026-01-03T00:01:00Z'
  });
}

test('canonical E2E: resolved Event -> Character effect -> Knowledge reference', () => {
  const result = runCanonicalScenario();
  assert(result.valid);
  assertEquals(result.appliedEffects, ['eff_e2e_mood']);
  assertEquals(result.acquiredKnowledgeIds, ['know_e2e_001']);
  assertEquals(result.aggregate?.character.indicators?.condition.mood?.current, 65);
  assertEquals(result.aggregate?.character.knowledgeReferences, ['know_e2e_001']);
  assertEquals(result.knowledge?.[0]?.knowerRef, 'char_e2e_001');
});

test('canonical E2E is replay-deterministic for identical explicit inputs', () => {
  const first = runCanonicalScenario();
  const second = runCanonicalScenario();
  assert(first.valid && second.valid);
  assertEquals(stableSerialize(first), stableSerialize(second));
});

test('canonical integration does not mutate the input aggregate', () => {
  const aggregate = fixture();
  const before = stableSerialize(aggregate);
  const result = integrateResolvedEventWithCharacter({
    event: resolvedEvent(), aggregate,
    indicatorEffects: [{
      effectId: 'eff_e2e_nonmutation', characterId: 'char_e2e_001', indicatorKey: 'mood', triggerType: 'EVENT',
      value: 1, operation: 'DECREASE', ruleReference: 'RULE_NONMUTATION', source: ActorDataSource.STORY_DERIVED
    }],
    acquisitions: [{
      knowledgeId: 'know_e2e_nonmutation', referencedSubject: 'obj_e2e_001', statement: 'Deterministic knowledge',
      knowledgeStatus: 'KNOWN', acquisitionSource: 'EVENT_DISCOVERY', certainty: 'FACT'
    }],
    recordedAt: '2026-01-03T00:01:00Z'
  });
  assert(result.valid);
  assertEquals(stableSerialize(aggregate), before);
  assertNotEquals(stableSerialize(result.aggregate), before);
});

test('unresolved Event blocks the entire canonical effect chain', () => {
  const aggregate = fixture();
  const event = { ...resolvedEvent(), status: 'OCCURRING' };
  const result = integrateResolvedEventWithCharacter({
    event, aggregate,
    acquisitions: [{
      knowledgeId: 'know_blocked', referencedSubject: 'obj_e2e_001', statement: 'Should not enter Character knowledge',
      knowledgeStatus: 'KNOWN', acquisitionSource: 'EVENT_DISCOVERY', certainty: 'FACT'
    }],
    recordedAt: '2026-01-03T00:01:00Z'
  });
  assert(!result.valid);
  assertEquals(stableSerialize(aggregate), stableSerialize(fixture()));
});
