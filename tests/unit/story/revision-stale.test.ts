import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DailyStoryOrchestrator
} from '../../../core/story/daily/orchestrator.ts';
import {
  StoryRevisionManager
} from '../../../core/story/daily/revision.ts';
import {
  StoryTriggerType,
  createStoryTrigger
} from '../../../core/story/daily/trigger.ts';
import {
  UniversePeriodContext,
  PeriodInitializer,
  DailyUniverseStatus,
  TimePoint,
  createUniverseEvent,
  UniverseEventStatus,
  createUniverseProcess,
  UniverseProcessStatus
} from '../../../core/universe/daily/index.ts';

function createMockUniverseContext(): UniversePeriodContext {
  const initRes = PeriodInitializer.initialize({
    startTime: TimePoint.parse('2024-03-01T08:00:00Z').data!,
    endTime: TimePoint.parse('2024-03-01T20:00:00Z').data!,
    universeScope: 'REALM_X'
  });
  const ctx = initRes.data!;
  ctx.events = [
    createUniverseEvent({
      eventId: 'EV_REV_1',
      temporalReference: '2024-03-01T09:00:00Z',
      initialStatus: UniverseEventStatus.OCCURRED
    })
  ];
  ctx.processes = [
    createUniverseProcess({
      processId: 'PROC_REV_1',
      startReference: '2024-03-01T08:00:00Z',
      initialStatus: UniverseProcessStatus.ACTIVE
    })
  ];
  return ctx;
}

describe('Phase 6 - Story Revision & Staleness Unit Tests', () => {
  it('1. Detects that story is fresh when universe context has not changed', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_REV_01',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_REV_1',
      universeScope: 'REALM_X',
      temporalAnchor: '2024-03-01T09:00:00Z',
      description: 'Event for revision check'
    });

    const prodRes = DailyStoryOrchestrator.produceStory(ctx, trigger);
    assert.strictEqual(prodRes.success, true);
    const storyPkg = prodRes.data!;

    const staleReport = StoryRevisionManager.checkStaleness(storyPkg.handoff, ctx);
    assert.strictEqual(staleReport.isStale, false);
    assert.strictEqual(staleReport.requiresRevalidation, false);
  });

  it('2. Detects staleness when an upstream scoped event or process changes status', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_REV_02',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_REV_1',
      universeScope: 'REALM_X',
      temporalAnchor: '2024-03-01T09:00:00Z',
      description: 'Event for upstream modification check'
    });

    const prodRes = DailyStoryOrchestrator.produceStory(ctx, trigger);
    assert.strictEqual(prodRes.success, true);
    const storyPkg = prodRes.data!;

    // Upstream Universe changes: event is marked as CANCELLED or process becomes COMPLETED
    const updatedCtx: UniversePeriodContext = {
      ...ctx,
      events: [
        createUniverseEvent({
          eventId: 'EV_REV_1',
          temporalReference: '2024-03-01T09:00:00Z',
          initialStatus: UniverseEventStatus.CANCELLED
        })
      ]
    };

    const staleReport = StoryRevisionManager.checkStaleness(storyPkg.handoff, updatedCtx);
    assert.strictEqual(staleReport.isStale, true);
    assert.strictEqual(staleReport.requiresRevalidation, true);
    assert.ok(staleReport.stalenessReasons.some(r => r.includes('changed status from OCCURRED to CANCELLED')));
  });

  it('3. Creates a new revision while preserving the original Story ID', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_REV_03',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_REV_1',
      universeScope: 'REALM_X',
      temporalAnchor: '2024-03-01T09:00:00Z',
      description: 'Preserve ID check'
    });

    const prodRes = DailyStoryOrchestrator.produceStory(ctx, trigger);
    assert.strictEqual(prodRes.success, true);
    const originalHandoff = prodRes.data!.handoff;

    const revisedHandoff = StoryRevisionManager.createRevision(originalHandoff, ctx);
    assert.strictEqual(revisedHandoff.storyId, originalHandoff.storyId);
    assert.strictEqual(revisedHandoff.version, 2);
  });
});
