import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StoryTriggerType,
  StoryTriggerEvaluator,
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
  UniverseProcessStatus,
  createUnresolvedCondition,
  UnresolvedStatus
} from '../../../core/universe/daily/index.ts';

function createMockUniverseContext(): UniversePeriodContext {
  const initRes = PeriodInitializer.initialize({
    startTime: TimePoint.parse('2024-01-01T08:00:00Z').data!,
    endTime: TimePoint.parse('2024-01-01T20:00:00Z').data!,
    universeScope: 'ABSTRACT_REALM'
  });
  const ctx = initRes.data!;
  ctx.events = [
    createUniverseEvent({
      eventId: 'EV_001',
      temporalReference: '2024-01-01T10:00:00Z',
      initialStatus: UniverseEventStatus.OCCURRED
    }),
    createUniverseEvent({
      eventId: 'EV_FAILED',
      temporalReference: '2024-01-01T11:00:00Z',
      initialStatus: UniverseEventStatus.FAILED
    })
  ];
  ctx.processes = [
    createUniverseProcess({
      processId: 'PROC_001',
      startReference: '2024-01-01T08:00:00Z',
      initialStatus: UniverseProcessStatus.ACTIVE
    }),
    createUniverseProcess({
      processId: 'PROC_CANCELLED',
      startReference: '2024-01-01T08:00:00Z',
      initialStatus: UniverseProcessStatus.CANCELLED
    })
  ];
  ctx.unresolvedConditions = [
    createUnresolvedCondition({
      unresolvedId: 'UNRES_001',
      sourceReference: 'EV_001',
      temporalReference: '2024-01-01T08:00:00Z',
      reason: 'Pending check',
      initialStatus: UnresolvedStatus.UNRESOLVED
    }),
    createUnresolvedCondition({
      unresolvedId: 'UNRES_CLOSED',
      sourceReference: 'EV_001',
      temporalReference: '2024-01-01T08:00:00Z',
      reason: 'Closed check',
      initialStatus: UnresolvedStatus.CLOSED
    })
  ];
  return ctx;
}

describe('Phase 6 - Story Trigger Unit Tests', () => {
  it('1. Validates valid UNIVERSE_EVENT trigger', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_01',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_001',
      universeScope: 'ABSTRACT_REALM',
      temporalAnchor: '2024-01-01T10:00:00Z',
      description: 'Triggered by key event'
    });

    const res = StoryTriggerEvaluator.evaluateTrigger(trigger, ctx);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.valid, true);
    assert.strictEqual(res.data?.triggerStatus, 'ACTIVE');
    assert.strictEqual(res.data?.hasUniverseBasis, true);
  });

  it('2. Detects missing Universe event source (INVALID trigger)', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_02',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'NON_EXISTENT_EV',
      universeScope: 'ABSTRACT_REALM',
      temporalAnchor: '2024-01-01T10:00:00Z',
      description: 'Trigger referencing non-existent event'
    });

    const res = StoryTriggerEvaluator.evaluateTrigger(trigger, ctx);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.valid, false);
    assert.strictEqual(res.data?.triggerStatus, 'INVALID');
  });

  it('3. Detects blocked source context (e.g. FAILED event -> BLOCKED trigger)', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_03',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_FAILED',
      universeScope: 'ABSTRACT_REALM',
      temporalAnchor: '2024-01-01T11:00:00Z',
      description: 'Trigger referencing failed event'
    });

    const res = StoryTriggerEvaluator.evaluateTrigger(trigger, ctx);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.valid, false);
    assert.strictEqual(res.data?.triggerStatus, 'BLOCKED');
  });

  it('4. Handles ONGOING_PROCESS trigger correctly', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_04',
      type: StoryTriggerType.ONGOING_PROCESS,
      sourceReference: 'PROC_001',
      universeScope: 'ABSTRACT_REALM',
      temporalAnchor: '2024-01-01T08:00:00Z',
      description: 'Process trigger'
    });

    const res = StoryTriggerEvaluator.evaluateTrigger(trigger, ctx);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.valid, true);
    assert.strictEqual(res.data?.hasUniverseBasis, true);
  });

  it('5. Handles EXPLICIT_REQUEST trigger and distinguishes request basis', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_05',
      type: StoryTriggerType.EXPLICIT_REQUEST,
      sourceReference: 'OPERATOR_DISPATCH_REQ_42',
      universeScope: 'ABSTRACT_REALM',
      temporalAnchor: '2024-01-01T08:00:00Z',
      description: 'Explicit operator production dispatch'
    });

    const res = StoryTriggerEvaluator.evaluateTrigger(trigger, ctx);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.valid, true);
    assert.strictEqual(res.data?.isExplicitRequestOnly, true);
    assert.strictEqual(res.data?.hasUniverseBasis, true);
  });

  it('6. Rejects scope contamination in trigger', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_06',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_001',
      universeScope: 'FOREIGN_REALM', // Contamination!
      temporalAnchor: '2024-01-01T10:00:00Z',
      description: 'Wrong scope trigger'
    });

    const res = StoryTriggerEvaluator.evaluateTrigger(trigger, ctx);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'SCOPE_CONTAMINATION');
  });
});
