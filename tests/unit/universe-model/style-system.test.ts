import assert from 'node:assert/strict';
import { ActorDataSource } from '../../../core/universe/model/actor.ts';
import { CharacterStyleLifecycle } from '../../../core/universe/model/character-style.ts';

const base = {
  styleId: 'STYLE_TEST_A',
  characterId: 'CHAR_TEST_A',
  languageStyle: 'Bahasa Indonesia santai',
  wordChoice: 'singkat dan langsung',
  formalityLevel: 'rendah',
  sentencePattern: 'kalimat pendek',
  speechRhythm: 'cepat',
  emotionalExpression: 'tertahan',
  humorStyle: 'ringan',
  reactionStyle: 'jawaban singkat',
  emphasisStyle: 'pengulangan kata tertentu',
  verbalSignature: 'sering memakai jeda',
  commonExpressions: ['ya', 'oke'],
  dialogueTendency: 'lebih sering menjawab daripada membuka topik',
  communicationHabits: ['menghindari penjelasan panjang'],
  casualStyle: 'lebih santai',
  seriousStyle: 'lebih formal',
  conflictStyle: 'pendek dan tegas',
  emotionalStyle: 'lebih lambat',
  effectiveFrom: '2026-09-22T10:00:00Z'
};

const manual = CharacterStyleLifecycle.createManual(base);
assert.equal(manual.result, 'ACCEPTED');
assert.ok(manual.data);

const blocked = CharacterStyleLifecycle.deriveFromStory(base);
assert.equal(blocked.result, 'BLOCKED');

const derived = CharacterStyleLifecycle.deriveFromStory({ ...base, evidenceCount: 2 });
assert.equal(derived.result, 'ACCEPTED');
assert.ok(derived.data);

const proposal = CharacterStyleLifecycle.createManual({ ...base, source: ActorDataSource.AI_PROPOSAL });
assert.equal(proposal.result, 'REJECTED');

const changed = CharacterStyleLifecycle.recordChange(derived.data!, {
  changeId: 'STYLE_CHANGE_01',
  changeTrigger: 'Pengalaman komunikasi baru',
  changeDate: '2026-09-23T10:00:00Z',
  currentStyle: {
    ...CharacterStyleLifecycle.snapshot(derived.data!),
    formalityLevel: 'sedang'
  },
  source: ActorDataSource.STORY_DERIVED
});
assert.equal(changed.result, 'ACCEPTED');
assert.equal(changed.data!.changes.length, 1);
assert.equal(changed.data!.changes[0].previousStyle.formalityLevel, 'rendah');
assert.equal(changed.data!.changes[0].currentStyle.formalityLevel, 'sedang');
console.log('Style System tests passed');
