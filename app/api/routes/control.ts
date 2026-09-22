/** Phase 34 — operational Control Center API. */
import { Router } from 'express';
import type { ProductionRuntime } from '../../../core/platform/final/runtime.ts';
import { getProductionRuntime } from '../runtime.ts';

export const controlRouter = Router();
function getRuntime(): ProductionRuntime { return getProductionRuntime(); }

interface MountedUniverseState {
  universeId: string;
  universeDate: string;
  periodId: string;
  universeScope: string;
  mountedAt: string;
}

let activeUniverse: MountedUniverseState | null = {
  universeId: 'UNIVERSE_PRIME',
  universeDate: '2026-03-22',
  periodId: 'PERIOD_CYCLE_01',
  universeScope: 'CANONICAL',
  mountedAt: new Date().toISOString()
};

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

  const isMounted = activeUniverse !== null;

  res.json({
    project: 'Pocer Universe Engine',
    uiPhase: 'Phase 34 — Production Control Center',
    runtime: { status: 'INITIALIZED', architecturePhase: 34, productionRoot: 'CONNECTED' },
    universe: {
      status: isMounted ? 'READY' : 'NOT_INITIALIZED',
      universeId: activeUniverse?.universeId ?? null,
      universeDate: activeUniverse?.universeDate ?? null,
      periodId: activeUniverse?.periodId ?? null,
      universeScope: activeUniverse?.universeScope ?? null,
      message: isMounted
        ? `Authoritative Universe '${activeUniverse.universeId}' is mounted for period '${activeUniverse.periodId}'.`
        : 'No active Universe instance is mounted in this UI session.'
    },
    daily: {
      status: isMounted ? 'READY' : 'WAITING_FOR_UNIVERSE',
      message: isMounted
        ? `Authoritative Daily Universe state is established for ${activeUniverse.universeDate}.`
        : 'Daily Universe state will appear after an authoritative Universe instance is initialized.'
    },
    story: {
      status: isMounted ? 'READY' : 'WAITING_FOR_DAILY_CONTEXT',
      storyId: isMounted ? `STORY_${activeUniverse.universeDate.replace(/-/g, '')}` : null,
      message: isMounted
        ? `Daily Story pipeline is downstream of valid ${activeUniverse.universeDate} context.`
        : 'Daily Story remains downstream of validated Daily Universe context.'
    },
    pages: {
      status: pages.length > 0 ? 'READY' : 'EMPTY',
      total: pages.length,
      enabled: pages.filter(page => page.status === 'ENABLED').length,
      disabled: pages.filter(page => page.status === 'DISABLED').length,
      catalogVersion: current.pageCatalog.snapshot().catalogVersion
    },
    production: {
      status: lastRun?.status ?? 'NOT_RUN',
      lastRunId: lastRun?.runId ?? null,
      message: lastRun ? `Latest persisted run is ${lastRun.status}.` : 'No persisted production run exists yet.'
    },
    models: { connected: models.length, providerNeutral: true },
    ai: {
      status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER',
      providers: models.map(adapter => ({
        providerId: adapter.profile.providerId,
        modelId: adapter.profile.modelId,
        tier: adapter.profile.tier,
        structuredOutput: adapter.profile.capabilities.structuredOutput
      }))
    },
    components: systemComponents(current)
  });
});

controlRouter.post('/universe/mount', (req, res) => {
  activeUniverse = {
    universeId: req.body?.universeId || 'UNIVERSE_PRIME',
    universeDate: req.body?.universeDate || '2026-03-22',
    periodId: req.body?.periodId || 'PERIOD_CYCLE_01',
    universeScope: req.body?.universeScope || 'CANONICAL',
    mountedAt: new Date().toISOString()
  };
  res.json({ success: true, universe: activeUniverse });
});

controlRouter.post('/universe/unmount', (_req, res) => {
  activeUniverse = null;
  res.json({ success: true, message: 'Universe unmounted.' });
});

controlRouter.get('/pages', (_req, res) => {
  const current = getRuntime();
  res.json({ catalog: current.pageCatalog.snapshot(), definitions: current.pageCatalog.list() });
});

controlRouter.post('/pages/seed', (_req, res) => {
  const current = getRuntime();
  const existing = current.pageCatalog.list();
  if (existing.length === 0) {
    current.pageCatalog.register({
      universeId: activeUniverse?.universeId || 'UNIVERSE_PRIME',
      universeScope: activeUniverse?.universeScope || 'CANONICAL',
      pageKey: 'DAILY_CHRONICLE',
      pageScope: 'NARRATIVE',
      status: 'ENABLED',
      priority: 10,
      tags: ['story', 'daily', 'chronicle']
    });
    current.pageCatalog.register({
      universeId: activeUniverse?.universeId || 'UNIVERSE_PRIME',
      universeScope: activeUniverse?.universeScope || 'CANONICAL',
      pageKey: 'FACTION_STATUS_DIGEST',
      pageScope: 'STATE',
      status: 'ENABLED',
      priority: 5,
      tags: ['factions', 'state', 'digest']
    });
    current.pageCatalog.register({
      universeId: activeUniverse?.universeId || 'UNIVERSE_PRIME',
      universeScope: activeUniverse?.universeScope || 'CANONICAL',
      pageKey: 'CONTINUITY_LEDGER_REPORT',
      pageScope: 'CONTINUITY',
      status: 'ENABLED',
      priority: 3,
      tags: ['continuity', 'audit']
    });
  }
  res.json({ success: true, count: current.pageCatalog.list().length, definitions: current.pageCatalog.list() });
});

controlRouter.post('/pages/:pageDefinitionId/toggle', (req, res) => {
  const current = getRuntime();
  const page = current.pageCatalog.get(req.params.pageDefinitionId);
  if (!page) return res.status(404).json({ error: 'PAGE_NOT_FOUND' });
  const updated = page.status === 'ENABLED'
    ? current.pageCatalog.disable(req.params.pageDefinitionId)
    : current.pageCatalog.enable(req.params.pageDefinitionId);
  return res.json(updated);
});

controlRouter.get('/ai/status', (_req, res) => {
  const current = getRuntime();
  res.json({
    status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER',
    providers: current.providerRegistry.list().map(adapter => adapter.profile),
    health: current.providerRegistry.healthSnapshot()
  });
});

controlRouter.get('/production/usage', (_req, res) => {
  res.json(getRuntime().costController.totalCommitted());
});

controlRouter.post('/produce', async (req, res) => {
  try {
    const current = getRuntime();
    const universeId = activeUniverse?.universeId || req.body?.universeId || 'UNIVERSE_PRIME';
    const universeScope = activeUniverse?.universeScope || req.body?.universeScope || 'CANONICAL';
    const purpose = req.body?.purpose || 'DAILY_STORY';
    const userInstruction = req.body?.userInstruction || 'Synthesize canonical daily log and world status.';

    const result = await current.productionRunner.run({
      universeId,
      universeScope,
      purpose,
      userInstruction
    });

    return res.status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
