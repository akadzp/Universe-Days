import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ActorDataSource } from '../../../core/universe/model/actor.ts';
import { BehaviorFrequency, BehaviorLifecycle, BehaviorResponseIntensity } from '../../../core/universe/model/behavior.ts';

describe('Behavior System', () => {
  const base = {
    behaviorId: 'BEH_TEST_001',
    characterId: 'CHAR_TEST_001',
    behaviorPattern: 'Memeriksa ulang barang sebelum pergi.',
    behaviorFrequency: BehaviorFrequency.FREQUENT,
    responseIntensity: BehaviorResponseIntensity.MODERATE,
    effectiveFrom: '2026-09-22'
  };

  it('creates manual behavior with user defined source', () => {
    const manual = BehaviorLifecycle.createManual({ ...base, source: ActorDataSource.USER_DEFINED });
    assert.equal(manual.result, 'ACCEPTED');
    assert.equal(manual.data?.characterId, base.characterId);
  });

  it('blocks derivation from story if evidence is insufficient and not significant', () => {
    const incompleteStory = BehaviorLifecycle.deriveFromStory({ ...base, source: ActorDataSource.STORY_DERIVED, evidenceCount: 1, narrativelySignificant: false });
    assert.equal(incompleteStory.result, 'BLOCKED');
  });

  it('accepts derivation from story when narratively significant', () => {
    const significantStory = BehaviorLifecycle.deriveFromStory({ ...base, source: ActorDataSource.STORY_DERIVED, evidenceCount: 1, narrativelySignificant: true });
    assert.equal(significantStory.result, 'ACCEPTED');
  });

  it('rejects AI proposal as authoritative', () => {
    const ai = BehaviorLifecycle.createManual({ ...base, source: ActorDataSource.AI_PROPOSAL });
    assert.equal(ai.result, 'REJECTED');
  });

  it('records behavior changes accurately', () => {
    const manual = BehaviorLifecycle.createManual({ ...base, source: ActorDataSource.USER_DEFINED });
    const changed = BehaviorLifecycle.recordChange(manual.data!, {
      changeId: 'BEHCHG_001',
      changeTrigger: 'Mengalami kejadian kehilangan barang.',
      changeDate: '2026-09-23',
      previousPattern: base.behaviorPattern,
      currentPattern: 'Selalu menyimpan barang di tempat yang sama.',
      source: ActorDataSource.STORY_DERIVED,
      basisReference: 'EVENT_001'
    });
    assert.equal(changed.result, 'ACCEPTED');
    assert.equal(changed.data?.changes.length, 1);
    assert.equal(changed.data?.behaviorPattern, 'Selalu menyimpan barang di tempat yang sama.');
  });
});
