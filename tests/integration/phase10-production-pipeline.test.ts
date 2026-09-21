import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DailyProductionPipeline,
  DeterministicMockProductionRenderer
} from '../../core/production/index.ts';

import {
  StoryTriggerType,
  createStoryTrigger
} from '../../core/story/daily/trigger.ts';

import {
  createUniverseEvent,
  UniverseEventStatus
} from '../../core/universe/daily/index.ts';

import { TimePoint } from '../../core/temporal/time-point.ts';

function buildInput() {
  const startTime = TimePoint.parse('2024-07-01T08:00:00Z').data!;

  const event = createUniverseEvent({
    eventId: 'EV_PHASE10_GENERIC',
    temporalReference: '2024-07-01T09:00:00Z',
    initialStatus: UniverseEventStatus.READY
  });

  const trigger = createStoryTrigger({
    triggerId: 'TRIG_PHASE10_GENERIC',
    type: StoryTriggerType.UNIVERSE_EVENT,
    sourceReference: event.eventId,
    universeScope: 'GENERIC_SCOPE',
    temporalAnchor: '2024-07-01T09:00:00Z',
    description: 'Generic Phase 10 pipeline trigger'
  });

  return {
    universeId: 'UNIVERSE_GENERIC_PHASE10',
    universeScope: 'GENERIC_SCOPE',
    startTime,
    endTime: TimePoint.parse('2024-07-01T22:00:00Z').data!,
    initialEvents: [event],
    storyTrigger: trigger,
    renderer: new DeterministicMockProductionRenderer()
  };
}

describe('Phase 10 - End-to-End Production Pipeline', () => {
  it('runs INPUT -> INITIALIZATION -> PROGRESSION -> STORY -> RENDER -> FINALIZATION -> PERSISTENCE', async () => {
    const pipeline = new DailyProductionPipeline();

    const result = await pipeline.run(buildInput());

    assert.equal(result.success, true);
    assert.ok(result.data);

    const run = result.data!;
    assert.equal(run.status, 'COMPLETED');
    assert.equal(run.universeId, 'UNIVERSE_GENERIC_PHASE10');
    assert.equal(run.storyPackage.lifecycleStatus, 'READY_FOR_PRODUCTION');
    assert.equal(run.renderResult.status, 'VALIDATED');
    assert.equal(
      run.finalization.finalStatus,
      'FINALIZED'
    );
    assert.equal(
      run.periodContext.period.status,
      'FINALIZED'
    );

    assert.ok(
      run.traces.some(t => t.stage === 'INITIALIZATION' && t.status === 'PASSED')
    );
    assert.ok(
      run.traces.some(t => t.stage === 'STORY' && t.status === 'PASSED')
    );
    assert.ok(
      run.traces.some(t => t.stage === 'RENDER' && t.status === 'PASSED')
    );
    assert.ok(
      run.traces.some(t => t.stage === 'FINALIZATION' && t.status === 'PASSED')
    );
    assert.ok(
      run.traces.some(t => t.stage === 'PERSISTENCE' && t.status === 'PASSED')
    );
  });

  it('uses a deterministic run ID for identical explicit inputs', async () => {
    const pipelineA = new DailyProductionPipeline();
    const pipelineB = new DailyProductionPipeline();

    const inputA = buildInput();
    const inputB = buildInput();

    const resultA = await pipelineA.run(inputA);
    const resultB = await pipelineB.run(inputB);

    assert.equal(resultA.success, true);
    assert.equal(resultB.success, true);
    assert.equal(resultA.data?.runId, resultB.data?.runId);
    assert.equal(
      resultA.data?.storyPackage.storyId,
      resultB.data?.storyPackage.storyId
    );
  });

  it('does not persist when dryRun is enabled', async () => {
    const pipeline = new DailyProductionPipeline();
    const result = await pipeline.run({
      ...buildInput(),
      dryRun: true
    });

    assert.equal(result.success, true);
    assert.equal(pipeline.runRepository.list().data?.length, 0);
  });

  it('blocks before finalization when the story trigger is invalid', async () => {
    const pipeline = new DailyProductionPipeline();

    const input = buildInput();
    const invalidInput = {
      ...input,
      storyTrigger: createStoryTrigger({
        triggerId: 'TRIG_INVALID_PHASE10',
        type: StoryTriggerType.UNIVERSE_EVENT,
        sourceReference: 'EV_DOES_NOT_EXIST',
        universeScope: 'GENERIC_SCOPE',
        temporalAnchor: '2024-07-01T09:00:00Z',
        description: 'Invalid trigger'
      })
    };

    const result = await pipeline.run(invalidInput);

    assert.equal(result.success, false);
    assert.equal(result.status, 'FAILURE');
    assert.equal(
      pipeline.runRepository.list().data?.length,
      0
    );
  });
});
