import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StoryDateResolver,
  StoryDateInfo
} from '../../../core/story/daily/date.ts';
import {
  StoryIdGenerator
} from '../../../core/story/daily/identity.ts';
import {
  StoryTriggerType,
  createStoryTrigger
} from '../../../core/story/daily/trigger.ts';
import {
  UniversePeriodContext,
  PeriodInitializer,
  TimePoint
} from '../../../core/universe/daily/index.ts';

function createMockUniverseContext(): UniversePeriodContext {
  const initRes = PeriodInitializer.initialize({
    startTime: TimePoint.parse('2024-05-15T06:00:00Z').data!,
    endTime: TimePoint.parse('2024-05-15T22:00:00Z').data!,
    universeScope: 'REALM_PRIME'
  });
  return initRes.data!;
}

describe('Phase 6 - Story Date & Deterministic Story ID Unit Tests', () => {
  it('1. Resolves Story Date from period temporal anchor', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_D01',
      type: StoryTriggerType.EXPLICIT_REQUEST,
      sourceReference: 'REQ_01',
      universeScope: 'REALM_PRIME',
      temporalAnchor: '2024-05-15T12:30:00Z',
      description: 'Midday request'
    });

    const res = StoryDateResolver.resolveDate(ctx, trigger);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.storyDate, '2024-05-15');
    assert.strictEqual(res.data?.storyDateTime, '2024-05-15T12:30:00Z');
    assert.strictEqual(res.data?.source, 'TRIGGER_ANCHOR');
  });

  it('2. Validates that Story Date matches Universe period and rejects out-of-bounds dates', () => {
    const ctx = createMockUniverseContext();
    const tp = TimePoint.parse('2024-05-20T10:00:00Z').data!;
    const invalidDateInfo: StoryDateInfo = {
      storyDate: '2024-05-20', // Out of bounds!
      storyDateTime: '2024-05-20T10:00:00Z',
      timePoint: tp,
      universeDate: tp.date,
      source: 'PERIOD_START'
    };

    const valRes = StoryDateResolver.validateDate(invalidDateInfo, ctx);
    assert.strictEqual(valRes.success, false);
    assert.strictEqual(valRes.error, 'TEMPORAL_CONFLICT');
  });

  it('3. Generates 100% deterministic Story ID with no randomness', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_D02',
      type: StoryTriggerType.EXPLICIT_REQUEST,
      sourceReference: 'REQ_DET',
      universeScope: 'REALM_PRIME',
      temporalAnchor: '2024-05-15T06:00:00Z',
      description: 'Deterministic test'
    });

    const dateRes = StoryDateResolver.resolveDate(ctx, trigger);
    assert.strictEqual(dateRes.success, true);

    const id1 = StoryIdGenerator.generate('REALM_PRIME', dateRes.data!, trigger);
    const id2 = StoryIdGenerator.generate('REALM_PRIME', dateRes.data!, trigger);

    assert.strictEqual(id1, id2);
    assert.ok(id1.startsWith('STORY_REALM_PRIME_20240515_EXPLICIT_REQUEST_'));
  });

  it('4. Validates canonical format of Story ID', () => {
    const validId = 'STORY_REALM_PRIME_20240515_EXPLICIT_REQUEST_A1B2C3D4';
    assert.strictEqual(StoryIdGenerator.validate(validId).success, true);

    const invalidId = 'RANDOM_STORY_123';
    assert.strictEqual(StoryIdGenerator.validate(invalidId).success, false);
  });
});
