/** Phase 34 — operational Control Center API. */
import { Router } from 'express';
import type { ProductionRuntime } from '../../../core/platform/final/runtime.ts';
import { getProductionRuntime } from '../runtime.ts';

export const controlRouter = Router();
function getRuntime(): ProductionRuntime { return getProductionRuntime(); }

function systemComponents(current: ProductionRuntime) {
  const providers = current.providerRegistry.list().length;
  return [
    { id: 'page_catalog', name: 'Page Catalog', status: 'WIRED', detail: `${current.pageCatalog.list().length} page definition(s)` },
    { id: 'parallel_executor', name: 'Parallel Page Executor', status: 'WIRED', detail: 'Bounded fan-out enabled' },
    { id: 'context_compiler', name: 'Production Context Compiler', status: 'WIRED', detail: 'Universe-aware context assembly active' },
    { id: 'token_budget', name: 'Token Budget', status: 'WIRED', detail: 'Budget planner available' },
    { id: 'context_compressor', name: 'Context Compression', status: 'WIRED', detail: 'Deterministic compressor available' },
    { id: 'semantic_cache', name: 'Semantic Cache', status: 'WIRED', detail: 'Deterministic cache available' },
    { id: 'output_validator', name: 'AI Output Validator', status: 'WIRED', detail: 'Structured contract + authority checks active' },
    { id: 'production_runner', name: 'Real Production Runner', status: 'WIRED', detail: 'Compiler → AI → validation → persistence' },
    { id: 'persistence', name: 'Production Persistence', status: 'WIRED', detail: 'Atomic JSON run repository' },
    { id: 'scheduler', name: 'Page Production Scheduler', status: 'WIRED', detail: `${current.scheduler.list().length} schedule definition(s)` },
    { id: 'cost_controller', name: 'Token / Cost Controller', status: 'WIRED', detail: 'Budget reservation and usage accounting' },
    { id: 'provider_registry', name: 'Provider Registry', status: providers > 0 ? 'READY' : 'NO_PROVIDER', detail: providers > 0 ? `${providers} provider adapter(s)` : 'No external model adapter connected' },
    { id: 'hardening', name: 'Production Hardening', status: 'WIRED', detail: 'Runtime boundary active' }
  ] as const;
}

controlRouter.get('/overview', async (_req, res) => {
  const current = getRuntime();
  const pages = current.pageCatalog.list();
  const models = current.providerRegistry.list();
  const runs = await current.productionStore.list({ limit: 1 });
  const lastRun = runs[0] ?? null;

  res.json({
    project: 'Pocer Universe Engine',
    uiPhase: 'Phase 25.5+ — Production Control Center',
    runtime: { status: 'INITIALIZED', architecturePhase: 34, productionRoot: 'CONNECTED' },
    universe: { status: 'NOT_INITIALIZED', universeId: null, universeDate: null, periodId: null, message: 'No active Universe instance is mounted in this UI session.' },
    daily: { status: 'WAITING_FOR_UNIVERSE', message: 'Daily Universe state will appear after an authoritative Universe instance is initialized.' },
    story: { status: 'WAITING_FOR_DAILY_CONTEXT', storyId: null, message: 'Daily Story remains downstream of validated Daily Universe context.' },
    pages: { status: pages.length > 0 ? 'READY' : 'EMPTY', total: pages.length, enabled: pages.filter(page => page.status === 'ENABLED').length, disabled: pages.filter(page => page.status === 'DISABLED').length, catalogVersion: current.pageCatalog.snapshot().catalogVersion },
    production: { status: lastRun?.status ?? 'NOT_RUN', lastRunId: lastRun?.runId ?? null, message: lastRun ? `Latest persisted run is ${lastRun.status}.` : 'No persisted production run exists yet.' },
    models: { connected: models.length, providerNeutral: true },
    ai: { status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER', providers: models.map(adapter => ({ providerId: adapter.profile.providerId, modelId: adapter.profile.modelId, tier: adapter.profile.tier, structuredOutput: adapter.profile.capabilities.structuredOutput })) },
    components: systemComponents(current)
  });
});

controlRouter.get('/pages', (_req, res) => {
  const current = getRuntime();
  res.json({ catalog: current.pageCatalog.snapshot(), definitions: current.pageCatalog.list() });
});

controlRouter.get('/ai/status', (_req, res) => {
  const current = getRuntime();
  res.json({ status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER', providers: current.providerRegistry.list().map(adapter => adapter.profile), health: current.providerRegistry.healthSnapshot() });
});

controlRouter.get('/production/usage', (_req, res) => {
  res.json(getRuntime().costController.totalCommitted());
});
