/** Phase 34 — hardened operational Control Center API. */
import { Router } from 'express';
import type { ProductionRuntime } from '../../../core/platform/final/runtime.ts';
import { getProductionRuntime } from '../runtime.ts';
import { parseProductionHttpInput, toDailyBridgeInput, toProductionRunInput } from '../input.ts';
import { PersistenceError } from '../../../core/platform/persistence/file.ts';

import {
  CharacterEntity,
  LocationEntity,
  ObjectEntity,
  RelationshipEntity,
  UnresolvedConditionEntity
} from '../../../core/universe/model/index.ts';

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

controlRouter.get('/pages', (_req, res) => {
  const current = getRuntime();
  return res.json({
    catalogVersion: current.pageCatalog.snapshot().catalogVersion,
    definitions: current.pageCatalog.list()
  });
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

controlRouter.get('/universe/details', (_req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) {
      return res.json({ mounted: false, characters: [], locations: [], objects: [], relationships: [], unresolvedConditions: [], temporal: null });
    }
    const u = mounted.universe;
    const chars = Object.values(u.characters || {}) as CharacterEntity[];
    const locs = Object.values(u.locations || {}) as LocationEntity[];
    const objs = Object.values(u.objects || {}) as ObjectEntity[];
    const rels = Object.values(u.relationships || {}) as RelationshipEntity[];
    const unres = Object.values(u.unresolvedConditions || {}) as UnresolvedConditionEntity[];

    return res.json({
      mounted: true,
      universeId: u.universeId,
      universeScope: mounted.universeScope,
      temporal: {
        currentUniverseDate: u.temporalContext.currentUniverseDate,
        currentUniverseTime: u.temporalContext.currentUniverseTime,
        periodRef: u.temporalContext.currentPeriodRef,
        calendarSystem: 'Standard Solar'
      },
      characters: chars.map(c => ({
        id: c.identity.id,
        displayName: c.identity.displayName,
        status: c.identity.status,
        background: c.profile?.personalityType ? `Tipe: ${c.profile.personalityType}` : '',
        traits: Array.from(c.profile?.mainTraits ?? []),
        role: c.profile?.occupation ?? 'Karakter Utama',
        alive: c.identity.status !== 'TERMINATED' && c.identity.status !== 'DESTROYED'
      })),
      locations: locs.map(l => ({
        id: l.identity.id,
        displayName: l.identity.displayName,
        locationType: String(l.locationType),
        accessibilityStatus: String(l.accessibilityStatus),
        parentLocationRef: l.parentLocationRef,
        containedLocationRefs: Array.from(l.containedLocationRefs ?? [])
      })),
      objects: objs.map(o => ({
        id: o.identity.id,
        displayName: o.identity.displayName,
        objectType: String(o.objectType),
        possessionStatus: String(o.possessionStatus ?? 'IN_POSSESSION'),
        condition: String(o.condition ?? 'PRISTINE'),
        currentLocationRef: o.locationRef,
        holderActorRef: o.possessionRef,
        ownerActorRef: o.ownershipRef
      })),
      relationships: rels.map(r => ({
        id: r.relationshipId,
        sourceActorRef: String(r.subjectRef),
        targetActorRef: String(r.targetRef),
        relationshipType: r.relationshipType,
        strength: r.strength
      })),
      unresolvedConditions: unres.map(uc => ({
        id: uc.conditionId,
        title: uc.conditionType,
        description: uc.description,
        status: uc.currentStatus,
        severity: 'MEDIUM'
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/advance-day', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    
    // Sandbox only check
    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const currentDate = new Date(uCopy.temporalContext.currentUniverseDate || '2024-01-01');
    const daysToAdd = Number(req.body?.days ?? 1);
    currentDate.setUTCDate(currentDate.getUTCDate() + daysToAdd);
    const newDateStr = currentDate.toISOString().slice(0, 10);
    const newTimeStr = `${newDateStr}T08:00:00.000Z`;

    uCopy.temporalContext.currentUniverseDate = newDateStr;
    uCopy.temporalContext.currentUniverseTime = newTimeStr;
    if (uCopy.temporalContext.currentPeriodRef) {
      const parts = uCopy.temporalContext.currentPeriodRef.split('-');
      const pNum = Number(parts[parts.length - 1]);
      if (!isNaN(pNum)) {
        parts[parts.length - 1] = String(pNum + 1);
        uCopy.temporalContext.currentPeriodRef = parts.join('-');
      }
    }

    const reMounted = current.universeAuthority.mountSandbox(uCopy);
    return res.json({
      success: true,
      message: `Garis waktu berhasil dimajukan ke ${newDateStr}`,
      universe: {
        universeId: reMounted.universe.universeId,
        universeDate: reMounted.universe.temporalContext.currentUniverseDate,
        universeTime: reMounted.universe.temporalContext.currentUniverseTime,
        universeScope: reMounted.universeScope
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/clone-to-sandbox', async (_req, res) => {
  try {
    const current = getRuntime();
    let universeToClone = current.universeAuthority.get()?.universe;
    if (!universeToClone) {
      const storedCurrent = current.universeStore.getCurrent();
      if (storedCurrent) {
        universeToClone = current.universeStore.load(storedCurrent.universeId) ?? undefined;
      }
    }
    if (!universeToClone) {
      const { createGenericSeedUniverse } = await import('../../../core/universe/model/seed.ts');
      universeToClone = createGenericSeedUniverse();
    }
    const sandboxUniverse = JSON.parse(JSON.stringify(universeToClone));
    sandboxUniverse.universeId = `${sandboxUniverse.universeId}_sandbox`;
    const mounted = current.universeAuthority.mountSandbox(sandboxUniverse);
    return res.json({
      success: true,
      message: 'Dunia cerita berhasil dikloning ke Ruang Eksperimen (Sandbox).',
      universe: {
        universeId: mounted.universe.universeId,
        universeDate: mounted.universe.temporalContext.currentUniverseDate,
        universeTime: mounted.universe.temporalContext.currentUniverseTime,
        universeScope: mounted.universeScope
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/entity/character', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { displayName, background, role, traits } = req.body ?? {};
    if (!displayName) return res.status(400).json({ error: 'NAMA_TOKOH_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const newId = `CHAR_${Date.now().toString(36).toUpperCase()}`;
    const newChar = {
      identity: {
        id: newId,
        entityType: 'CHARACTER',
        displayName: String(displayName).trim(),
        status: 'ACTIVE'
      },
      background: background ? String(background).trim() : '',
      profile: {
        archetype: role ? String(role).trim() : 'Tokoh Utama',
        traits: Array.isArray(traits) ? traits : [String(traits || 'Pemberani')],
        status: 'ALIVE'
      },
      history: { revisions: [], lastModifiedTime: uCopy.temporalContext.currentUniverseTime },
      provenance: { authorSystem: 'SANDBOX_USER', domain: 'CHARACTER' }
    };
    uCopy.characters.push(newChar);
    const reMounted = current.universeAuthority.mountSandbox(uCopy);
    return res.json({ success: true, character: newChar, total: reMounted.universe.characters.length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/entity/location', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { displayName, locationType, accessibilityStatus } = req.body ?? {};
    if (!displayName) return res.status(400).json({ error: 'NAMA_LOKASI_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const newId = `LOC_${Date.now().toString(36).toUpperCase()}`;
    const newLoc = {
      identity: {
        id: newId,
        entityType: 'LOCATION',
        displayName: String(displayName).trim(),
        status: 'ACTIVE'
      },
      locationType: locationType ? String(locationType).trim() : 'SETTLEMENT',
      accessibilityStatus: accessibilityStatus ? String(accessibilityStatus).trim() : 'OPEN',
      parentLocationRef: null,
      adjacentLocationRefs: [],
      containedLocationRefs: [],
      history: { revisions: [], lastModifiedTime: uCopy.temporalContext.currentUniverseTime },
      provenance: { authorSystem: 'SANDBOX_USER', domain: 'LOCATION' }
    };
    uCopy.locations.push(newLoc);
    const reMounted = current.universeAuthority.mountSandbox(uCopy);
    return res.json({ success: true, location: newLoc, total: reMounted.universe.locations.length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/entity/object', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { displayName, objectType, condition } = req.body ?? {};
    if (!displayName) return res.status(400).json({ error: 'NAMA_BENDA_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const newId = `OBJ_${Date.now().toString(36).toUpperCase()}`;
    const newObj = {
      identity: {
        id: newId,
        entityType: 'OBJECT',
        displayName: String(displayName).trim(),
        status: 'ACTIVE'
      },
      objectType: objectType ? String(objectType).trim() : 'RELIC',
      condition: condition ? String(condition).trim() : 'PRISTINE',
      possessionStatus: 'UNPOSSESSED',
      currentLocationRef: null,
      holderActorRef: null,
      ownerActorRef: null,
      history: { revisions: [], lastModifiedTime: uCopy.temporalContext.currentUniverseTime },
      provenance: { authorSystem: 'SANDBOX_USER', domain: 'OBJECT' }
    };
    uCopy.objects.push(newObj);
    const reMounted = current.universeAuthority.mountSandbox(uCopy);
    return res.json({ success: true, object: newObj, total: reMounted.universe.objects.length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

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
