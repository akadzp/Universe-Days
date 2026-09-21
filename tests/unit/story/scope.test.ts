import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StoryScopeValidator,
  StoryScopeBuilder,
  StoryScope
} from '../../../core/story/daily/scope.ts';
import {
  StoryTriggerType,
  createStoryTrigger
} from '../../../core/story/daily/trigger.ts';
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
} from '../../../core/universe/daily/index.ts';

function createMockUniverseContext(): UniversePeriodContext {
  const initRes = PeriodInitializer.initialize({
    startTime: TimePoint.parse('2024-01-01T08:00:00Z').data!,
    endTime: TimePoint.parse('2024-01-01T20:00:00Z').data!,
    universeScope: 'SCOPE_ALPHA'
  });
  const ctx = initRes.data!;
  ctx.events = [
    createUniverseEvent({
      eventId: 'EV_A1',
      temporalReference: '2024-01-01T10:00:00Z',
      initialStatus: UniverseEventStatus.OCCURRED
    })
  ];
  ctx.processes = [
    createUniverseProcess({
      processId: 'PROC_A1',
      startReference: '2024-01-01T08:00:00Z',
      initialStatus: UniverseProcessStatus.ACTIVE
    })
  ];
  ctx.consequences = [
    createUniverseConsequence({
      consequenceId: 'CNSQ_A1',
      sourceEventRef: 'EV_A1',
      temporalActivation: '2024-01-01T10:00:00Z',
      initialStatus: UniverseConsequenceStatus.RESOLVED
    }).data!
  ];
  ctx.unresolvedConditions = [
    createUnresolvedCondition({
      unresolvedId: 'UNRES_A1',
      sourceReference: 'EV_A1',
      temporalReference: '2024-01-01T08:00:00Z',
      reason: 'Scope testing',
      initialStatus: UnresolvedStatus.UNRESOLVED
    })
  ];
  return ctx;
}

describe('Phase 6 - Story Scope Unit Tests', () => {
  it('1. Validates a strictly scoped subset of Universe context', () => {
    const ctx = createMockUniverseContext();
    const scope: StoryScope = {
      scopeId: 'SCOPE_VALID_01',
      universeScope: 'SCOPE_ALPHA',
      primaryContext: 'Observation of Event A1',
      supportingContexts: ['Support 1'],
      relevantActorEntityRefs: [],
      relevantEventIds: ['EV_A1'],
      relevantProcessIds: ['PROC_A1'],
      relevantConsequenceIds: ['CNSQ_A1'],
      relevantUnresolvedIds: ['UNRES_A1'],
      relevantContinuityIds: [],
      relevantDomainReferences: ['TEMPORAL']
    };

    const report = StoryScopeValidator.validateScope(scope, ctx);
    assert.strictEqual(report.valid, true);
    assert.strictEqual(report.errors.length, 0);
    assert.strictEqual(report.scopedItemCounts.events, 1);
    assert.strictEqual(report.scopedItemCounts.processes, 1);
  });

  it('2. Rejects scope with unknown foreign event (unsupported claim)', () => {
    const ctx = createMockUniverseContext();
    const scope: StoryScope = {
      scopeId: 'SCOPE_INVALID_01',
      universeScope: 'SCOPE_ALPHA',
      primaryContext: 'Invalid event inclusion',
      supportingContexts: [],
      relevantActorEntityRefs: [],
      relevantEventIds: ['EV_UNKNOWN_999'], // Not in universe!
      relevantProcessIds: [],
      relevantConsequenceIds: [],
      relevantUnresolvedIds: [],
      relevantContinuityIds: [],
      relevantDomainReferences: []
    };

    const report = StoryScopeValidator.validateScope(scope, ctx);
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(e => e.includes('unknown eventId "EV_UNKNOWN_999"')));
  });

  it('3. Rejects scope contamination across different universe scopes', () => {
    const ctx = createMockUniverseContext();
    const scope: StoryScope = {
      scopeId: 'SCOPE_CONTAMINATED',
      universeScope: 'SCOPE_BETA', // Contamination!
      primaryContext: 'Wrong universe scope',
      supportingContexts: [],
      relevantActorEntityRefs: [],
      relevantEventIds: ['EV_A1'],
      relevantProcessIds: [],
      relevantConsequenceIds: [],
      relevantUnresolvedIds: [],
      relevantContinuityIds: [],
      relevantDomainReferences: []
    };

    const report = StoryScopeValidator.validateScope(scope, ctx);
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(e => e.includes('Scope contamination')));
  });

  it('4. Builds scope automatically from trigger and includes linked consequences', () => {
    const ctx = createMockUniverseContext();
    const trigger = createStoryTrigger({
      triggerId: 'TRIG_AUTO_01',
      type: StoryTriggerType.UNIVERSE_EVENT,
      sourceReference: 'EV_A1',
      universeScope: 'SCOPE_ALPHA',
      temporalAnchor: '2024-01-01T10:00:00Z',
      description: 'Auto scope build'
    });

    const res = StoryScopeBuilder.buildFromTrigger(trigger, ctx);
    assert.strictEqual(res.success, true);
    assert.ok(res.data);
    assert.strictEqual(res.data.universeScope, 'SCOPE_ALPHA');
    assert.deepStrictEqual(res.data.relevantEventIds, ['EV_A1']);
    assert.deepStrictEqual(res.data.relevantConsequenceIds, ['CNSQ_A1']);
  });
});
