import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DailyStoryOrchestrator,
  StoryProductionPackage
} from '../../core/story/daily/orchestrator.ts';
import {
  StoryTriggerType,
  createStoryTrigger
} from '../../core/story/daily/trigger.ts';
import {
  StoryLifecycleManager,
  StoryLifecycleStatus,
  StoryLifecycleEvent
} from '../../core/story/daily/lifecycle.ts';
import {
  MockStoryTestRenderer
} from '../../core/story/daily/mock-renderer.ts';
import {
  CanonProtectionGuard
} from '../../core/story/daily/canon.ts';
import {
  UniversePeriodContext,
  PeriodInitializer,
  TimePoint,
  createUniverseEvent,
  UniverseEventStatus,
  createUniverseProcess,
  UniverseProcessStatus,
  createUniverseConsequence,
  UniverseConsequenceStatus,
  createUnresolvedCondition,
  UnresolvedStatus
} from '../../core/universe/daily/index.ts';

function createCompleteUniverseContext(): UniversePeriodContext {
  const initRes = PeriodInitializer.initialize({
    startTime: TimePoint.parse('2024-06-01T08:00:00Z').data!,
    endTime: TimePoint.parse('2024-06-01T22:00:00Z').data!,
    universeScope: 'ABSTRACT_SECTOR_7'
  });
  const ctx = initRes.data!;
  ctx.events = [
    createUniverseEvent({
      eventId: 'EV_DISCOVERY_01',
      temporalReference: '2024-06-01T09:30:00Z',
      initialStatus: UniverseEventStatus.OCCURRED
    })
  ];
  ctx.processes = [
    createUniverseProcess({
      processId: 'PROC_RESEARCH_01',
      startReference: '2024-06-01T08:00:00Z',
      initialStatus: UniverseProcessStatus.ACTIVE
    })
  ];
  ctx.consequences = [
    createUniverseConsequence({
      consequenceId: 'CNSQ_INSIGHT_01',
      sourceEventRef: 'EV_DISCOVERY_01',
      temporalActivation: '2024-06-01T09:30:00Z',
      initialStatus: UniverseConsequenceStatus.RESOLVED
    }).data!
  ];
  ctx.unresolvedConditions = [
    createUnresolvedCondition({
      unresolvedId: 'UNRES_ANOMALY_01',
      sourceReference: 'EV_DISCOVERY_01',
      temporalReference: '2024-06-01T08:00:00Z',
      reason: 'Anomaly investigation',
      initialStatus: UnresolvedStatus.UNRESOLVED
    })
  ];
  return ctx;
}

describe('Phase 6 - End-to-End Story Pipeline Integration Tests', () => {
  it('1. End-to-end: Validated Universe Context -> Trigger -> Scope -> Date -> ID -> Handoff -> READY_FOR_PRODUCTION', () => {
    const universeCtx = createCompleteUniverseContext();
    const initialFingerprint = CanonProtectionGuard.computeUniverseContextFingerprint(universeCtx);

    const trigger = createStoryTrigger({
      triggerId: 'TRIG_E2E_01',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_DISCOVERY_01',
      universeScope: 'ABSTRACT_SECTOR_7',
      temporalAnchor: '2024-06-01T09:30:00Z',
      description: 'Discovery event in Sector 7'
    });

    const result = DailyStoryOrchestrator.produceStory(universeCtx, trigger, {
      instanceRef: 'INST_E2E_001'
    });

    assert.strictEqual(result.success, true);
    const pkg: StoryProductionPackage = result.data!;

    // Verify identity & date
    assert.ok(pkg.storyId.startsWith('STORY_ABSTRACT_SECTOR_7_20240601_UNIVERSE_EVENT_'));
    assert.strictEqual(pkg.storyDate.storyDate, '2024-06-01');

    // Verify scope extraction
    assert.strictEqual(pkg.scope.universeScope, 'ABSTRACT_SECTOR_7');
    assert.ok(pkg.scope.relevantEventIds.includes('EV_DISCOVERY_01'));
    assert.ok(pkg.scope.relevantConsequenceIds.includes('CNSQ_INSIGHT_01'));

    // Verify handoff contract
    assert.strictEqual(pkg.handoff.instanceRef, 'INST_E2E_001');
    assert.strictEqual(pkg.handoff.events.length, 1);
    assert.strictEqual(pkg.handoff.events[0].eventId, 'EV_DISCOVERY_01');
    assert.strictEqual(pkg.handoff.consequences.length, 1);
    assert.strictEqual(pkg.handoff.consequences[0].consequenceId, 'CNSQ_INSIGHT_01');

    // Verify lifecycle state
    assert.strictEqual(pkg.lifecycleStatus, StoryLifecycleStatus.READY_FOR_PRODUCTION);

    // Verify validation report
    assert.strictEqual(pkg.validationReport.isValid, true);
    assert.strictEqual(pkg.validationReport.canProceedToProduction, true);
    assert.strictEqual(pkg.validationReport.errors.length, 0);

    // Verify Canon immutability
    const immutabilityRes = CanonProtectionGuard.verifyContextImmutability(initialFingerprint, universeCtx);
    assert.strictEqual(immutabilityRes.success, true);
  });

  it('2. Completes full lifecycle through MockStoryTestRenderer (RENDERED -> VALIDATED -> COMPLETED)', () => {
    const universeCtx = createCompleteUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_E2E_02',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_DISCOVERY_01',
      universeScope: 'ABSTRACT_SECTOR_7',
      temporalAnchor: '2024-06-01T09:30:00Z',
      description: 'Mock rendering pipeline test'
    });

    const result = DailyStoryOrchestrator.produceStory(universeCtx, trigger);
    assert.strictEqual(result.success, true);
    const pkg = result.data!;

    const lifecycle = new StoryLifecycleManager(StoryLifecycleStatus.READY_FOR_PRODUCTION);
    const renderRes = MockStoryTestRenderer.renderAndComplete(pkg.handoff, lifecycle);

    assert.strictEqual(renderRes.success, true);
    assert.strictEqual(renderRes.data?.mockRenderStatus, 'MOCK_RENDERED');
    assert.strictEqual(lifecycle.currentStatus, StoryLifecycleStatus.COMPLETED);
  });
});
