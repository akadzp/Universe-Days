/** Phase 34 — hardened production composition root. */
import { PageCatalog } from '../../INFRA/SCALING/catalog.ts';
import { BoundedPageBatchExecutor } from '../../INFRA/PARALLEL/executor.ts';
import { TokenBudgetManager } from '../../INFRA/TOKEN/budget.ts';
import { TokenContextPlanner } from '../../INFRA/TOKEN/context-plan.ts';
import { DeterministicContextCompressor } from '../../INFRA/CONTEXT/compressor.ts';
import { SemanticCache } from '../../INFRA/CACHE/semantic-cache.ts';
import { ContinuityLedger } from '../../INFRA/CONTINUITY-LEDGER/ledger.ts';
import { InMemoryCheckpointStore } from '../../INFRA/RECOVERY/checkpoint.ts';
import { RecoveryManager } from '../../INFRA/RECOVERY/manager.ts';
import { VersionRegistry } from '../../INFRA/VERSIONING/registry.ts';
import type { ModelAdapter } from '../../INFRA/MODEL/types.ts';
import { ModelRouter } from '../../INFRA/MODEL';
import { createGeminiAdapterFromEnv, AIProductionService } from '../../INFRA/AI';
import { HardenedRuntimeBoundary } from '../../INFRA/HARDENING';
import { DefaultProductionPageService } from '../../INFRA/FINAL/service.ts';
import { ProductionContextCompiler } from '../../INFRA/CONTEXT/compiler.ts';
import { ProductionOutputValidator } from '../../INFRA/VALIDATION/validator.ts';
import { ProductionRunner } from '../../INFRA/PRODUCTION/runtime/runner.ts';
import { DailyProductionBridge } from '../../INFRA/PRODUCTION/runtime/daily-bridge.ts';
import { FileProductionStore } from '../../INFRA/PERSISTENCE/file.ts';
import { FileScheduledJobStore } from '../../INFRA/PERSISTENCE/scheduled-jobs.ts';
import { FileUniverseSnapshotStore } from '../../INFRA/PERSISTENCE/universe.ts';
import { PageProductionScheduler } from '../../INFRA/SCHEDULER/scheduler.ts';
import { ScheduledProductionDispatcher } from '../../INFRA/SCHEDULER/dispatcher.ts';
import { CostController } from '../../INFRA/COST/controller.ts';
import { ProviderRegistry, createOpenAICompatibleAdapterFromEnv } from '../../INFRA/PROVIDERS';
import { UniverseAuthorityStore, UniverseInstanceManager } from '../../INFRA/INSTANCE';

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
  readonly universeStartupLoadError: string | null;
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

function boundedConcurrency(value: number | undefined): number {
  const requested = value ?? 4;
  if (!Number.isInteger(requested) || requested < 1 || requested > 32) throw new Error('Runtime concurrency must be an integer between 1 and 32.');
  return requested;
}

export function createProductionRuntime(options?: ProductionRuntimeOptions): ProductionRuntime {
  const pageCatalog = new PageCatalog();
  const pageBatchExecutor = new BoundedPageBatchExecutor<any, any>(boundedConcurrency(options?.concurrency));
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
  const productionRunner = new ProductionRunner(contextCompiler, ai, semanticCache, costController, productionStore);
  const scheduler = new PageProductionScheduler(pageCatalog);
  const universeAuthority = new UniverseAuthorityStore();
  const universeInstances = new UniverseInstanceManager(universeAuthority, universeStore);
  const dailyBridge = new DailyProductionBridge({ productionRunner, pageBatchExecutor, listPageDefinitions: () => pageCatalog.list({ enabledOnly: true }) });
  const scheduledJobStore = new FileScheduledJobStore({ rootDir: options?.scheduledDataDir });
  const schedulerDispatcher = new ScheduledProductionDispatcher({ scheduler, pageCatalog, bridge: dailyBridge, authority: universeAuthority, executor: pageBatchExecutor as BoundedPageBatchExecutor<any, any>, jobStore: scheduledJobStore });

  let universeStartupLoadError: string | null = null;
  if (options?.autoLoadPersistedUniverse !== false) {
    try {
      universeInstances.loadCurrent();
    } catch (error) {
      universeStartupLoadError = error instanceof Error ? error.message : String(error);
      console.error(`[UniverseInstanceManager] Auto-load blocked: ${universeStartupLoadError}`);
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
    universeStartupLoadError,
    costController,
    providerRegistry,
    hardening
  });
}
