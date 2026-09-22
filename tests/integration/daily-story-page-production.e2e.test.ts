/**
 * Phase 3 Integration & E2E Tests:
 * Authoritative Daily Universe -> Daily Story -> Daily Page -> Production Pipeline.
 *
 * Verifies that the entire pipeline is:
 * - Deterministic
 * - Authoritative-context driven (Universe is the single source of truth)
 * - Temporal & Continuation aware
 * - Validation-gated
 * - AI-authority safe
 * - Persistence & Restart safe
 * - Scope & Period isolated
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { createGenericSeedUniverse } from '../../core/universe/model/seed.ts';
import { UniverseModel } from '../../core/universe/model/universe.ts';
import { TimePoint } from '../../core/temporal/time-point.ts';
import { TemporalStatus } from '../../core/types/temporal.ts';
import { PeriodInitializer, UniversePeriodContext } from '../../core/universe/daily/initialization.ts';
import { DailyUniverseContinuation } from '../../core/universe/daily/continuation.ts';
import { DailyUniverseStatus, createUniversePeriod } from '../../core/universe/daily/period.ts';
import { UnresolvedStatus, createUnresolvedCondition } from '../../core/universe/daily/unresolved.ts';
import { UniverseProcessStatus, createUniverseProcess } from '../../core/universe/daily/process.ts';
import { DailyStoryOrchestrator } from '../../core/story/daily/orchestrator.ts';
import { StoryTriggerType, createStoryTrigger } from '../../core/story/daily/trigger.ts';
import { DailyPagePipeline } from '../../core/page/daily/pipeline.ts';
import { DailyPageValidator } from '../../core/page/daily/validation.ts';
import { ProductionContextCompiler } from '../../core/platform/context/compiler.ts';
import { ProductionRunner } from '../../core/platform/production/runner.ts';
import { DailyProductionBridge } from '../../core/platform/production/daily-bridge.ts';
import { FileUniverseSnapshotStore } from '../../core/platform/persistence/universe.ts';
import { FileProductionStore } from '../../core/platform/persistence/file.ts';
import { SemanticCache } from '../../core/platform/cache/semantic-cache.ts';
import { CostController } from '../../core/platform/cost/controller.ts';
import { AIProductionService } from '../../core/platform/ai/production.ts';
import { ProviderRegistry } from '../../core/platform/providers/index.ts';
import { BoundedPageBatchExecutor } from '../../core/platform/parallel/executor.ts';
import type { PageDefinition } from '../../core/platform/scaling/types.ts';
import type { ModelAdapter, GenerationRequest, GenerationResponse, ModelProfile } from '../../core/platform/model/types.ts';
import { makeDomainID, makeEntityID, makeSystemID } from '../../core/types/identifiers.ts';

class MockDeterministicModelAdapter implements ModelAdapter {
  public readonly profile: ModelProfile = {
    modelId: 'mock-deterministic-v1',
    providerId: 'mock-provider',
    tier: 'HIGH_CAPABILITY',
    capabilities: {
      structuredOutput: true,
      vision: false,
      embeddings: false,
      maxInputTokens: 32768,
      maxOutputTokens: 8192
    },
    costWeight: 1,
    qualityWeight: 1
  };

  constructor(
    private readonly handler?: (req: GenerationRequest) => { text: string; parsed?: any; shouldThrow?: boolean }
  ) {}

  async generate<T = unknown>(request: GenerationRequest): Promise<GenerationResponse<T>> {
    if (this.handler) {
      const res = this.handler(request);
      if (res.shouldThrow) {
        throw new Error('Simulated upstream AI provider network failure');
      }
      return {
        requestId: request.requestId,
        modelId: this.profile.modelId,
        providerId: this.profile.providerId,
        rawText: res.text,
        parsed: res.parsed as T,
        usage: { inputTokens: 40, outputTokens: 20 }
      };
    }
    return {
      requestId: request.requestId,
      modelId: this.profile.modelId,
      providerId: this.profile.providerId,
      rawText: `Generated output for task: ${request.task}`,
      parsed: { storySummary: `Valid production proposal for ${request.task}` } as T,
      usage: { inputTokens: 40, outputTokens: 20 }
    };
  }
}

function createTestRuntimeHarness(options?: {
  adapter?: ModelAdapter;
  dataDir?: string;
  pageDefinitions?: readonly PageDefinition[];
}) {
  const dataDir = options?.dataDir ?? path.resolve('.test_e2e_prod_data');
  const adapter = options?.adapter ?? new MockDeterministicModelAdapter();
  const providerRegistry = new ProviderRegistry([adapter]);
  const ai = new AIProductionService(providerRegistry);
  const contextCompiler = new ProductionContextCompiler();
  const semanticCache = new SemanticCache<any>();
  const costController = new CostController();
  const productionStore = new FileProductionStore({ rootDir: dataDir });
  const productionRunner = new ProductionRunner(contextCompiler, ai, semanticCache, costController, productionStore);
  const pageBatchExecutor = new BoundedPageBatchExecutor<any, any>(4);

  const defaultPages: readonly PageDefinition[] = options?.pageDefinitions ?? [
    {
      pageDefinitionId: 'PAGE_DEF_NARRATIVE',
      universeId: 'UNIVERSE_SEED_01',
      universeScope: 'UNIVERSE_DEFAULT',
      pageKey: 'DAILY_SUMMARY',
      pageScope: 'NARRATIVE',
      title: 'Daily Narrative Summary',
      priority: 10,
      concurrencyClass: 'STANDARD',
      tags: ['story', 'daily'],
      status: 'ENABLED'
    },
    {
      pageDefinitionId: 'PAGE_DEF_WORLD_STATUS',
      universeId: 'UNIVERSE_SEED_01',
      universeScope: 'UNIVERSE_DEFAULT',
      pageKey: 'WORLD_STATE',
      pageScope: 'SYSTEM',
      title: 'Daily World State',
      priority: 5,
      concurrencyClass: 'STANDARD',
      tags: ['system', 'status'],
      status: 'ENABLED'
    }
  ];

  const bridge = new DailyProductionBridge({
    productionRunner,
    pageBatchExecutor,
    listPageDefinitions: () => defaultPages
  });

  return {
    dataDir,
    adapter,
    providerRegistry,
    ai,
    contextCompiler,
    semanticCache,
    costController,
    productionStore,
    productionRunner,
    pageBatchExecutor,
    defaultPages,
    bridge
  };
}

describe('End-to-End Daily Story -> Daily Page -> Production Pipeline', () => {
  const TEST_PERSIST_DIR = path.resolve('.test_e2e_persistence');
  const TEST_PROD_DIR = path.resolve('.test_e2e_prod_data');

  beforeEach(() => {
    if (!fs.existsSync(TEST_PERSIST_DIR)) fs.mkdirSync(TEST_PERSIST_DIR, { recursive: true });
    if (!fs.existsSync(TEST_PROD_DIR)) fs.mkdirSync(TEST_PROD_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_PERSIST_DIR)) fs.rmSync(TEST_PERSIST_DIR, { recursive: true, force: true });
    if (fs.existsSync(TEST_PROD_DIR)) fs.rmSync(TEST_PROD_DIR, { recursive: true, force: true });
  });

  describe('A. Daily Continuation -> Story Package', () => {
    it('produces Story package for Period N+1 strictly grounded in discovered continuation context', () => {
      const universe = createGenericSeedUniverse();
      const p1Id = 'PERIOD_UNIVERSE_DEFAULT_20240101T000000Z_S0001';

      // Seed Universe having period 1 in its authoritative history
      const populatedUniverse: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-02',
          currentUniverseTime: '2024-01-02T00:00:00Z',
          currentPeriodRef: p1Id,
          periodSequence: 1
        },
        periods: {
          [p1Id]: createUniversePeriod({
            periodId: p1Id,
            universeScope: 'UNIVERSE_DEFAULT',
            startTime: TimePoint.parse('2024-01-01T00:00:00Z').data!,
            status: DailyUniverseStatus.FINALIZED
          })
        }
      };

      // 1. Authoritative Continuation & Period Initialization
      const initRes = PeriodInitializer.initialize({
        universe: populatedUniverse,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!,
        universeScope: 'UNIVERSE_DEFAULT'
      });
      assert.strictEqual(initRes.success, true);
      const dailyContext = initRes.data!;

      assert.strictEqual(dailyContext.initializationMode, 'NORMAL_CONTINUATION');
      assert.strictEqual(dailyContext.period.isFirstPeriod, false);
      assert.strictEqual(dailyContext.period.previousPeriodRef, p1Id);

      // 2. Daily Story Trigger & Production
      const trigger = createStoryTrigger({
        triggerId: 'TRIG_PERIOD_2_STORY',
        type: StoryTriggerType.EXPLICIT_REQUEST,
        sourceReference: dailyContext.period.periodId,
        universeScope: 'UNIVERSE_DEFAULT',
        temporalAnchor: '2024-01-02T00:00:00Z',
        description: 'Story production for period 2'
      });

      const storyRes = DailyStoryOrchestrator.produceStory(dailyContext, trigger);
      assert.strictEqual(storyRes.success, true);
      const storyPkg = storyRes.data!;

      assert.strictEqual(storyPkg.handoff.temporalContext.periodId, dailyContext.period.periodId);
      assert.strictEqual(storyPkg.storyDate.storyDate, '2024-01-02');
      assert.strictEqual(storyPkg.lifecycleStatus, 'READY_FOR_PRODUCTION');
    });
  });

  describe('B. Story Package -> Page Package Projection', () => {
    it('projects Page package from validated Story package with matched temporal and universe identity', () => {
      const universe = createGenericSeedUniverse();
      const initRes = PeriodInitializer.initialize({
        universe,
        startTime: TimePoint.parse('2024-01-01T00:00:00Z').data!,
        universeScope: 'UNIVERSE_DEFAULT'
      });
      const dailyContext = initRes.data!;

      const trigger = createStoryTrigger({
        triggerId: 'TRIG_PERIOD_1_STORY',
        type: StoryTriggerType.EXPLICIT_REQUEST,
        sourceReference: dailyContext.period.periodId,
        universeScope: 'UNIVERSE_DEFAULT',
        temporalAnchor: '2024-01-01T00:00:00Z',
        description: 'Story production for period 1'
      });

      const storyPkg = DailyStoryOrchestrator.produceStory(dailyContext, trigger).data!;

      const pipeline = new DailyPagePipeline();
      const pageRes = pipeline.run({
        universeId: universe.universeId,
        universeScope: 'UNIVERSE_DEFAULT',
        pageKey: 'DAILY_NARRATIVE',
        pageScope: 'NARRATIVE',
        universeContext: dailyContext,
        temporalStatus: TemporalStatus.ACTUAL,
        sourceSelection: {
          eventIds: [],
          processIds: [],
          continuityIds: [],
          unresolvedIds: [],
          futureInformationRefs: [],
          includeStory: true
        },
        storyPackage: storyPkg
      });

      assert.strictEqual(pageRes.success, true);
      const pageRun = pageRes.data!;
      assert.strictEqual(pageRun.status, 'COMPLETED');
      assert.strictEqual(pageRun.package.pageKey, 'DAILY_NARRATIVE');
      assert.strictEqual(pageRun.package.projection.storyId, storyPkg.storyId);
      assert.ok(pageRun.package.projection.sources.some(s => s.kind === 'STORY' && s.ref === storyPkg.storyId));
    });
  });

  describe('C. Page Package -> Production Context -> ProductionRunner', () => {
    it('compiles authoritative context and executes production runner safely', async () => {
      const harness = createTestRuntimeHarness();
      const universe = createGenericSeedUniverse();
      const initRes = PeriodInitializer.initialize({
        universe,
        startTime: TimePoint.parse('2024-01-01T00:00:00Z').data!,
        universeScope: 'UNIVERSE_DEFAULT'
      });
      const dailyContext = initRes.data!;

      const trigger = createStoryTrigger({
        triggerId: 'TRIG_P1',
        type: StoryTriggerType.EXPLICIT_REQUEST,
        sourceReference: dailyContext.period.periodId,
        universeScope: 'UNIVERSE_DEFAULT',
        temporalAnchor: '2024-01-01T00:00:00Z',
        description: 'Story trigger'
      });
      const storyPkg = DailyStoryOrchestrator.produceStory(dailyContext, trigger).data!;

      const pagePipeline = new DailyPagePipeline();
      const pageRun = pagePipeline.run({
        universeId: universe.universeId,
        universeScope: 'UNIVERSE_DEFAULT',
        pageKey: 'SUMMARY_PAGE',
        pageScope: 'NARRATIVE',
        universeContext: dailyContext,
        temporalStatus: TemporalStatus.ACTUAL,
        sourceSelection: { includeStory: true },
        storyPackage: storyPkg
      }).data!;

      const compiled = harness.contextCompiler.compile({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        purpose: 'DAILY_PAGE',
        userInstruction: 'Generate Daily Page summary',
        dailyContext,
        storyPackage: storyPkg,
        pagePackage: pageRun.package,
        budget: { inputLimit: 4096, outputReserve: 1024, safetyReserve: 128 }
      });

      assert.ok(compiled.sourceFingerprint);
      assert.strictEqual(compiled.context.authoritativeReferences.pageId, String(pageRun.package.pageId));
      assert.strictEqual(compiled.context.authoritativeReferences.storyId, storyPkg.storyId);

      const prodResult = await harness.productionRunner.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        purpose: 'DAILY_PAGE',
        userInstruction: 'Generate Daily Page summary',
        dailyContext,
        storyPackage: storyPkg,
        pagePackage: pageRun.package
      });

      assert.strictEqual(prodResult.status, 'COMPLETED');
      assert.ok(prodResult.runId);
      assert.strictEqual(prodResult.universeId, universe.universeId);
    });
  });

  describe('D. Full E2E Pipeline (Universe -> Continuation -> Story -> Page -> Production -> Result)', () => {
    it('executes full daily production pipeline through DailyProductionBridge deterministically', async () => {
      const harness = createTestRuntimeHarness();
      const universe = createGenericSeedUniverse();

      const result = await harness.bridge.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        userInstruction: 'Run full daily production for Universe Default'
      });

      assert.strictEqual(result.status, 'COMPLETED');
      assert.strictEqual(result.universeId, universe.universeId);
      assert.strictEqual(result.universeScope, 'UNIVERSE_DEFAULT');
      assert.strictEqual(result.initializationMode, 'FIRST_PERIOD');
      assert.ok(result.dailyContext);
      assert.ok(result.storyPackage);
      assert.strictEqual(result.storyProduction?.status, 'COMPLETED');
      assert.strictEqual(result.pagePackages.length, 2);
      assert.strictEqual(result.pageProduction?.completed, 2);
      assert.strictEqual(result.pageProduction?.failed, 0);
    });
  });

  describe('E. Restart Safety (Persistence -> Restart -> Continuation -> Story -> Page -> Production)', () => {
    it('preserves continuity across simulated process restart and executes period 2 seamlessly', async () => {
      const universeStore = new FileUniverseSnapshotStore({ rootDir: TEST_PERSIST_DIR });
      const universe = createGenericSeedUniverse();

      // =========================================================================
      // PROCESS A: Run Period 1 and save snapshot
      // =========================================================================
      const harnessA = createTestRuntimeHarness({ dataDir: TEST_PROD_DIR });
      const p1Result = await harnessA.bridge.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        userInstruction: 'Execute Period 1'
      });
      assert.strictEqual(p1Result.status, 'COMPLETED');
      const p1Id = p1Result.periodId;

      // Update universe model with completed period 1
      const universeAfterP1: UniverseModel = {
        ...universe,
        temporalContext: {
          currentUniverseDate: '2024-01-02',
          currentUniverseTime: '2024-01-02T00:00:00Z',
          currentPeriodRef: p1Id,
          periodSequence: 1
        },
        periods: {
          [p1Id]: {
            periodId: p1Id,
            universeScope: 'UNIVERSE_DEFAULT',
            startTime: p1Result.dailyContext!.period.startTime.toCanonical(),
            sequenceNumber: 1,
            status: 'FINALIZED',
            isFirstPeriod: true
          }
        }
      };

      // Persist snapshot to disk
      universeStore.save(universeAfterP1);

      // =========================================================================
      // PROCESS B: Fresh runtime starts up, loads snapshot from disk, runs Period 2
      // =========================================================================
      const loadedUniverse = universeStore.load(universe.universeId)!;
      assert.ok(loadedUniverse, 'Universe must be loaded from disk');
      assert.strictEqual(loadedUniverse.temporalContext.currentPeriodRef, p1Id);

      const harnessB = createTestRuntimeHarness({ dataDir: TEST_PROD_DIR });
      const p2Result = await harnessB.bridge.run({
        universe: loadedUniverse,
        universeScope: 'UNIVERSE_DEFAULT',
        userInstruction: 'Execute Period 2'
      });

      assert.strictEqual(p2Result.status, 'COMPLETED');
      assert.strictEqual(p2Result.initializationMode, 'NORMAL_CONTINUATION');
      assert.strictEqual(p2Result.dailyContext?.period.isFirstPeriod, false);
      assert.strictEqual(p2Result.dailyContext?.period.previousPeriodRef, p1Id);
      assert.ok(p2Result.storyPackage);
      assert.strictEqual(p2Result.storyPackage.handoff.temporalContext.periodId, p2Result.periodId);
      assert.strictEqual(p2Result.pagePackages.length, 2);
    });
  });

  describe('F. Scope & Universe Isolation', () => {
    it('rejects Story package from Universe B when passed to Page in Universe A', () => {
      const universeA = createGenericSeedUniverse();
      const universeB = { ...createGenericSeedUniverse(), universeId: 'UNIVERSE_OTHER_B' };

      const initA = PeriodInitializer.initialize({ universe: universeA, universeScope: 'UNIVERSE_DEFAULT' }).data!;
      const initB = PeriodInitializer.initialize({ universe: universeB, universeScope: 'UNIVERSE_OTHER' }).data!;

      const triggerB = createStoryTrigger({
        triggerId: 'TRIG_B',
        type: StoryTriggerType.EXPLICIT_REQUEST,
        sourceReference: initB.period.periodId,
        universeScope: 'UNIVERSE_OTHER',
        temporalAnchor: '2024-01-01T00:00:00Z',
        description: 'Story B'
      });
      const storyB = DailyStoryOrchestrator.produceStory(initB, triggerB).data!;

      const pagePipeline = new DailyPagePipeline();
      const res = pagePipeline.run({
        universeId: universeA.universeId,
        universeScope: 'UNIVERSE_DEFAULT',
        pageKey: 'PAGE_A',
        pageScope: 'NARRATIVE',
        universeContext: initA,
        temporalStatus: TemporalStatus.ACTUAL,
        sourceSelection: { includeStory: true },
        storyPackage: storyB
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.message.includes('Scope mismatch between Story package'));
    });

    it('rejects Production context compilation when scope mismatches between request and daily context', () => {
      const compiler = new ProductionContextCompiler();
      const universe = createGenericSeedUniverse();
      const init = PeriodInitializer.initialize({ universe, universeScope: 'SCOPE_ALPHA' }).data!;

      assert.throws(
        () => {
          compiler.compile({
            universe,
            universeScope: 'SCOPE_BETA', // Scope mismatch!
            purpose: 'GENERAL_PRODUCTION',
            userInstruction: 'Run production',
            dailyContext: init,
            budget: { inputLimit: 2048, outputReserve: 512, safetyReserve: 64 }
          });
        },
        /Universe scope mismatch/
      );
    });
  });

  describe('G. Period Mismatch Rejection', () => {
    it('rejects Page projection when Story package belongs to a different period than Page context', () => {
      const universe = createGenericSeedUniverse();
      const p1 = PeriodInitializer.initialize({
        universe,
        startTime: TimePoint.parse('2024-01-01T00:00:00Z').data!,
        universeScope: 'UNIVERSE_DEFAULT'
      }).data!;

      const triggerP1 = createStoryTrigger({
        triggerId: 'TRIG_P1',
        type: StoryTriggerType.EXPLICIT_REQUEST,
        sourceReference: p1.period.periodId,
        universeScope: 'UNIVERSE_DEFAULT',
        temporalAnchor: '2024-01-01T00:00:00Z',
        description: 'Story P1'
      });
      const storyPkgP1 = DailyStoryOrchestrator.produceStory(p1, triggerP1).data!;

      // Period 2 context
      const p2 = PeriodInitializer.initialize({
        universe,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!,
        universeScope: 'UNIVERSE_DEFAULT'
      }).data!;

      const pipeline = new DailyPagePipeline();
      const res = pipeline.run({
        universeId: universe.universeId,
        universeScope: 'UNIVERSE_DEFAULT',
        pageKey: 'PAGE_P2',
        pageScope: 'NARRATIVE',
        universeContext: p2, // Period 2 context with Period 1 Story
        temporalStatus: TemporalStatus.ACTUAL,
        sourceSelection: { includeStory: true },
        storyPackage: storyPkgP1
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.message.includes('Period mismatch between Story package'));
    });
  });

  describe('H. Location Reference Survival Across All Pipeline Layers', () => {
    it('preserves authoritative location references through Daily Context -> Story -> Page -> Production Context', async () => {
      const harness = createTestRuntimeHarness();
      const universe = createGenericSeedUniverse();
      const locId = 'LOC_GENERIC_A';
      assert.ok(universe.locations[locId], 'LOC_GENERIC_A location must exist in seed');

      const result = await harness.bridge.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        userInstruction: 'Inspect locations across daily production'
      });

      assert.strictEqual(result.status, 'COMPLETED');
      // Location in Universe
      assert.ok(universe.locations[locId]);
      // Context compiled in Production includes locations domain
      const compiled = harness.contextCompiler.compile({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        purpose: 'DAILY_STORY',
        userInstruction: 'Story production',
        dailyContext: result.dailyContext,
        storyPackage: result.storyPackage,
        budget: { inputLimit: 4096, outputReserve: 1024, safetyReserve: 128 }
      });

      assert.ok(compiled.context.contextBlocks.some(b => b.includes(locId)));
    });
  });

  describe('I. Unresolved Conditions Survival', () => {
    it('carries unresolved conditions into Story handoff and Page projection without loss', () => {
      const universe = createGenericSeedUniverse();
      const cond = createUnresolvedCondition({
        unresolvedId: 'COND_UNRESOLVED_MYSTERY_1',
        sourceReference: 'EV_GENERIC_1',
        temporalReference: '2024-01-01T00:00:00Z',
        reason: 'Mysterious power surge at substation',
        priority: 'HIGH',
        initialStatus: UnresolvedStatus.UNRESOLVED
      });

      const populatedUniverse: UniverseModel = {
        ...universe,
        unresolvedConditions: {
          [cond.unresolvedId]: cond
        }
      };

      const init = PeriodInitializer.initialize({
        universe: populatedUniverse,
        universeScope: 'UNIVERSE_DEFAULT'
      }).data!;

      assert.strictEqual(init.unresolvedConditions.length, 1);
      assert.strictEqual(init.unresolvedConditions[0].unresolvedId, cond.unresolvedId);

      const trigger = createStoryTrigger({
        triggerId: 'TRIG_UNRESOLVED',
        type: StoryTriggerType.EXPLICIT_REQUEST,
        sourceReference: init.period.periodId,
        universeScope: 'UNIVERSE_DEFAULT',
        temporalAnchor: '2024-01-01T00:00:00Z',
        description: 'Story on mystery'
      });

      const story = DailyStoryOrchestrator.produceStory(init, trigger).data!;
      assert.ok(story.handoff.unresolvedConditions.some(u => u.unresolvedId === cond.unresolvedId));

      const pagePipeline = new DailyPagePipeline();
      const pageRes = pagePipeline.run({
        universeId: populatedUniverse.universeId,
        universeScope: 'UNIVERSE_DEFAULT',
        pageKey: 'MYSTERY_TRACKER',
        pageScope: 'SYSTEM',
        universeContext: init,
        temporalStatus: TemporalStatus.ACTUAL,
        sourceSelection: { unresolvedIds: [cond.unresolvedId] }
      });

      assert.strictEqual(pageRes.success, true);
      assert.ok(pageRes.data!.package.projection.sources.some(s => s.kind === 'UNRESOLVED' && s.ref === cond.unresolvedId));
    });
  });

  describe('J. Future Information Handling', () => {
    it('maintains future information as opaque references and prevents mutation into current events', () => {
      const universe = createGenericSeedUniverse();
      const futureRef = 'FUTURE_SCHEDULED_FESTIVAL_2024_02';

      const init = PeriodInitializer.initialize({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        previousFutureInfo: [
          {
            futureId: futureRef,
            description: 'Annual Solstice Festival scheduled next month',
            targetTimeReference: '2024-02-01T00:00:00Z',
            traceability: {
              requestId: 'REQ_FUT_1' as any,
              sourceSystem: 'DAILY_UNIVERSE_SYSTEM' as any,
              initiatedAt: '2024-01-01T00:00:00Z',
              authorizedBy: 'AUTHORITY_SYSTEM' as any
            }
          }
        ]
      }).data!;

      assert.strictEqual(init.futureInfo.length, 1);
      assert.strictEqual(init.futureInfo[0].futureId, futureRef);

      const pagePipeline = new DailyPagePipeline();
      const pageRes = pagePipeline.run({
        universeId: universe.universeId,
        universeScope: 'UNIVERSE_DEFAULT',
        pageKey: 'UPCOMING_EVENTS',
        pageScope: 'SYSTEM',
        universeContext: init,
        temporalStatus: TemporalStatus.ACTUAL,
        sourceSelection: { futureInformationRefs: [futureRef] }
      });

      assert.strictEqual(pageRes.success, true);
      assert.ok(pageRes.data!.package.projection.sources.some(s => s.kind === 'FUTURE_INFORMATION' && s.ref === futureRef));
    });
  });

  describe('K. AI Authority Boundary Enforcement', () => {
    it('rejects AI proposal attempting to inject forbidden authoritative properties or canon mutations', async () => {
      // Model that proposes forbidden canon mutation keys
      const adapter = new MockDeterministicModelAdapter(() => ({
        text: 'Proposal with forbidden keys',
        parsed: {
          storyContent: 'The character moved.',
          mutateCanon: true, // FORBIDDEN!
          createLocation: { locationId: 'LOC_ILLEGAL' } // FORBIDDEN!
        }
      }));

      const harness = createTestRuntimeHarness({ adapter });
      const universe = createGenericSeedUniverse();
      const init = PeriodInitializer.initialize({ universe, universeScope: 'UNIVERSE_DEFAULT' }).data!;

      const trigger = createStoryTrigger({
        triggerId: 'TRIG_FORBIDDEN',
        type: StoryTriggerType.EXPLICIT_REQUEST,
        sourceReference: init.period.periodId,
        universeScope: 'UNIVERSE_DEFAULT',
        temporalAnchor: '2024-01-01T00:00:00Z',
        description: 'Story trigger'
      });
      const storyPkg = DailyStoryOrchestrator.produceStory(init, trigger).data!;

      const prodResult = await harness.productionRunner.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        purpose: 'DAILY_STORY',
        userInstruction: 'Generate story',
        dailyContext: init,
        storyPackage: storyPkg
      });

      assert.strictEqual(prodResult.status, 'FAILED');
      assert.ok(prodResult.reason?.includes('Proposal failed output validation'));
      assert.ok(prodResult.reason?.includes('AUTHORITY_BOUNDARY'));
    });
  });

  describe('L. Semantic Cache Correctness', () => {
    it('returns cached output on identical context and avoids stale collision when universe context changes', async () => {
      let callCount = 0;
      const adapter = new MockDeterministicModelAdapter(() => {
        callCount += 1;
        return {
          text: `Call ${callCount}`,
          parsed: { count: callCount }
        };
      });

      const harness = createTestRuntimeHarness({ adapter });
      const universeA = createGenericSeedUniverse();
      const initA = PeriodInitializer.initialize({ universe: universeA, universeScope: 'UNIVERSE_DEFAULT' }).data!;

      // First run
      const res1 = await harness.productionRunner.run({
        universe: universeA,
        universeScope: 'UNIVERSE_DEFAULT',
        purpose: 'DAILY_STORY',
        userInstruction: 'Instruction Alpha',
        dailyContext: initA
      });
      assert.strictEqual(res1.status, 'COMPLETED');
      assert.strictEqual(callCount, 1);

      // Identical second run -> Cache Hit!
      const res2 = await harness.productionRunner.run({
        universe: universeA,
        universeScope: 'UNIVERSE_DEFAULT',
        purpose: 'DAILY_STORY',
        userInstruction: 'Instruction Alpha',
        dailyContext: initA
      });
      assert.strictEqual(res2.status, 'CACHED');
      assert.strictEqual(res2.cached, true);
      assert.strictEqual(callCount, 1);

      // Modified universe state (e.g. advance time) -> Cache Miss!
      const universeB: UniverseModel = {
        ...universeA,
        temporalContext: {
          ...universeA.temporalContext,
          currentUniverseDate: '2024-01-02',
          currentUniverseTime: '2024-01-02T00:00:00Z'
        }
      };
      const initB = PeriodInitializer.initialize({
        universe: universeB,
        startTime: TimePoint.parse('2024-01-02T00:00:00Z').data!,
        universeScope: 'UNIVERSE_DEFAULT'
      }).data!;

      const res3 = await harness.productionRunner.run({
        universe: universeB,
        universeScope: 'UNIVERSE_DEFAULT',
        purpose: 'DAILY_STORY',
        userInstruction: 'Instruction Alpha',
        dailyContext: initB
      });
      assert.strictEqual(res3.status, 'COMPLETED');
      assert.strictEqual(callCount, 2);
    });
  });

  describe('M. Provider Failure Resilience', () => {
    it('handles provider network failure gracefully without mutating universe or daily context', async () => {
      const adapter = new MockDeterministicModelAdapter(() => ({
        text: '',
        shouldThrow: true
      }));

      const harness = createTestRuntimeHarness({ adapter });
      const universe = createGenericSeedUniverse();
      const initialFingerprint = JSON.stringify(universe);

      const result = await harness.bridge.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        userInstruction: 'Attempt daily production'
      });

      assert.strictEqual(result.status, 'FAILED');
      assert.strictEqual(JSON.stringify(universe), initialFingerprint, 'Universe must not be mutated on provider failure');
    });
  });

  describe('N. Page Partial Failure Semantics', () => {
    it('returns PARTIAL status when one page succeeds and another page fails', async () => {
      const pageDefinitions: readonly PageDefinition[] = [
        {
          pageDefinitionId: 'PAGE_DEF_SUCCESS',
          universeId: 'UNIVERSE_SEED_01',
          universeScope: 'UNIVERSE_DEFAULT',
          pageKey: 'PAGE_SUCCESS',
          pageScope: 'SYSTEM',
          title: 'Successful Page',
          priority: 10,
          concurrencyClass: 'STANDARD',
          tags: ['system'],
          status: 'ENABLED'
        },
        {
          pageDefinitionId: 'PAGE_DEF_FAIL',
          universeId: 'UNIVERSE_SEED_01',
          universeScope: 'UNIVERSE_DEFAULT',
          pageKey: 'PAGE_FAIL',
          pageScope: 'SYSTEM',
          title: 'Failing Page',
          priority: 5,
          concurrencyClass: 'STANDARD',
          tags: ['system'],
          status: 'ENABLED'
        }
      ];

      // Adapter succeeds for story and PAGE_SUCCESS, but throws on PAGE_FAIL
      const adapter = new MockDeterministicModelAdapter(req => {
        if (req.userContext.includes('PAGE_FAIL')) {
          return { text: '', shouldThrow: true };
        }
        return {
          text: 'Success response',
          parsed: { status: 'OK' }
        };
      });

      const harness = createTestRuntimeHarness({ pageDefinitions, adapter });
      const universe = createGenericSeedUniverse();

      const result = await harness.bridge.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        userInstruction: 'Run batch with mixed pages'
      });

      assert.strictEqual(result.status, 'PARTIAL');
      assert.strictEqual(result.pagePackages.length, 2);
      assert.strictEqual(result.pageProduction?.completed, 1);
      assert.strictEqual(result.pageProduction?.failed, 1);
    });
  });

  describe('O. Idempotency & Deterministic Identity', () => {
    it('produces identical deterministic run IDs for identical pipeline executions', async () => {
      const harness = createTestRuntimeHarness();
      const universe = createGenericSeedUniverse();

      const result1 = await harness.bridge.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        userInstruction: 'Deterministic execution test'
      });

      const result2 = await harness.bridge.run({
        universe,
        universeScope: 'UNIVERSE_DEFAULT',
        userInstruction: 'Deterministic execution test'
      });

      assert.strictEqual(result1.runId, result2.runId);
      assert.strictEqual(result1.periodId, result2.periodId);
      assert.strictEqual(result1.storyPackage?.storyId, result2.storyPackage?.storyId);
    });
  });
});
