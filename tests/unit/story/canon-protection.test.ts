import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CanonProtectionGuard
} from '../../../core/story/daily/canon.ts';
import {
  DailyStoryOrchestrator
} from '../../../core/story/daily/orchestrator.ts';
import {
  StoryTriggerType,
  createStoryTrigger
} from '../../../core/story/daily/trigger.ts';
import {
  UniversePeriodContext,
  PeriodInitializer,
  TimePoint,
  createUniverseEvent,
  UniverseEventStatus
} from '../../../core/universe/daily/index.ts';

function createMockUniverseContext(): UniversePeriodContext {
  const initRes = PeriodInitializer.initialize({
    startTime: TimePoint.parse('2024-04-01T08:00:00Z').data!,
    endTime: TimePoint.parse('2024-04-01T20:00:00Z').data!,
    universeScope: 'CANON_CHECK_SCOPE'
  });
  const ctx = initRes.data!;
  ctx.events = [
    createUniverseEvent({
      eventId: 'EV_CANON_1',
      temporalReference: '2024-04-01T10:00:00Z',
      initialStatus: UniverseEventStatus.OCCURRED
    })
  ];
  return ctx;
}

describe('Phase 6 - Canon Protection Guard Unit Tests', () => {
  it('1. Verifies Universe context immutability before and after story production', () => {
    const ctx = createMockUniverseContext();
    const initialFingerprint = CanonProtectionGuard.computeUniverseContextFingerprint(ctx);

    const trigger = createStoryTrigger({
      triggerId: 'TRIG_CANON_01',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_CANON_1',
      universeScope: 'CANON_CHECK_SCOPE',
      temporalAnchor: '2024-04-01T10:00:00Z',
      description: 'Check immutability'
    });

    const res = DailyStoryOrchestrator.produceStory(ctx, trigger);
    assert.strictEqual(res.success, true);

    // Universe context must have identical fingerprint
    const verifyRes = CanonProtectionGuard.verifyContextImmutability(initialFingerprint, ctx);
    assert.strictEqual(verifyRes.success, true);
  });

  it('2. Flags unauthorized entity claims not found in Universe continuity or identity', () => {
    const ctx = createMockUniverseContext();
    const claims = ['ACTOR_UNKNOWN_HALLUCINATED_99'];
    const check = CanonProtectionGuard.validateClaims(claims, ctx);

    assert.strictEqual(check.isCanonCompliant, false);
    assert.deepStrictEqual(check.unauthorizedClaims, ['ACTOR_UNKNOWN_HALLUCINATED_99']);
  });
});
