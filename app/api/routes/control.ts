/** Phase 34 — hardened operational Control Center API. */
import { Router } from 'express';
import type { ProductionRuntime } from '../../../core/platform/final/runtime.ts';
import { getProductionRuntime } from '../runtime.ts';
import { parseProductionHttpInput, toDailyBridgeInput, toProductionRunInput } from '../input.ts';
import { PersistenceError } from '../../../core/platform/persistence/file.ts';

export const controlRouter = Router();
function getRuntime(): ProductionRuntime { return getProductionRuntime(); }

function systemComponents(current: ProductionRuntime) {
  const providers = current.providerRegistry.list().length;
  const mounted = current.universeAuthority.get();
  return [
    { id: 'universe_authority', name: 'Universe Authority', status: mounted ? 'READY' : 'NO_UNIVERSE', detail: mounted ? `Mounted ${mounted.universe.universeId}` : 'No authoritative Universe mounted' },
    { id: 'universe_persistence', name: 'Universe Persistence', status: current.universeStartupLoadError ? 'BLOCKED' : 'WIRED', detail: current.universeStartupLoadError ?? `${current.universeStore.listUniverseIds().length} stored Universe snapshot(s)` },
    { id: 'page_catalog', name: 'Page Catalog', status: 'WIRED', detail: `${current.pageCatalog.list().length} page definition(s)` },
    { id: 'parallel_executor', name: 'Parallel Page Executor', status: 'WIRED', detail: 'Bounded fan-out enabled' },
    { id: 'context_compiler', name: 'Production Context Compiler', status: 'WIRED', detail: 'Universe-aware context assembly active' },
    { id: 'token_budget', name: 'Token Budget', status: 'WIRED', detail: 'Budget planner available' },
    { id: 'context_compressor', name: 'Context Compression', status: 'WIRED', detail: 'Deterministic compressor available' },
    { id: 'semantic_cache', name: 'Semantic Cache', status: 'WIRED', detail: 'Deterministic cache available' },
    { id: 'output_validator', name: 'AI Output Validator', status: 'WIRED', detail: 'Structured contract + authority checks active' },
    { id: 'production_runner', name: 'Real Production Runner', status: 'WIRED', detail: 'Compiler → AI → validation → persistence' },
    { id: 'persistence', name: 'Production Persistence', status: 'WIRED', detail: 'Fail-fast atomic JSON run repository' },
    { id: 'scheduler', name: 'Page Production Scheduler', status: 'WIRED', detail: `${current.scheduler.list().length} schedule definition(s)` },
    { id: 'cost_controller', name: 'Token / Cost Controller', status: 'WIRED', detail: 'Budget reservation and usage accounting' },
    { id: 'provider_registry', name: 'Provider Registry', status: providers > 0 ? 'READY' : 'NO_PROVIDER', detail: providers > 0 ? `${providers} provider adapter(s)` : 'No external model adapter connected' },
    { id: 'hardening', name: 'Production Hardening', status: 'WIRED', detail: 'Runtime input boundaries and persistence failure handling active' }
  ] as const;
}

controlRouter.get('/overview', async (_req, res) => {
  try {
    const current = getRuntime();
    const pages = current.pageCatalog.list();
    const models = current.providerRegistry.list();
    const runs = await current.productionStore.list({ limit: 1 });
    const lastRun = runs[0] ?? null;
    const mounted = current.universeAuthority.get();
    const storedCurrent = current.universeStore.getCurrent();
    return res.json({
      project: 'Pocer Universe Engine',
      uiPhase: 'Phase 34 — Production Control Center',
      runtime: { status: current.universeStartupLoadError ? 'BLOCKED' : 'INITIALIZED', architecturePhase: 34, productionRoot: 'CONNECTED' },
      universe: {
        status: mounted ? 'READY' : current.universeStartupLoadError ? 'BLOCKED' : 'NOT_INITIALIZED',
        universeId: mounted?.universe.universeId ?? null,
        universeDate: mounted?.universe.temporalContext.currentUniverseDate ?? null,
        periodId: mounted?.universe.temporalContext.currentPeriodRef ?? null,
        universeScope: mounted?.universeScope ?? null,
        storedCurrent,
        storedCount: current.universeStore.listUniverseIds().length,
        storageRoot: current.universeStore.getRootDir(),
        startupLoadError: current.universeStartupLoadError,
        message: mounted
          ? `Authoritative Universe '${mounted.universe.universeId}' is mounted at ${mounted.universe.temporalContext.currentUniverseTime}.`
          : current.universeStartupLoadError
            ? `Persistent Universe auto-load was blocked: ${current.universeStartupLoadError}`
            : storedCurrent
              ? `No Universe is mounted. Persisted current Universe '${storedCurrent.universeId}' is available for explicit load.`
              : 'No authoritative Universe instance is mounted and no persisted current Universe is configured.'
      },
      daily: { status: mounted ? 'WAITING_FOR_DAILY_CONTEXT' : 'WAITING_FOR_UNIVERSE', message: mounted ? 'Universe is mounted. Daily period context must come from the Daily Universe owner system.' : 'Daily Universe state will appear after an authoritative Universe instance is mounted.' },
      story: { status: 'WAITING_FOR_DAILY_CONTEXT', storyId: null, message: 'Daily Story requires a validated UniversePeriodContext or StoryProductionPackage.' },
      pages: { status: pages.length > 0 ? 'READY' : 'EMPTY', total: pages.length, enabled: pages.filter(page => page.status === 'ENABLED').length, disabled: pages.filter(page => page.status === 'DISABLED').length, catalogVersion: current.pageCatalog.snapshot().catalogVersion },
      production: { status: lastRun?.status ?? 'NOT_RUN', lastRunId: lastRun?.runId ?? null, message: lastRun ? `Latest persisted run is ${lastRun.status}.` : 'No persisted production run exists yet.' },
      models: { connected: models.length, providerNeutral: true },
      ai: { status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER', providers: models.map(adapter => ({ providerId: adapter.profile.providerId, modelId: adapter.profile.modelId, tier: adapter.profile.tier, structuredOutput: adapter.profile.capabilities.structuredOutput })) },
      components: systemComponents(current)
    });
  } catch (error) {
    const status = error instanceof PersistenceError ? 503 : 500;
    return res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.get('/universe/storage', (_req, res) => {
  try { return res.json(getRuntime().universeInstances.status()); }
  catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : String(error) }); }
});

controlRouter.post('/universe/load', (req, res) => {
  try {
    const universeId = typeof req.body?.universeId === 'string' ? req.body.universeId.trim() : '';
    const universeScope = typeof req.body?.universeScope === 'string' ? req.body.universeScope.trim() : 'CANONICAL';
    if (!universeId) return res.status(400).json({ error: 'UNIVERSE_ID_REQUIRED' });
    const mounted = getRuntime().universeInstances.load(universeId, universeScope);
    return res.json({ success: true, source: 'PERSISTED_SNAPSHOT', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope } });
  } catch (error) {
    return res.status(error instanceof PersistenceError ? 503 : 404).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/load-current', (_req, res) => {
  try {
    const mounted = getRuntime().universeInstances.loadCurrent();
    if (!mounted) return res.status(404).json({ error: 'PERSISTED_CURRENT_UNIVERSE_NOT_FOUND' });
    return res.json({ success: true, source: 'PERSISTED_CURRENT', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope } });
  } catch (error) {
    return res.status(error instanceof PersistenceError ? 503 : 409).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/mount', async (req, res) => {
  try {
    const current = getRuntime();
    if (req.body?.mode === 'PERSISTED_CURRENT') {
      const mounted = current.universeInstances.loadCurrent();
      if (!mounted) return res.status(404).json({ error: 'PERSISTED_CURRENT_UNIVERSE_NOT_FOUND' });
      return res.json({ success: true, source: 'PERSISTED_CURRENT', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope } });
    }
    if (req.body?.mode === 'GENERIC_SEED') {
      const { createGenericSeedUniverse } = await import('../../../core/universe/model/seed.ts');
      const mounted = current.universeAuthority.mountSandbox(createGenericSeedUniverse());
      return res.json({ success: true, source: 'GENERIC_SEED', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope } });
    }
    const universe = req.body?.universe;
    const scope = typeof req.body?.universeScope === 'string' ? req.body.universeScope.trim() : 'SANDBOX';
    if (!universe) return res.status(400).json({ error: 'UNIVERSE_CONTEXT_REQUIRED', message: 'Use mode=PERSISTED_CURRENT or mode=GENERIC_SEED. Direct model mounting is permitted only for SANDBOX scope.' });
    if (scope !== 'SANDBOX') return res.status(403).json({ error: 'DIRECT_CANONICAL_MOUNT_PROHIBITED', message: 'Canonical Universe instances must be loaded from persistent instance storage or mounted by an owner subsystem.' });
    const mounted = current.universeAuthority.mountSandbox(universe);
    return res.json({ success: true, source: 'SANDBOX_INPUT', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope } });
  } catch (error) {
    return res.status(error instanceof PersistenceError ? 503 : 400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/unmount', (_req, res) => {
  getRuntime().universeAuthority.unmount();
  return res.json({ success: true, message: 'Universe unmounted. Persistent snapshots are unchanged.' });
});

controlRouter.post('/pages/seed', (_req, res) => {
  const current = getRuntime();
  const mounted = current.universeAuthority.get();
  if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED', message: 'Mount an authoritative Universe before seeding page definitions.' });
  if (current.pageCatalog.list().length === 0) {
    current.pageCatalog.register({ universeId: mounted.universe.universeId, universeScope: mounted.universeScope, pageKey: 'DAILY_CHRONICLE', pageScope: 'NARRATIVE', status: 'ENABLED', priority: 10, tags: ['story', 'daily', 'chronicle'] });
    current.pageCatalog.register({ universeId: mounted.universe.universeId, universeScope: mounted.universeScope, pageKey: 'FACTION_STATUS_DIGEST', pageScope: 'STATE', status: 'ENABLED', priority: 5, tags: ['factions', 'state', 'digest'] });
    current.pageCatalog.register({ universeId: mounted.universe.universeId, universeScope: mounted.universeScope, pageKey: 'CONTINUITY_LEDGER_REPORT', pageScope: 'CONTINUITY', status: 'ENABLED', priority: 3, tags: ['continuity', 'audit'] });
  }
  return res.json({ success: true, count: current.pageCatalog.list().length, definitions: current.pageCatalog.list() });
});

controlRouter.get('/pages', (_req, res) => { const current = getRuntime(); return res.json({ catalog: current.pageCatalog.snapshot(), definitions: current.pageCatalog.list() }); });
controlRouter.post('/pages/:pageDefinitionId/toggle', (req, res) => { const current = getRuntime(); const page = current.pageCatalog.get(req.params.pageDefinitionId); if (!page) return res.status(404).json({ error: 'PAGE_NOT_FOUND' }); return res.json(page.status === 'ENABLED' ? current.pageCatalog.disable(req.params.pageDefinitionId) : current.pageCatalog.enable(req.params.pageDefinitionId)); });
controlRouter.get('/ai/status', (_req, res) => { const current = getRuntime(); return res.json({ status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER', providers: current.providerRegistry.list().map(adapter => adapter.profile), health: current.providerRegistry.healthSnapshot() }); });
controlRouter.get('/production/usage', (_req, res) => res.json(getRuntime().costController.totalCommitted()));

controlRouter.post('/produce', async (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED', message: 'Mount an authoritative Universe before production execution.' });
    const parsed = parseProductionHttpInput(req.body, 'DAILY_STORY');
    if (parsed.purpose === 'DAILY_STORY' || parsed.purpose === 'DAILY_PAGE') {
      const bridge = await current.dailyBridge.run(toDailyBridgeInput(parsed, mounted.universe, mounted.universeScope));
      const statusCode = bridge.status === 'FAILED' ? 502 : bridge.status === 'BLOCKED' ? 409 : 200;
      return res.status(statusCode).json({ status: bridge.status, runId: bridge.runId, universeId: bridge.universeId, universeScope: bridge.universeScope, universeDate: bridge.universeDate, periodId: bridge.periodId, initializationMode: bridge.initializationMode, storyId: bridge.storyPackage?.storyId ?? null, storyProduction: bridge.storyProduction ?? null, pages: bridge.pagePackages.map(page => ({ pageId: page.pageId, pageKey: page.pageKey, pageScope: page.pageScope, validationStatus: page.validationStatus })), pageProduction: bridge.pageProduction ?? null, reason: bridge.reason ?? null });
    }
    const result = await current.productionRunner.run(toProductionRunInput(parsed, mounted.universe, mounted.universeScope));
    return res.status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200).json(result);
  } catch (error) {
    const status = error instanceof PersistenceError ? 503 : 400;
    return res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
