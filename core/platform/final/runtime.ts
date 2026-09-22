/** Phase 25 + Phase 26 — final production composition root. */

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
import { ModelAdapter, ModelRouter } from '../model/index.ts';
import { createGeminiAdapterFromEnv, AIProductionService } from '../ai/index.ts';
import { HardenedRuntimeBoundary } from '../hardening/index.ts';
import { DefaultProductionPageService } from './service.ts';
import { ProductionContextCompiler } from '../context/compiler.ts';

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
  readonly hardening: HardenedRuntimeBoundary;
}

export interface ProductionRuntimeOptions {
  readonly modelAdapters?: readonly ModelAdapter[];
  readonly concurrency?: number;
  readonly hardening?: ConstructorParameters<typeof HardenedRuntimeBoundary>[0];
  readonly loadEnvironmentProviders?: boolean;
}

export function createProductionRuntime(options?: ProductionRuntimeOptions): ProductionRuntime {
  const pageCatalog = new PageCatalog();
  const pageBatchExecutor = new BoundedPageBatchExecutor<any, any>(options?.concurrency ?? 4);
  const hardening = new HardenedRuntimeBoundary(options?.hardening);
  const checkpoints = new InMemoryCheckpointStore<any>();

  const explicitAdapters = options?.modelAdapters ?? [];
  const envAdapter = options?.loadEnvironmentProviders === false ? null : createGeminiAdapterFromEnv();
  const modelAdapters = envAdapter ? [...explicitAdapters, envAdapter] : [...explicitAdapters];
  const models = new ModelRouter(modelAdapters);

  return Object.freeze({
    pageCatalog,
    pageBatchExecutor,
    pageService: new DefaultProductionPageService(pageCatalog, hardening, pageBatchExecutor),
    tokenBudget: new TokenBudgetManager(),
    tokenPlanner: new TokenContextPlanner(),
    contextCompressor: new DeterministicContextCompressor(),
    semanticCache: new SemanticCache<any>(),
    continuity: new ContinuityLedger(),
    checkpoints,
    recovery: new RecoveryManager(checkpoints),
    versions: new VersionRegistry(),
    models,
    ai: new AIProductionService(models),
    contextCompiler: new ProductionContextCompiler(),
    hardening
  });
}
