import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { integrateEventKnowledgeWithCharacter } from './character-knowledge-integration.ts';
import { ActorDataSource } from './actor.ts';
import { TemporalStatus } from '../RUNTIME/TEMPORAL/types.ts';
import { EntityType, EntityLifecycleStatus, ModelValidationStatus, AuthorityLevel } from '../SHARED/model-types.ts';
import { makeEntityID, makeDomainID, makeSystemID } from '../SHARED/identifiers.ts';
import { CharacterAggregate } from './character-aggregate.ts';

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
  return {
    character: {
      identity: { id: makeEntityID('char_001'), entityType: EntityType.CHARACTER, displayName: 'Character 001', status: EntityLifecycleStatus.ACTIVE },
      roleReferences: [], knowledgeReferences: [], relationshipReferences: [], behaviorReferences: [], styleReferences: [],
      temporalValidity: { effectiveFrom: '2026-01-01', temporalCategory: TemporalStatus.ACTUAL },
      history, provenance
    } as any,
    behaviors: {},
    styles: {}
  };
}

const event = {
  eventId: 'evt_knowledge_001', eventType: 'DISCOVERY', title: 'Discovery',
  participantRefs: [makeEntityID('char_001')], objectRefs: [], locationRef: 'loc_001',
  temporalInterval: { start: '2026-01-03', temporalCategory: TemporalStatus.ACTUAL },
  status: 'RESOLVED', causeRefs: [], consequenceRefs: [], sourceSystem: makeSystemID('STORY_SYSTEM'),
  validationStatus: ModelValidationStatus.VALID, provenance
} as any;

Deno.test('resolved event acquires authoritative story-derived knowledge and binds only reference', () => {
  const result = integrateEventKnowledgeWithCharacter({
    event,
    aggregate: fixture(),
    acquisitions: [{
      knowledgeId: 'know_001', referencedSubject: 'obj_001', statement: 'Pintu berada di rumah.',
      knowledgeStatus: 'KNOWN', acquisitionSource: 'EVENT_DISCOVERY', certainty: 'FACT'
    }],
    recordedAt: '2026-01-03T00:01:00Z'
  });
  assert(result.valid);
  assertEquals(result.acquiredKnowledgeIds, ['know_001']);
  assertEquals(result.aggregate?.character.knowledgeReferences, ['know_001']);
  assertEquals(result.knowledge?.[0].knowerRef, 'char_001');
  assertEquals(result.knowledge?.[0].temporalValidity.effectiveFrom, '2026-01-03');
});

Deno.test('unresolved event cannot grant knowledge', () => {
  const result = integrateEventKnowledgeWithCharacter({
    event: { ...event, status: 'OCCURRING' }, aggregate: fixture(),
    acquisitions: [{ knowledgeId: 'know_002', referencedSubject: 'obj_002', statement: 'X', knowledgeStatus: 'KNOWN', acquisitionSource: 'EVENT' }],
    recordedAt: '2026-01-03T00:01:00Z'
  });
  assert(!result.valid);
});

Deno.test('AI proposal cannot become authoritative knowledge', () => {
  const result = integrateEventKnowledgeWithCharacter({
    event, aggregate: fixture(),
    acquisitions: [{ knowledgeId: 'know_ai', referencedSubject: 'obj', statement: 'AI claim', knowledgeStatus: 'KNOWN', acquisitionSource: 'AI', source: ActorDataSource.AI_PROPOSAL }],
    recordedAt: '2026-01-03T00:01:00Z'
  });
  assert(!result.valid);
});

Deno.test('event cannot bind knowledge belonging to another character', () => {
  const result = integrateEventKnowledgeWithCharacter({
    event, aggregate: fixture(),
    acquisitions: [{ knowledgeId: 'know_other', knowerRef: 'char_999', referencedSubject: 'obj', statement: 'Other', knowledgeStatus: 'KNOWN', acquisitionSource: 'EVENT' }],
    recordedAt: '2026-01-03T00:01:00Z'
  });
  assert(!result.valid);
});
