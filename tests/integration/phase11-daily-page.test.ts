import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DailyPagePipeline,
  InMemoryDailyPageRepository
} from '../../core/page/index.ts';
import { TimePoint } from '../../core/temporal/time-point.ts';
import { TemporalPosition, TemporalStatus } from '../../core/types/temporal.ts';
import { PeriodInitializer } from '../../core/universe/daily/initialization.ts';
import { createUniverseEvent, UniverseEventStatus } from '../../core/universe/daily/event.ts';

function buildContext() {
  const start = TimePoint.parse('2024-07-01T10:00:00Z').data!;
  const event = createUniverseEvent({
    eventId: 'EV_TEST_001',
    temporalReference: '2024-07-01T09:00:00Z',
    initialStatus: UniverseEventStatus.READY
  });

  const initialized = PeriodInitializer.initialize({
    startTime: start,
    endTime: TimePoint.parse('2024-07-01T22:00:00Z').data!,
    universeScope: 'GENERIC_SCOPE',
    initialEvents: [event]
  });

  assert.equal(initialized.success, true);
  return initialized.data!;
}

describe('Phase 11 - Daily Page System', () => {
  it('produces a page without any Daily Story package', () => {
    const repository = new InMemoryDailyPageRepository();
    const pipeline = new DailyPagePipeline({ repository });
    const context = buildContext();

    const result = pipeline.run({
      universeId: 'UNIVERSE_TEST_001',
      universeScope: 'GENERIC_SCOPE',
      pageKey: 'PAGE_TEST',
      pageScope: 'GENERIC_PAGE_SCOPE',
      universeContext: context,
      temporalStatus: TemporalStatus.ACTUAL,
      sourceSelection: {
        eventIds: ['EV_TEST_001']
      }
    });

    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data?.package.temporalFrame.position, TemporalPosition.PRESENT);
    assert.equal(result.data?.package.projection.storyId, undefined);
    assert.equal(repository.list().data?.length, 1);
  });

  it('classifies a past anchor against Universe Time', () => {
    const pipeline = new DailyPagePipeline();
    const context = buildContext();

    const result = pipeline.run({
      universeId: 'UNIVERSE_TEST_001',
      universeScope: 'GENERIC_SCOPE',
      pageKey: 'PAGE_PAST',
      pageScope: 'GENERIC_PAGE_SCOPE',
      universeContext: context,
      temporalAnchor: TimePoint.parse('2024-06-30T22:00:00Z').data!,
      temporalStatus: TemporalStatus.MEMORY,
      sourceSelection: {}
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.package.temporalFrame.position, TemporalPosition.PAST);
  });

  it('classifies a future anchor without turning it into actual fact', () => {
    const pipeline = new DailyPagePipeline();
    const context = buildContext();

    const result = pipeline.run({
      universeId: 'UNIVERSE_TEST_001',
      universeScope: 'GENERIC_SCOPE',
      pageKey: 'PAGE_FUTURE',
      pageScope: 'GENERIC_PAGE_SCOPE',
      universeContext: context,
      temporalAnchor: TimePoint.parse('2024-07-02T10:00:00Z').data!,
      temporalStatus: TemporalStatus.PREDICTION,
      sourceSelection: {}
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.package.temporalFrame.position, TemporalPosition.FUTURE);
    assert.equal(result.data?.package.temporalFrame.status, TemporalStatus.PREDICTION);
  });

  it('is deterministic for identical inputs', () => {
    const pipelineA = new DailyPagePipeline();
    const pipelineB = new DailyPagePipeline();
    const contextA = buildContext();
    const contextB = buildContext();

    const input = {
      universeId: 'UNIVERSE_TEST_001',
      universeScope: 'GENERIC_SCOPE',
      pageKey: 'PAGE_DETERMINISTIC',
      pageScope: 'GENERIC_PAGE_SCOPE',
      temporalStatus: TemporalStatus.ACTUAL,
      sourceSelection: { eventIds: ['EV_TEST_001'] as const }
    };

    const resultA = pipelineA.run({ ...input, universeContext: contextA });
    const resultB = pipelineB.run({ ...input, universeContext: contextB });

    assert.equal(resultA.success, true);
    assert.equal(resultB.success, true);
    assert.equal(resultA.data?.pageId, resultB.data?.pageId);
    assert.deepEqual(resultA.data?.package.projection, resultB.data?.package.projection);
  });

  it('blocks when a requested source does not exist', () => {
    const pipeline = new DailyPagePipeline();
    const result = pipeline.run({
      universeId: 'UNIVERSE_TEST_001',
      universeScope: 'GENERIC_SCOPE',
      pageKey: 'PAGE_INVALID',
      pageScope: 'GENERIC_PAGE_SCOPE',
      universeContext: buildContext(),
      temporalStatus: TemporalStatus.ACTUAL,
      sourceSelection: { eventIds: ['EV_DOES_NOT_EXIST'] }
    });

    assert.equal(result.success, false);
    assert.equal(result.status, 'BLOCKED');
  });

  it('does not persist during dry run', () => {
    const repository = new InMemoryDailyPageRepository();
    const pipeline = new DailyPagePipeline({ repository });
    const result = pipeline.run({
      universeId: 'UNIVERSE_TEST_001',
      universeScope: 'GENERIC_SCOPE',
      pageKey: 'PAGE_DRY_RUN',
      pageScope: 'GENERIC_PAGE_SCOPE',
      universeContext: buildContext(),
      temporalStatus: TemporalStatus.ACTUAL,
      sourceSelection: {},
      dryRun: true
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.persisted, false);
    assert.equal(repository.list().data?.length, 0);
  });
});
