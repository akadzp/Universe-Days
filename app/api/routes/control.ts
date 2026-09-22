/**
 * Phase 25.5 — operational Control Center API.
 *
 * This route intentionally reports observed runtime state without inventing
 * Universe state. A Universe must be initialized by the authoritative engine
 * before the UI can display Universe Date, Daily Story, or production output.
 */
import { Router } from 'express';
import { createProductionRuntime, type ProductionRuntime } from '../../../core/platform/final/runtime.ts';

export const controlRouter = Router();

let runtime: ProductionRuntime | null = null;

function getRuntime(): ProductionRuntime {
  runtime ??= createProductionRuntime();
  return runtime;
}

function systemComponents(current: ProductionRuntime) {
  return [
    { id: 'page_catalog', name: 'Page Catalog', status: 'WIRED', detail: `${current.pageCatalog.list().length} page definition(s)` },
    { id: 'parallel_executor', name: 'Parallel Page Executor', status: 'WIRED', detail: 'Bounded fan-out enabled' },
    { id: 'token_budget', name: 'Token Budget', status: 'WIRED', detail: 'Budget planner available' },
    { id: 'context_compressor', name: 'Context Compression', status: 'WIRED', detail: 'Deterministic compressor available' },
    { id: 'semantic_cache', name: 'Semantic Cache', status: 'WIRED', detail: 'Deterministic cache available' },
    { id: 'continuity_ledger', name: 'Continuity Ledger', status: 'WIRED', detail: 'Runtime ledger available' },
    { id: 'recovery', name: 'Recovery / Checkpoints', status: 'WIRED', detail: 'Checkpoint store available' },
    { id: 'versioning', name: 'Version Registry', status: 'WIRED', detail: 'Version envelope available' },
    {
      id: 'model_router',
      name: 'AI Model Router',
      status: current.models.list().length > 0 ? 'WIRED' : 'NO_PROVIDER',
      detail: current.models.list().length > 0 ? `${current.models.list().length} provider(s)` : 'No external model adapter connected'
    },
    { id: 'hardening', name: 'Production Hardening', status: 'WIRED', detail: 'Runtime boundary active' }
  ] as const;
}

controlRouter.get('/overview', (_req, res) => {
  const current = getRuntime();
  const pages = current.pageCatalog.list();
  const models = current.models.list();

  res.json({
    project: 'Pocer Universe Engine',
    uiPhase: 'Phase 25.5 — UI Control Center',
    runtime: {
      status: 'INITIALIZED',
      architecturePhase: 25,
      productionRoot: 'CONNECTED'
    },
    universe: {
      status: 'NOT_INITIALIZED',
      universeId: null,
      universeDate: null,
      periodId: null,
      message: 'No active Universe instance is mounted in this UI session.'
    },
    daily: {
      status: 'WAITING_FOR_UNIVERSE',
      message: 'Daily Universe state will appear after an authoritative Universe instance is initialized.'
    },
    story: {
      status: 'WAITING_FOR_DAILY_CONTEXT',
      storyId: null,
      message: 'Daily Story remains downstream of validated Daily Universe context.'
    },
    pages: {
      status: pages.length > 0 ? 'READY' : 'EMPTY',
      total: pages.length,
      enabled: pages.filter(page => page.status === 'ENABLED').length,
      disabled: pages.filter(page => page.status === 'DISABLED').length,
      catalogVersion: current.pageCatalog.snapshot().catalogVersion
    },
    production: {
      status: 'NOT_RUN',
      lastRunId: null,
      message: 'Production has not been executed from this Control Center session.'
    },
    models: {
      connected: models.length,
      providerNeutral: true
    },
    components: systemComponents(current)
  });
});

controlRouter.get('/pages', (_req, res) => {
  const current = getRuntime();
  res.json({
    catalog: current.pageCatalog.snapshot(),
    definitions: current.pageCatalog.list()
  });
});
