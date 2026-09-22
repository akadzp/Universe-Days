/** Phase 34 — operational Control Center API. */
import { Router } from 'express';
import type { ProductionRuntime } from '../../../core/platform/final/runtime.ts';
import { getProductionRuntime } from '../runtime.ts';

export const controlRouter = Router();
function getRuntime(): ProductionRuntime { return getProductionRuntime(); }

function systemComponents(current: ProductionRuntime) {
  const providers = current.providerRegistry.list().length;
  const mounted = current.universeAuthority.get();
  return [
    { id: 'universe_authority', name: 'Universe Authority', status: mounted ? 'READY' : 'NO_UNIVERSE', detail: mounted ? `Mounted ${mounted.universe.universeId}` : 'No authoritative Universe mounted' },
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
  const mounted = current.universeAuthority.get();

  res.json({
    project: 'Pocer Universe Engine',
    uiPhase: 'Phase 34 — Production Control Center',
    runtime: { status: 'INITIALIZED', architecturePhase: 34, productionRoot: 'CONNECTED' },
    universe: {
      status: mounted ? 'READY' : 'NOT_INITIALIZED',
      universeId: mounted?.universe.universeId ?? null,
      universeDate: mounted?.universe.temporalContext.currentUniverseDate ?? null,
      periodId: mounted?.universe.temporalContext.currentPeriodRef ?? null,
      universeScope: mounted?.universeScope ?? null,
      message: mounted
        ? `Authoritative Universe '${mounted.universe.universeId}' is mounted at ${mounted.universe.temporalContext.currentUniverseTime}.`
        : 'No authoritative Universe instance is mounted.'
    },
    daily: {
      status: mounted ? 'WAITING_FOR_DAILY_CONTEXT' : 'WAITING_FOR_UNIVERSE',
      message: mounted
        ? 'Universe is mounted. Daily period context must come from the Daily Universe owner system.'
        : 'Daily Universe state will appear after an authoritative Universe instance is mounted.'
    },
    story: {
      status: 'WAITING_FOR_DAILY_CONTEXT',
      storyId: null,
      message: 'Daily Story requires a validated UniversePeriodContext or StoryProductionPackage.'
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

controlRouter.post('/universe/mount', async (req, res) => {
  try {
    const current = getRuntime();
    let universe = req.body?.universe;
    let scope = req.body?.universeScope;

    if (req.body?.mode === 'GENERIC_SEED') {
      const { createGenericSeedUniverse } = await import('../../../core/universe/model/seed.ts');
      universe = createGenericSeedUniverse();
      scope = 'SANDBOX';
    }

    if (!universe) {
      return res.status(400).json({
        error: 'UNIVERSE_CONTEXT_REQUIRED',
        message: 'Provide body.universe as a validated UniverseModel, or explicitly request mode=GENERIC_SEED for development.'
      });
    }

    const mounted = current.universeAuthority.mount(universe, scope || 'CANONICAL');
    return res.json({
      success: true,
      universe: {
        universeId: mounted.universe.universeId,
        universeDate: mounted.universe.temporalContext.currentUniverseDate,
        universeTime: mounted.universe.temporalContext.currentUniverseTime,
        periodId: mounted.universe.temporalContext.currentPeriodRef ?? null,
        universeScope: mounted.universeScope
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/unmount', (_req, res) => {
  getRuntime().universeAuthority.unmount();
  res.json({ success: true, message: 'Universe unmounted.' });
});

controlRouter.get('/pages', (_req, res) => {
  const current = getRuntime();
  res.json({ catalog: current.pageCatalog.snapshot(), definitions: current.pageCatalog.list() });
});

controlRouter.post('/pages/seed', (_req, res) => {
  const current = getRuntime();
  const mounted = current.universeAuthority.get();
  if (!mounted) {
    return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED', message: 'Mount an authoritative Universe before seeding page definitions.' });
  }
  const existing = current.pageCatalog.list();
  if (existing.length === 0) {
    const universeId = mounted.universe.universeId;
    const universeScope = mounted.universeScope;
    current.pageCatalog.register({ universeId, universeScope, pageKey: 'DAILY_CHRONICLE', pageScope: 'NARRATIVE', status: 'ENABLED', priority: 10, tags: ['story', 'daily', 'chronicle'] });
    current.pageCatalog.register({ universeId, universeScope, pageKey: 'FACTION_STATUS_DIGEST', pageScope: 'STATE', status: 'ENABLED', priority: 5, tags: ['factions', 'state', 'digest'] });
    current.pageCatalog.register({ universeId, universeScope, pageKey: 'CONTINUITY_LEDGER_REPORT', pageScope: 'CONTINUITY', status: 'ENABLED', priority: 3, tags: ['continuity', 'audit'] });
  }
  return res.json({ success: true, count: current.pageCatalog.list().length, definitions: current.pageCatalog.list() });
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
  res.json({ status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER', providers: current.providerRegistry.list().map(adapter => adapter.profile), health: current.providerRegistry.healthSnapshot() });
});

controlRouter.get('/production/usage', (_req, res) => {
  res.json(getRuntime().costController.totalCommitted());
});

controlRouter.post('/produce', async (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) {
      return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED', message: 'Mount an authoritative Universe before production execution.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const purpose = body.purpose || 'DAILY_STORY';
    const userInstruction = body.userInstruction || 'Generate today\'s production from the current authoritative Universe.';

    if (purpose === 'DAILY_STORY' || purpose === 'DAILY_PAGE') {
      const bridge = await current.dailyBridge.run({
        ...(body as Record<string, unknown>),
        universe: mounted.universe,
        universeScope: mounted.universeScope,
        userInstruction,
        mode: purpose === 'DAILY_PAGE' ? 'PAGE_ONLY' : 'FULL_DAILY'
      } as any);

      const statusCode = bridge.status === 'FAILED' ? 502 : bridge.status === 'BLOCKED' ? 409 : 200;
      return res.status(statusCode).json({
        status: bridge.status,
        runId: bridge.runId,
        universeId: bridge.universeId,
        universeScope: bridge.universeScope,
        universeDate: bridge.universeDate,
        periodId: bridge.periodId,
        initializationMode: bridge.initializationMode,
        storyId: bridge.storyPackage?.storyId ?? null,
        storyProduction: bridge.storyProduction ?? null,
        pages: bridge.pagePackages.map(page => ({
          pageId: page.pageId,
          pageKey: page.pageKey,
          pageScope: page.pageScope,
          validationStatus: page.validationStatus
        })),
        pageProduction: bridge.pageProduction ?? null,
        reason: bridge.reason ?? null
      });
    }

    const result = await current.productionRunner.run({
      ...(body as Record<string, unknown>),
      universe: mounted.universe,
      universeId: mounted.universe.universeId,
      universeScope: mounted.universeScope,
      purpose,
      userInstruction
    } as any);

    return res.status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
