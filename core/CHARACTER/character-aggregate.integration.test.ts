import test from 'node:test';
import assert from 'node:assert/strict';
const assertEquals = (actual: unknown, expected: unknown): void => { assert.deepStrictEqual(actual, expected); };
import {
  CharacterAggregate,
  CharacterAggregateLifecycle,
  CHARACTER_AGGREGATE_LEVEL_GROUP_POLICY,
  validateCharacterAggregate,
} from './character-aggregate.ts';
import { integrateEventWithCharacter } from './character-event-integration.ts';
import { ActorDataSource, ActorLevel } from './actor.ts';
import { CharacterIndicatorEffect } from './indicator/indicator.ts';
import { CharacterStateDataSource } from '../DOMAIN/STATE/character-state.ts';
import { TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';
import { EntityType, EntityLifecycleStatus, ModelValidationStatus, AuthorityLevel } from '../SHARED/model-types.ts';
import { makeEntityID, makeDomainID, makeSystemID } from '../SHARED/identifiers.ts';

const provenance = {
  ownerSystem: makeSystemID('CHARACTER_SYSTEM'),
  domainId: makeDomainID('CHARACTER'),
  authorityLevel: AuthorityLevel.AUTHORITATIVE,
  validationStatus: ModelValidationStatus.VALID,
  revision: 'REV_0001',
  recordedTimestamp: 1
};

const history = { currentRevisionId: 'REV_0001', revisions: [] };

function fixture(): CharacterAggregate {
  const character = {
    identity: {
      id: makeEntityID('char_001'),
      entityType: EntityType.CHARACTER,
      displayName: 'Character 001',
      status: EntityLifecycleStatus.ACTIVE
    },
    roleReferences: [], knowledgeReferences: [], relationshipReferences: [],
    behaviorReferences: [], styleReferences: [],
    indicators: {
      personality: {}, behavior: {}, capability: {}, motivation: {}, social: {},
      condition: {
        mood: {
          indicatorId: 'ind_mood', key: 'mood', type: 'CONTINUOUS', persistence: 'DYNAMIC',
          mutable: true, range: { min: 0, max: 100 }, current: 70,
          temporalValidity: { effectiveFrom: '2026-01-01' }, source: ActorDataSource.USER_DEFINED,
          provenance
        }
      },
      history: []
    },
    temporalValidity: { effectiveFrom: '2026-01-01', temporalCategory: TemporalStatus.ACTUAL },
    history, provenance
  } as any;

  return {
    character,
    behaviors: {},
    styles: {},
  };
}

test('aggregate validates and indicator effect is recorded', () => {
  const aggregate = fixture();
  assert(validateCharacterAggregate(aggregate).valid);
  const effect: CharacterIndicatorEffect = {
    effectId: 'eff_001', characterId: 'char_001', indicatorKey: 'mood', triggerType: 'EVENT',
    value: 10, operation: 'DECREASE',
    ruleReference: 'RULE_MOOD_EVENT', source: ActorDataSource.STORY_DERIVED
  };
  const result = CharacterAggregateLifecycle.applyIndicatorEffect(aggregate, {
    effect, operation: 'DECREASE', value: 10, triggerType: 'EVENT',
    effectiveAt: '2026-01-02', recordedAt: '2026-01-02', changeId: 'chg_001',
    source: ActorDataSource.STORY_DERIVED, provenance
  });
  assert(result.valid);
  assertEquals(result.aggregate?.character.indicators?.condition.mood?.current, 60);
  assertEquals(result.aggregate?.character.indicators?.history.length, 1);
});

test('AI effect cannot become authoritative', () => {
  const aggregate = fixture();
  const effect: CharacterIndicatorEffect = {
    effectId: 'eff_ai', characterId: 'char_001', indicatorKey: 'mood', triggerType: 'EVENT',
    operation: 'DECREASE', value: 10, ruleReference: 'AI_RULE', source: ActorDataSource.AI_PROPOSAL
  };
  const result = CharacterAggregateLifecycle.applyIndicatorEffect(aggregate, {
    effect, operation: 'DECREASE', value: 10, triggerType: 'EVENT',
    effectiveAt: '2026-01-02', recordedAt: '2026-01-02', changeId: 'chg_ai',
    source: ActorDataSource.AI_PROPOSAL, provenance
  });
  assert(!result.valid);
});

test('event integration requires participant and can apply indicator effect', () => {
  const aggregate = fixture();
  const effect: CharacterIndicatorEffect = {
    effectId: 'eff_evt', characterId: 'char_001', indicatorKey: 'mood', triggerType: 'EVENT',
    operation: 'DECREASE', value: 5, ruleReference: 'RULE_EVENT_MOOD', source: ActorDataSource.STORY_DERIVED
  };
  const event = {
    eventId: 'evt_001', eventType: 'LOSS', title: 'Loss', participantRefs: [makeEntityID('char_001')],
    objectRefs: [], locationRef: 'loc_001', temporalInterval: { start: '2026-01-03', temporalCategory: TemporalStatus.ACTUAL },
    status: 'RESOLVED', causeRefs: [], consequenceRefs: [], sourceSystem: makeSystemID('STORY_SYSTEM'),
    validationStatus: ModelValidationStatus.VALID, provenance
  } as any;
  const result = integrateEventWithCharacter({ event, aggregate, indicatorEffects: [effect], recordedAt: '2026-01-03T00:01:00Z' });
  assert(result.valid);
  assertEquals(result.aggregate?.character.indicators?.condition.mood?.current, 65);
});

test('event integration blocks non-participant', () => {
  const aggregate = fixture();
  const event = {
    eventId: 'evt_002', eventType: 'OTHER', title: 'Other', participantRefs: [makeEntityID('char_999')],
    objectRefs: [], locationRef: 'loc_001', temporalInterval: { start: '2026-01-03', temporalCategory: TemporalStatus.ACTUAL },
    status: 'RESOLVED', causeRefs: [], consequenceRefs: [], sourceSystem: makeSystemID('STORY_SYSTEM'),
    validationStatus: ModelValidationStatus.VALID, provenance
  } as any;
  const result = integrateEventWithCharacter({ event, aggregate, recordedAt: '2026-01-03T00:01:00Z' });
  assert(!result.valid);
});

test('level/group policy stays separate from indicator values', () => {
  assertEquals(CHARACTER_AGGREGATE_LEVEL_GROUP_POLICY[ActorLevel.CORE], { groupRequired: true, groupMutable: false });
  assertEquals(CHARACTER_AGGREGATE_LEVEL_GROUP_POLICY[ActorLevel.MAJOR], { groupRequired: true, groupMutable: true });
  assertEquals(CHARACTER_AGGREGATE_LEVEL_GROUP_POLICY[ActorLevel.IMPACT], { groupRequired: false, groupMutable: false });
  assertEquals(CHARACTER_AGGREGATE_LEVEL_GROUP_POLICY[ActorLevel.PERIPHERAL], { groupRequired: false, groupMutable: false });
  assertEquals(CHARACTER_AGGREGATE_LEVEL_GROUP_POLICY[ActorLevel.ENTITY], { groupRequired: true, groupMutable: true });
});
