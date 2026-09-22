/** Phase 34 — final production composition root. */
import { PageCatalog } from '../scaling/catalog.ts';
import { BoundedPageBatchExecutor } from '../parallel/executor.ts';
import { TokenBudgetManager } from '../token/budget.ts';
import { TokenContextPlanner } from '../token/context-plan.ts';
import { DeterministicContextCompressor } from '../context/compressor.ts';
import { SemanticCache } from '../cache/semantic-cache.ts';
import { ContinuityLedger } from '../continuity/ledger.ts';
import { InMemoryCheckpointStore } from '../recovery/checkpoint.ts';
import { RecoveryManager } from '../recovery/manager.ts';
import { VersionRegistry } from '../versioning/registry.ts';
import type { ModelAdapter } from '../model/types.ts';
import { ModelRouter } from '../model/index.ts';
import { createGeminiAdapterFromEnv, AIProductionService } from '../ai/index.ts';
import { HardenedRuntimeBoundary } from '../hardening/index.ts';
import { DefaultProductionPageService } from './service.ts';
import { ProductionContextCompiler } from '../context/compiler.ts';
import { ProductionOutputValidator } from '../validation/validator.ts';
import { ProductionRunner } from '../production/runner.ts';
import { DailyProductionBridge } from '../production/daily-bridge.ts';
import { FileProductionStore } from '../persistence/file.ts';
import { FileScheduledJobStore } from '../persistence/scheduled-jobs.ts';
import { FileUniverseSnapshotStore } from '../persistence/universe.ts';
import { PageProductionScheduler } from '../scheduler/scheduler.ts';
import { ScheduledProductionDispatcher } from '../scheduler/dispatcher.ts';
import { CostController } from '../cost/controller.ts';
import { ProviderRegistry, createOpenAICompatibleAdapterFromEnv } from '../providers/index.ts';
import { UniverseAuthorityStore, UniverseInstanceManager } from '../universe/index.ts';

export interface ProductionRuntime {
  readonly pageCatalog: PageCatalog;
  readonly pageBatchExecutor: BoundedPageBatchExecutor<any, any>;
  readonly pageService: DefaultProductionPageService<any, any>;
  readonly tokenBudget: TokenBudgetManager;
  readonly tokenPlanner: TokenContextPlanner;
  readonly contextCompressor: DeterministicContextCompressor;
  readonly semanticCache: SemanticCache<any>;
  readonly continuity: ContinuityLedger;
  readonly checkpoints: InMemoryCheckpointStore<any>;
  readonly recovery: RecoveryManager<any>;
  readonly versions: VersionRegistry;
  readonly models: ModelRouter;
  readonly ai: AIProductionService;
  readonly contextCompiler: ProductionContextCompiler;
  readonly outputValidator: ProductionOutputValidator;
  readonly productionStore: FileProductionStore;
  readonly productionRunner: ProductionRunner;
  readonly dailyBridge: DailyProductionBridge;
  readonly scheduler: PageProductionScheduler;
  readonly scheduledJobStore: FileScheduledJobStore;
  readonly schedulerDispatcher: ScheduledProductionDispatcher;
  readonly universeAuthority: UniverseAuthorityStore;
  readonly universeStore: FileUniverseSnapshotStore;
  readonly universeInstances: UniverseInstanceManager;
  readonly costController: CostController;
  readonly providerRegistry: ProviderRegistry;
  readonly hardening: HardenedRuntimeBoundary;
}

export interface ProductionRuntimeOptions {
  readonly modelAdapters?: readonly ModelAdapter[];
  readonly concurrency?: number;
  readonly hardening?: ConstructorParameters<typeof HardenedRuntimeBoundary>[0];
  readonly loadEnvironmentProviders?: boolean;
  readonly dataDir?: string;
  readonly scheduledDataDir?: string;
  readonly universeDataDir?: string;
  readonly autoLoadPersistedUniverse?: boolean;
  readonly costBudget?: ConstructorParameters<typeof CostController>[0];
}

export function createProductionRuntime(options?: ProductionRuntimeOptions): ProductionRuntime {
  const pageCatalog = new PageCatalog();
  const pageBatchExecutor = new BoundedPageBatchExecutor<any, any>(options?.concurrency ?? 4);
  const hardening = new HardenedRuntimeBoundary(options?.hardening);
  const checkpoints = new InMemoryCheckpointStore<any>();
  const explicit = options?.modelAdapters ?? [];
  const env: ModelAdapter[] = [];

  if (options?.loadEnvironmentProviders !== false) {
    const gemini = createGeminiAdapterFromEnv();
    const compatible = createOpenAICompatibleAdapterFromEnv();
    if (gemini) env.push(gemini);
    if (compatible) env.push(compatible);
  }

  const adapters = [...explicit, ...env];
  const models = new ModelRouter(adapters);
  const providerRegistry = new ProviderRegistry(adapters);
  const ai = new AIProductionService(providerRegistry);
  const contextCompiler = new ProductionContextCompiler();
  const outputValidator = new ProductionOutputValidator();
  const productionStore = new FileProductionStore({ rootDir: options?.dataDir });
  const universeStore = new FileUniverseSnapshotStore({ rootDir: options?.universeDataDir });
  const costController = new CostController(options?.costBudget);
  const semanticCache = new SemanticCache<any>();
  const productionRunner = new ProductionRunner(
    contextCompiler,
    ai,
    semanticCache,
    costController,
    productionStore
  );
  const scheduler = new PageProductionScheduler(pageCatalog);
  const universeAuthority = new UniverseAuthorityStore();
  const universeInstances = new UniverseInstanceManager(universeAuthority, universeStore);
  const dailyBridge = new DailyProductionBridge({
    productionRunner,
    pageBatchExecutor,
    listPageDefinitions: () => pageCatalog.list({ enabledOnly: true })
  });
  const scheduledJobStore = new FileScheduledJobStore({ rootDir: options?.scheduledDataDir });
  const schedulerDispatcher = new ScheduledProductionDispatcher({
    scheduler,
    pageCatalog,
    bridge: dailyBridge,
    authority: universeAuthority,
    executor: pageBatchExecutor as BoundedPageBatchExecutor<any, any>,
    jobStore: scheduledJobStore
  });

  if (options?.autoLoadPersistedUniverse !== false) {
    try {
      universeInstances.loadCurrent();
    } catch (error) {
      // Persistent corruption must not be silently repaired or replaced.
      // Keep the runtime unmounted so Control Center can surface the failure.
      console.error(`[UniverseInstanceManager] Auto-load blocked: ${String(error)}`);
    }
  }

  return Object.freeze({
    pageCatalog,
    pageBatchExecutor,
    pageService: new DefaultProductionPageService(pageCatalog, hardening, pageBatchExecutor),
    tokenBudget: new TokenBudgetManager(),
    tokenPlanner: new TokenContextPlanner(),
    contextCompressor: new DeterministicContextCompressor(),
    semanticCache,
    continuity: new ContinuityLedger(),
    checkpoints,
    recovery: new RecoveryManager(checkpoints),
    versions: new VersionRegistry(),
    models,
    ai,
    contextCompiler,
    outputValidator,
    productionStore,
    productionRunner,
    dailyBridge,
    scheduler,
    scheduledJobStore,
    schedulerDispatcher,
    universeAuthority,
    universeStore,
    universeInstances,
    costController,
    providerRegistry,
    hardening
  });
}
