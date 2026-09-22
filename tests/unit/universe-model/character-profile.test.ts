import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ActorDataSource,
  CharacterProfileLifecycle,
  SocialTendency,
  validateCharacterProfile
} from '../../../core/universe/model/index.ts';

describe('Character Core / Sims System', () => {
  it('creates a manual profile without inventing missing fields', () => {
    const profile = CharacterProfileLifecycle.createManual({
      fullName: 'Raka',
      source: ActorDataSource.USER_DEFINED
    });

    assert.strictEqual(profile.fullName, 'Raka');
    assert.strictEqual(profile.socialTendency, SocialTendency.UNKNOWN);
    assert.strictEqual(profile.personalityType, undefined);
    assert.strictEqual(profile.occupation, undefined);
  });

  it('supports story-derived partial profiles', () => {
    const profile = CharacterProfileLifecycle.deriveFromStory({
      fullName: 'Penjaga',
      occupation: 'Penjaga'
    });

    assert.strictEqual(profile.source, ActorDataSource.STORY_DERIVED);
    assert.strictEqual(profile.occupation, 'Penjaga');
  });

  it('rejects an authoritative profile sourced only from AI proposal', () => {
    assert.throws(() => {
      CharacterProfileLifecycle.createManual({
        fullName: 'AI Guess',
        source: ActorDataSource.AI_PROPOSAL
      });
    });
  });

  it('allows profile evolution to remain incomplete', () => {
    const report = validateCharacterProfile({
      socialTendency: SocialTendency.UNKNOWN,
      source: ActorDataSource.STORY_DERIVED
    });
    assert.strictEqual(report.valid, true);
  });

  it('allows story-derived profiles to remain incomplete', () => {
    const partial = validateCharacterProfile({
      mainTraits: ['calm'],
      socialTendency: SocialTendency.UNKNOWN,
      source: ActorDataSource.STORY_DERIVED
    });
    assert.strictEqual(partial.valid, true);
  });

  it('enforces 3–5 main traits when mainTraits is provided', () => {
    const bad = validateCharacterProfile({
      mainTraits: ['calm'],
      socialTendency: SocialTendency.INTROVERT,
      source: ActorDataSource.USER_DEFINED
    });
    assert.strictEqual(bad.valid, false);
  });

  it('enforces age as a non-negative integer', () => {
    const bad = validateCharacterProfile({
      age: -1,
      socialTendency: SocialTendency.UNKNOWN,
      source: ActorDataSource.USER_DEFINED
    });
    assert.strictEqual(bad.valid, false);
  });
});
