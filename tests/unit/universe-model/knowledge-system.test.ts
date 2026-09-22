import test from 'node:test';
import { strict as assert } from 'node:assert';
import {
  ActorDataSource,
  EpistemicCertainty,
  KnowledgeLifecycle,
  validateKnowledge
} from '../../../core/universe/model/knowledge.ts';

test('manual knowledge can be created without inventing missing optional fields', () => {
  const k = KnowledgeLifecycle.createManual({
    knowledgeId: 'KNOW_001',
    knowerRef: 'CHAR_S',
    referencedSubject: 'CHAR_L',
    statement: 'S mengetahui Laura hadir.',
    knowledgeStatus: 'ACTIVE',
    acquisitionSource: 'OBSERVATION',
    effectiveFrom: '2026-09-22',
    certainty: EpistemicCertainty.FACT
  });
  assert.equal(k.knowledgeId, 'KNOW_001');
  assert.equal(k.acquiredDate, undefined);
  assert.equal(k.changes.length, 0);
});

test('story-derived knowledge may be created as authoritative', () => {
  const k = KnowledgeLifecycle.deriveFromStory({
    knowledgeId: 'KNOW_002',
    knowerRef: 'CHAR_S',
    referencedSubject: 'OBJ_X',
    statement: 'S mengetahui lokasi objek.',
    knowledgeStatus: 'ACTIVE',
    acquisitionSource: 'DIRECT_EXPERIENCE',
    effectiveFrom: '2026-09-22'
  });
  assert.equal(k.source, ActorDataSource.STORY_DERIVED);
});

test('AI proposal cannot become authoritative knowledge', () => {
  assert.throws(() => KnowledgeLifecycle.createManual({
    knowledgeId: 'KNOW_003',
    knowerRef: 'CHAR_S',
    referencedSubject: 'OBJ_X',
    statement: 'Proposal AI.',
    knowledgeStatus: 'ACTIVE',
    acquisitionSource: 'AI_GENERATED',
    effectiveFrom: '2026-09-22',
    source: ActorDataSource.AI_PROPOSAL
  }));
});

test('knowledge change requires matching predecessor and trigger', () => {
  const k = KnowledgeLifecycle.createManual({
    knowledgeId: 'KNOW_004',
    knowerRef: 'CHAR_S',
    referencedSubject: 'CHAR_L',
    statement: 'S mengira Laura di rumah.',
    knowledgeStatus: 'ACTIVE',
    acquisitionSource: 'HEARSAY',
    effectiveFrom: '2026-09-22',
    certainty: EpistemicCertainty.BELIEF
  });

  const next = KnowledgeLifecycle.changeKnowledge(k, {
    knowledgeId: 'KNOW_004',
    previousStatement: 'S mengira Laura di rumah.',
    currentStatement: 'S mengetahui Laura sudah pergi.',
    changeTrigger: 'Laura memberitahu S secara langsung.',
    knowledgeChange: 'BELIEF_UPDATED',
    changeDate: '2026-09-22',
    source: ActorDataSource.STORY_DERIVED,
    nextCertainty: EpistemicCertainty.FACT
  });

  assert.equal(next.statement, 'S mengetahui Laura sudah pergi.');
  assert.equal(next.changes.length, 1);
  assert.equal(next.changes[0].previousKnowledge, 'S mengira Laura di rumah.');
  assert.equal(next.history.revisions.length, 2);
  assert.throws(() => KnowledgeLifecycle.changeKnowledge(k, {
    knowledgeId: 'KNOW_004',
    previousStatement: 'teks salah',
    currentStatement: 'perubahan',
    changeTrigger: 'trigger',
    knowledgeChange: 'X',
    source: ActorDataSource.STORY_DERIVED
  }));
});

test('knowledge mismatch with Universe truth is not automatically invalid', () => {
  const k = KnowledgeLifecycle.createManual({
    knowledgeId: 'KNOW_005',
    knowerRef: 'CHAR_S',
    referencedSubject: 'CHAR_L',
    statement: 'S percaya informasi yang ternyata salah.',
    knowledgeStatus: 'ACTIVE',
    acquisitionSource: 'HEARSAY',
    effectiveFrom: '2026-09-22',
    certainty: EpistemicCertainty.MISCONCEPTION,
    isUniverseFactConfirmed: false
  });
  const report = validateKnowledge(k);
  assert.equal(report.valid, true);
});
