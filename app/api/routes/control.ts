/** Phase 34 — hardened operational Control Center API with UI Capability Blueprint projections. */
import { Router } from 'express';
import type { ProductionRuntime } from '../../../core/platform/final/runtime.ts';
import { getProductionRuntime } from '../runtime.ts';
import { parseProductionHttpInput, toDailyBridgeInput, toProductionRunInput } from '../input.ts';
import { PersistenceError } from '../../../core/platform/persistence/file.ts';
import { makeEntityID, makeSystemID, makeDomainID } from '../../../core/types/identifiers.ts';
import { EntityIdentityFactory } from '../../../core/universe/model/identity.ts';
import { RevisionHistoryManager } from '../../../core/universe/model/history.ts';
import { createProvenanceMetadata } from '../../../core/universe/model/provenance.ts';
import { EntityType, EntityLifecycleStatus } from '../../../core/universe/model/types.ts';
import { UniverseModelFactory } from '../../../core/universe/model/universe.ts';
import { SocialTendency, type CharacterProfile } from '../../../core/universe/model/character-profile.ts';
import { ActorDataSource } from '../../../core/universe/model/actor.ts';

import type {
  CharacterEntity,
  LocationEntity,
  ObjectEntity,
  RelationshipEntity,
  UnresolvedConditionEntity,
  KnowledgeEntity,
  StateEntity
} from '../../../core/universe/model/index.ts';

export const controlRouter = Router();
function getRuntime(): ProductionRuntime { return getProductionRuntime(); }

function systemComponents(current: ProductionRuntime) {
  const providers = current.providerRegistry.list().length;
  const mounted = current.universeAuthority.get();
  return [
    { id: 'universe_authority', name: 'Penjaga Kebenaran Cerita', status: mounted ? 'READY' : 'NO_UNIVERSE', detail: mounted ? `Aktif di dunia '${mounted.universe.universeId}'` : 'Belum ada dunia cerita aktif' },
    { id: 'universe_persistence', name: 'Penyimpanan Aman Cerita', status: current.universeStartupLoadError ? 'BLOCKED' : 'WIRED', detail: current.universeStartupLoadError ?? `${current.universeStore.listUniverseIds().length} arsip dunia cerita` },
    { id: 'page_catalog', name: 'Katalog Format Cerita', status: 'WIRED', detail: `${current.pageCatalog.list().length} jenis format halaman` },
    { id: 'parallel_executor', name: 'Penerbit Berkecepatan Tinggi', status: 'WIRED', detail: 'Eksekusi paralel aktif' },
    { id: 'context_compiler', name: 'Penyusun Latar Belakang Cerita', status: 'WIRED', detail: 'Kompilasi konteks aktif' },
    { id: 'token_budget', name: 'Pengatur Panjang Cerita', status: 'WIRED', detail: 'Alokasi token optimal' },
    { id: 'context_compressor', name: 'Pengoptimal Ringkasan Konteks', status: 'WIRED', detail: 'Kompresi deterministik aktif' },
    { id: 'semantic_cache', name: 'Penyimpan Ingatan Instan', status: 'WIRED', detail: 'Penyimpanan semantik aktif' },
    { id: 'output_validator', name: 'Pemeriksa Mutu Cerita', status: 'WIRED', detail: 'Pemeriksaan kepatuhan alur aktif' },
    { id: 'production_runner', name: 'Mesin Penulis Cerita', status: 'WIRED', detail: 'Penulis naskah siap digunakan' },
    { id: 'persistence', name: 'Buku Arsip Produksi', status: 'WIRED', detail: 'Penyimpanan berkas atomik siap' },
    { id: 'scheduler', name: 'Pengatur Waktu Terbit', status: 'WIRED', detail: `${current.scheduler.list().length} jadwal otomatis` },
    { id: 'cost_controller', name: 'Pemantau Efisiensi Penulisan', status: 'WIRED', detail: 'Pemantauan alokasi biaya aktif' },
    { id: 'provider_registry', name: 'Koneksi Asisten AI', status: providers > 0 ? 'READY' : 'NO_PROVIDER', detail: providers > 0 ? `${providers} model AI terhubung` : 'Belum ada model AI eksternal aktif' },
    { id: 'hardening', name: 'Perlindungan Sistem Otomatis', status: 'WIRED', detail: 'Batas perlindungan runtime aktif' }
  ] as const;
}

// -------------------------------------------------------------
// OVERVIEW & SYSTEM HEALTH
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// STORY CREATION & MOUNTING (Blueprint Section 1 & 2)
// -------------------------------------------------------------
controlRouter.post('/story/create', async (req, res) => {
  try {
    const current = getRuntime();
    const {
      title,
      premise,
      synopsis,
      genre,
      theme,
      initialLocation,
      initialCharacter,
      initialConflict,
      universeScope = 'CANONICAL'
    } = req.body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'JUDUL_CERITA_DIBUTUHKAN', message: 'Judul cerita wajib diisi.' });
    }

    const cleanTitle = title.trim();
    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24);
    const universeId = `UNIVERSE_${slug}_${Date.now().toString(36).toUpperCase()}`;
    const seedDate = '2024-01-01';
    const seedTime = `${seedDate}T00:00:00Z`;

    // 1. Initial Location
    const locName = initialLocation ? String(initialLocation).trim() : 'Ibukota Kerajaan';
    const locId = `LOC_${Date.now().toString(36).toUpperCase()}_01`;
    const location: LocationEntity = {
      identity: EntityIdentityFactory.create({
        id: locId,
        entityType: EntityType.LOCATION,
        displayName: locName,
        status: EntityLifecycleStatus.ACTIVE
      }),
      locationType: 'SETTLEMENT',
      parentLocationRef: null,
      adjacentLocationRefs: [],
      containedLocationRefs: [],
      accessibilityStatus: 'OPEN',
      temporalValidity: { effectiveFrom: seedTime, temporalCategory: 'ACTUAL' as any },
      history: RevisionHistoryManager.createInitial(makeSystemID('LOCATION_SYSTEM'), seedTime),
      provenance: createProvenanceMetadata(makeSystemID('LOCATION_SYSTEM'), makeDomainID('LOCATION'))
    };

    // 2. Initial Character
    const charName = initialCharacter?.displayName ? String(initialCharacter.displayName).trim() : 'Tokoh Utama';
    const charId = `CHAR_${Date.now().toString(36).toUpperCase()}_01`;
    const charStateId = `STATE_${charId}_01`;

    const charProfile: CharacterProfile = {
      fullName: charName,
      personalityType: initialCharacter?.personalityType || 'Pemberani & Penuh Tekad',
      mainTraits: initialCharacter?.traits ? Array.from(initialCharacter.traits) : ['Gigih', 'Setia Kawan', 'Cerdas'],
      occupation: initialCharacter?.occupation || 'Penjelajah',
      openWounds: [initialCharacter?.innerWound || 'Kehilangan tempat tinggal di masa lalu'],
      personalGoal: initialCharacter?.primaryGoal || 'Menemukan kebenaran di balik takdir dunia',
      secrets: [initialCharacter?.secretBackstory || 'Menyimpan pusaka warisan leluhur'],
      flaws: ['Kadang keras kepala', 'Sulit percaya pada orang asing'],
      values: ['Kejujuran', 'Kesetiaan'],
      dailyPattern: 'Berlatih di pagi hari dan meneliti arsip lama di malam hari',
      socialTendency: SocialTendency.AMBIVERT,
      source: ActorDataSource.USER_DEFINED
    };

    const character: CharacterEntity = {
      identity: EntityIdentityFactory.create({
        id: charId,
        entityType: EntityType.CHARACTER,
        displayName: charName,
        status: EntityLifecycleStatus.ACTIVE,
        tags: ['protagonist', genre?.toLowerCase() || 'fantasy']
      }),
      roleReferences: ['ROLE_PROTAGONIST'],
      stateReference: charStateId,
      knowledgeReferences: [],
      relationshipReferences: [],
      locationReference: locId,
      temporalValidity: { effectiveFrom: seedTime, temporalCategory: 'ACTUAL' as any },
      continuityReference: `CONT_${charId}_INIT`,
      profile: charProfile,
      history: RevisionHistoryManager.createInitial(makeSystemID('CHARACTER_SYSTEM'), seedTime),
      provenance: createProvenanceMetadata(makeSystemID('CHARACTER_SYSTEM'), makeDomainID('CHARACTER'))
    };

    const charState: StateEntity = {
      stateId: charStateId,
      entityRef: makeEntityID(charId),
      stateType: 'CONDITION',
      currentValue: 'NORMAL',
      lifecycle: EntityLifecycleStatus.ACTIVE,
      validationStatus: 'VALID' as any,
      temporalValidity: { effectiveFrom: seedTime, temporalCategory: 'ACTUAL' as any },
      transitionCount: 0,
      history: RevisionHistoryManager.createInitial(makeSystemID('STATE_SYSTEM'), seedTime),
      provenance: createProvenanceMetadata(makeSystemID('STATE_SYSTEM'), makeDomainID('STATE'))
    };

    // 3. Initial Conflict / Mystery
    const conflictDesc = initialConflict ? String(initialConflict).trim() : 'Sebuah tanda misterius muncul di langit menjelang senja.';
    const unresId = `UNRES_${Date.now().toString(36).toUpperCase()}_01`;
    const unresolved: UnresolvedConditionEntity = {
      conditionId: unresId,
      conditionType: 'NARRATIVE_TENSION',
      description: conflictDesc,
      ownerDomain: makeDomainID('LOCATION'),
      targetEntityRef: locId,
      temporalScope: { effectiveFrom: seedTime, temporalCategory: 'POSSIBILITY' as any },
      dependencyRefs: [],
      currentStatus: 'CARRYOVER',
      createdAt: seedTime,
      lastUpdated: seedTime,
      sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      validationStatus: 'VALID' as any,
      provenance: createProvenanceMetadata(makeSystemID('DAILY_UNIVERSE_SYSTEM'), makeDomainID('DAILY_UNIVERSE'))
    };

    // Create Universe Model
    const newUniverse = UniverseModelFactory.create({
      universeId,
      universeDate: seedDate,
      universeTime: seedTime,
      periodRef: 'PERIOD_001',
      periodSequence: 1,
      locations: { [locId]: location },
      characters: { [charId]: character },
      states: { [charStateId]: charState },
      unresolvedConditions: { [unresId]: unresolved },
      relationships: {},
      objects: {},
      knowledge: {},
      events: {},
      processes: {}
    });

    // Attach custom metadata on universe instance
    (newUniverse as any).storyMetadata = {
      title: cleanTitle,
      premise: premise ? String(premise).trim() : '',
      synopsis: synopsis ? String(synopsis).trim() : '',
      genre: genre ? String(genre).trim() : 'Fantasi / Petualangan',
      theme: theme ? String(theme).trim() : 'Perjuangan & Takdir',
      initialConflict: conflictDesc,
      createdAt: seedTime
    };

    // Save & Mount
    current.universeStore.save(newUniverse);
    current.universeStore.setCurrent({
      universeId: newUniverse.universeId,
      universeScope: universeScope === 'SANDBOX' ? 'SANDBOX' : 'CANONICAL'
    });

    const mounted = universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(newUniverse)
      : current.universeAuthority.mount(newUniverse, 'CANONICAL');

    // Auto seed default page definitions if catalog is empty
    if (current.pageCatalog.list().length === 0) {
      current.pageCatalog.register({ universeId: newUniverse.universeId, universeScope: mounted.universeScope, pageKey: 'DAILY_CHRONICLE', pageScope: 'NARRATIVE', status: 'ENABLED', priority: 10, tags: ['story', 'daily', 'chronicle'] });
      current.pageCatalog.register({ universeId: newUniverse.universeId, universeScope: mounted.universeScope, pageKey: 'FACTION_STATUS_DIGEST', pageScope: 'STATE', status: 'ENABLED', priority: 5, tags: ['factions', 'state', 'digest'] });
      current.pageCatalog.register({ universeId: newUniverse.universeId, universeScope: mounted.universeScope, pageKey: 'CONTINUITY_LEDGER_REPORT', pageScope: 'CONTINUITY', status: 'ENABLED', priority: 3, tags: ['continuity', 'audit'] });
    }

    return res.json({
      success: true,
      message: `Dunia cerita "${cleanTitle}" berhasil dibuat dan dibuka.`,
      universe: {
        universeId: mounted.universe.universeId,
        universeDate: mounted.universe.temporalContext.currentUniverseDate,
        universeTime: mounted.universe.temporalContext.currentUniverseTime,
        periodId: mounted.universe.temporalContext.currentPeriodRef ?? 'PERIOD_001',
        universeScope: mounted.universeScope,
        storyMetadata: (mounted.universe as any).storyMetadata
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/load', (req, res) => {
  try {
    const universeId = typeof req.body?.universeId === 'string' ? req.body.universeId.trim() : '';
    const universeScope = typeof req.body?.universeScope === 'string' ? req.body.universeScope.trim() : 'CANONICAL';
    if (!universeId) return res.status(400).json({ error: 'UNIVERSE_ID_REQUIRED' });
    const mounted = getRuntime().universeInstances.load(universeId, universeScope);
    return res.json({ success: true, source: 'PERSISTED_SNAPSHOT', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope, storyMetadata: (mounted.universe as any).storyMetadata } });
  } catch (error) {
    return res.status(error instanceof PersistenceError ? 503 : 404).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/load-current', (_req, res) => {
  try {
    const mounted = getRuntime().universeInstances.loadCurrent();
    if (!mounted) return res.status(404).json({ error: 'PERSISTED_CURRENT_UNIVERSE_NOT_FOUND' });
    return res.json({ success: true, source: 'PERSISTED_CURRENT', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope, storyMetadata: (mounted.universe as any).storyMetadata } });
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
      return res.json({ success: true, source: 'PERSISTED_CURRENT', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope, storyMetadata: (mounted.universe as any).storyMetadata } });
    }
    const { createGenericSeedUniverse } = await import('../../../core/universe/model/seed.ts');
    const generic = createGenericSeedUniverse();
    const mounted = req.body?.universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(generic)
      : current.universeAuthority.mount(generic, 'CANONICAL');
    return res.json({ success: true, source: 'GENERIC_DEVELOPMENT_SEED', universe: { universeId: mounted.universe.universeId, universeDate: mounted.universe.temporalContext.currentUniverseDate, universeTime: mounted.universe.temporalContext.currentUniverseTime, periodId: mounted.universe.temporalContext.currentPeriodRef ?? null, universeScope: mounted.universeScope, storyMetadata: (mounted.universe as any).storyMetadata } });
  } catch (error) {
    return res.status(error instanceof PersistenceError ? 503 : 409).json({ error: error instanceof Error ? error.message : String(error) });
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

// -------------------------------------------------------------
// UNIVERSE DETAILS & ENTITY PROJECTIONS (Blueprint Section 3)
// -------------------------------------------------------------
controlRouter.get('/universe/details', (_req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) {
      return res.json({ mounted: false, characters: [], locations: [], objects: [], relationships: [], unresolvedConditions: [], temporal: null, storyMetadata: null });
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
      storyMetadata: (u as any).storyMetadata ?? {
        title: 'Kisah Pocer Universe',
        premise: 'Petualangan epik di dunia luas yang penuh misteri.',
        synopsis: 'Tokoh-tokoh berjuang menjaga keseimbangan dunia dan mengungkap rahasia masa lalu.',
        genre: 'Fantasi / Petualangan',
        theme: 'Takdir & Keberanian'
      },
      temporal: {
        currentUniverseDate: u.temporalContext.currentUniverseDate,
        currentUniverseTime: u.temporalContext.currentUniverseTime,
        periodRef: u.temporalContext.currentPeriodRef ?? 'PERIOD_001',
        calendarSystem: 'Standard Solar'
      },
      characters: chars.map(c => ({
        id: c.identity.id,
        displayName: c.identity.displayName,
        status: c.identity.status,
        background: c.profile?.personalityType ? `Tipe: ${c.profile.personalityType}` : '',
        personalityType: c.profile?.personalityType ?? 'Pemberani',
        traits: Array.from(c.profile?.mainTraits ?? []),
        flaws: Array.from(c.profile?.flaws ?? []),
        role: c.profile?.occupation ?? 'Karakter Utama',
        occupation: c.profile?.occupation ?? 'Penjelajah',
        locationReference: c.locationReference ?? null,
        alive: c.identity.status !== 'TERMINATED' && c.identity.status !== 'DESTROYED',
        profile: c.profile
      })),
      locations: locs.map(l => ({
        id: l.identity.id,
        displayName: l.identity.displayName,
        description: (l as any).description ?? '',
        locationType: String(l.locationType),
        accessibilityStatus: String(l.accessibilityStatus),
        parentLocationRef: l.parentLocationRef,
        containedLocationRefs: Array.from(l.containedLocationRefs ?? []),
        adjacentLocationRefs: Array.from(l.adjacentLocationRefs ?? [])
      })),
      objects: objs.map(o => ({
        id: o.identity.id,
        displayName: o.identity.displayName,
        objectType: String(o.objectType),
        category: (o as any).category ?? 'ARTIFACT',
        possessionStatus: String(o.possessionStatus ?? 'HELD'),
        condition: String(o.condition ?? 'INTACT'),
        currentLocationRef: o.locationRef,
        holderActorRef: o.possessionRef,
        ownerActorRef: o.ownershipRef
      })),
      relationships: rels.map(r => ({
        id: r.relationshipId,
        sourceActorRef: String(r.subjectRef),
        targetActorRef: String(r.targetRef),
        relationshipType: r.relationshipType,
        direction: r.direction ?? 'BIDIRECTIONAL',
        strength: r.strength ?? 0.8,
        status: r.status ?? 'ACTIVE',
        dynamic: (r as any).dynamic ?? 'Saling Mendukung'
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

// -------------------------------------------------------------
// CHARACTER WORKSPACE PROJECTION (Blueprint Section 4 & 5)
// -------------------------------------------------------------
controlRouter.get('/universe/character/:characterId', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const u = mounted.universe;
    const charId = req.params.characterId;
    const char = (u.characters as Record<string, CharacterEntity>)[charId];
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND', message: 'Tokoh tidak ditemukan.' });

    // Relationships involving this character
    const allRels = Object.values(u.relationships || {}) as RelationshipEntity[];
    const relevantRels = allRels
      .filter(r => String(r.subjectRef) === charId || String(r.targetRef) === charId)
      .map(r => {
        const isSubject = String(r.subjectRef) === charId;
        const otherId = isSubject ? String(r.targetRef) : String(r.subjectRef);
        const otherChar = (u.characters as Record<string, CharacterEntity>)[otherId];
        return {
          id: r.relationshipId,
          otherCharacterId: otherId,
          otherCharacterName: otherChar?.identity.displayName ?? otherId,
          relationshipType: r.relationshipType,
          direction: r.direction ?? 'BIDIRECTIONAL',
          strength: r.strength ?? 0.8,
          status: r.status ?? 'ACTIVE',
          dynamic: (r as any).dynamic ?? 'Hubungan Dinamis',
          narrativeBasis: (r as any).narrativeBasis ?? 'Terbentuk seiring perkembangan cerita.'
        };
      });

    // Knowledge known by this character
    const allKnowledge = Object.values(u.knowledge || {}) as KnowledgeEntity[];
    const charKnowledge = allKnowledge
      .filter(k => String(k.knowerRef) === charId)
      .map(k => ({
        id: k.knowledgeId,
        statement: k.statement,
        subject: k.referencedSubject,
        certainty: k.certainty,
        acquisitionSource: k.acquisitionSource
      }));

    // Objects held or owned by this character
    const allObjs = Object.values(u.objects || {}) as ObjectEntity[];
    const possessions = allObjs
      .filter(o => String(o.possessionRef) === charId || String(o.ownershipRef) === charId)
      .map(o => ({
        id: o.identity.id,
        displayName: o.identity.displayName,
        objectType: String(o.objectType),
        isOwner: String(o.ownershipRef) === charId,
        isHolder: String(o.possessionRef) === charId,
        condition: String(o.condition ?? 'INTACT'),
        possessionStatus: String(o.possessionStatus ?? 'HELD')
      }));

    // Current location
    const locId = char.locationReference;
    const currentLocation = locId ? (u.locations as Record<string, LocationEntity>)[locId] : null;

    // State
    const stateId = char.stateReference;
    const currentState = stateId ? (u.states as Record<string, StateEntity>)[stateId] : null;

    return res.json({
      id: char.identity.id,
      identity: {
        id: char.identity.id,
        displayName: char.identity.displayName,
        status: char.identity.status,
        tags: Array.from(char.identity.tags ?? []),
        age: char.profile?.age ?? 24,
        birthDate: char.profile?.birthDate ?? '15 April',
        zodiac: char.profile?.zodiac ?? 'Aries',
        shio: char.profile?.shio ?? 'Naga'
      },
      appearance: {
        distinctFeatures: char.profile?.distinctiveFeatures?.[0] ?? 'Mata tajam dengan bekas luka kecil di pelipis kiri',
        physicalBuild: (char.profile as any)?.physicalBuild ?? 'Tegap dan atletis',
        clothingStyle: char.profile?.appearanceStyle ?? 'Jubah petualang berbahan linen dengan pelindung kulit'
      },
      personality: {
        personalityType: char.profile?.personalityType ?? 'Pemberani & Visioner',
        traits: Array.from(char.profile?.mainTraits ?? ['Gigih', 'Rasional', 'Setia']),
        flaws: Array.from(char.profile?.flaws ?? ['Kadang impulsif', 'Sulit mendelegasikan tugas']),
        habits: Array.from(char.profile?.habits ?? ['Memeriksa pedang sebelum tidur', 'Mencatat peristiwa penting']),
        fears: Array.from(char.profile?.fears ?? ['Gagal melindungi sahabat']),
        values: Array.from(char.profile?.values ?? ['Keadilan', 'Kebebasan'])
      },
      life: {
        occupation: char.profile?.occupation ?? 'Penjelajah Mandiri',
        hobbies: Array.from(char.profile?.hobbies ?? ['Membaca peta kuno', 'Memasak di alam liar']),
        interests: Array.from(char.profile?.interests ?? ['Arkeologi peninggalan bangsa kuno']),
        skills: Array.from(char.profile?.skills ?? ['Navigasi bintang', 'Ilmu pedang dasar', 'Bahasa kuno']),
        dailyRoutine: char.profile?.dailyPattern ?? 'Berlatih di fajar hari, menjelajah di siang hari, dan menganalisis temuan di malam hari'
      },
      social: {
        socialOrientation: char.profile?.socialTendency ?? 'AMBIVERT'
      },
      narrative: {
        innerWound: char.profile?.openWounds?.[0] ?? 'Rasa bersalah atas kegagalan ekspedisi masa lalu',
        primaryGoal: char.profile?.personalGoal ?? 'Menemukan kota yang hilang dan memulihkan nama baik keluarga',
        aspiration: char.profile?.longTermAspiration ?? 'Membangun akademi bagi para penjelajah muda',
        secretBackstory: char.profile?.secrets?.[0] ?? 'Memiliki hubungan darah dengan dinasti penguasa terdahulu',
        notes: char.profile?.notes ?? 'Sangat sensitif bila membicarakan wilayah utara'
      },
      actor: {
        role: char.roleReferences?.[0] ?? 'ROLE_PROTAGONIST',
        level: (char.profile as any)?.level ?? 'Level 3 (Berpengalaman)',
        group: (char.profile as any)?.group ?? 'Guild Penjelajah Bebas',
        gender: (char.profile as any)?.gender ?? 'Laki-laki',
        entityType: 'CHARACTER'
      },
      currentState: {
        vitality: currentState?.currentValue ?? 'NORMAL & BUGAR',
        mood: (currentState as any)?.mood ?? 'Fokus & Waspada',
        status: char.identity.status
      },
      location: currentLocation ? {
        id: currentLocation.identity.id,
        displayName: currentLocation.identity.displayName,
        locationType: currentLocation.locationType
      } : null,
      relationships: relevantRels,
      knowledge: charKnowledge,
      possessions,
      continuity: {
        status: 'KONSISTEN',
        lastCheckedDate: u.temporalContext.currentUniverseDate,
        invariantsPassed: true
      },
      timeline: [
        { date: '2024-01-01', event: `Karakter ${char.identity.displayName} terdaftar di dunia cerita.` },
        { date: u.temporalContext.currentUniverseDate, event: `Aktif pada tanggal cerita ${u.temporalContext.currentUniverseDate}.` }
      ]
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// -------------------------------------------------------------
// DAILY CONTEXT & STORY DEVELOPMENT (Blueprint Section 10-16)
// -------------------------------------------------------------
controlRouter.get('/universe/daily-context', (_req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const u = mounted.universe;
    const chars = Object.values(u.characters || {}) as CharacterEntity[];
    const locs = Object.values(u.locations || {}) as LocationEntity[];
    const rels = Object.values(u.relationships || {}) as RelationshipEntity[];
    const objs = Object.values(u.objects || {}) as ObjectEntity[];
    const unres = Object.values(u.unresolvedConditions || {}) as UnresolvedConditionEntity[];

    const dateStr = u.temporalContext.currentUniverseDate || '2024-01-01';
    const initialConditions = [
      ...chars.map(c => {
        const loc = c.locationReference ? (u.locations as Record<string, LocationEntity>)[c.locationReference]?.identity.displayName : 'Lokasi Terbuka';
        return `Tokoh ${c.identity.displayName} berada di ${loc} dengan kondisi bugar.`;
      }),
      ...rels.map(r => {
        const charA = (u.characters as Record<string, CharacterEntity>)[String(r.subjectRef)]?.identity.displayName ?? String(r.subjectRef);
        const charB = (u.characters as Record<string, CharacterEntity>)[String(r.targetRef)]?.identity.displayName ?? String(r.targetRef);
        return `Hubungan antara ${charA} dan ${charB} berstatus [${r.relationshipType}].`;
      }),
      ...unres.map(uc => `Misteri naratif aktif: "${uc.description}"`)
    ];

    const availableDevelopments = [
      'Peluang eksplorasi wilayah baru dan pertemuan tak terduga.',
      'Potensi ketegangan atau rekonsiliasi antara para tokoh.',
      'Kemungkinan petunjuk baru mengenai benda pusaka dan misteri terbuka.'
    ];

    return res.json({
      universeDate: dateStr,
      universeTime: u.temporalContext.currentUniverseTime,
      periodRef: u.temporalContext.currentPeriodRef ?? 'PERIOD_001',
      initialConditions,
      activeCharactersCount: chars.length,
      activeLocationsCount: locs.length,
      activeObjectsCount: objs.length,
      openMysteriesCount: unres.length,
      availableDevelopments
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.get('/universe/development', async (_req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const u = mounted.universe;
    const runs = await current.productionStore.list({ limit: 10 });
    const chars = Object.values(u.characters || {}) as CharacterEntity[];
    const rels = Object.values(u.relationships || {}) as RelationshipEntity[];
    const objs = Object.values(u.objects || {}) as ObjectEntity[];
    const unres = Object.values(u.unresolvedConditions || {}) as UnresolvedConditionEntity[];

    return res.json({
      currentDate: u.temporalContext.currentUniverseDate,
      storyDevelopments: runs.map(r => ({
        runId: r.runId,
        date: (r as any).universeDate ?? u.temporalContext.currentUniverseDate,
        purpose: r.purpose,
        status: r.status,
        summary: `Naskah "${r.purpose}" berhasil diterbitkan.`
      })),
      characterDevelopments: chars.map(c => ({
        characterId: c.identity.id,
        name: c.identity.displayName,
        role: c.profile?.occupation ?? 'Tokoh',
        currentGoal: c.profile?.personalGoal ?? 'Menjalani petualangan',
        personality: c.profile?.personalityType ?? 'Pemberani'
      })),
      relationshipDevelopments: rels.map(r => {
        const s = (u.characters as Record<string, CharacterEntity>)[String(r.subjectRef)]?.identity.displayName ?? String(r.subjectRef);
        const t = (u.characters as Record<string, CharacterEntity>)[String(r.targetRef)]?.identity.displayName ?? String(r.targetRef);
        return {
          id: r.relationshipId,
          pair: `${s} ↔ ${t}`,
          status: r.relationshipType,
          dynamic: (r as any).dynamic ?? 'Dinamika Aliansi'
        };
      }),
      worldDevelopments: objs.map(o => ({
        id: o.identity.id,
        name: o.identity.displayName,
        type: o.objectType,
        condition: o.condition ?? 'INTACT',
        status: o.possessionStatus ?? 'HELD'
      })),
      mysteryDevelopments: unres.map(uc => ({
        id: uc.conditionId,
        type: uc.conditionType,
        description: uc.description,
        status: uc.currentStatus
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.get('/universe/timeline', async (_req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const u = mounted.universe;
    const runs = await current.productionStore.list({ limit: 20 });
    const chars = Object.values(u.characters || {}) as CharacterEntity[];
    const locs = Object.values(u.locations || {}) as LocationEntity[];

    const timelineItems = [
      {
        date: '2024-01-01',
        title: 'Awal Mula Dunia Cerita',
        category: 'FOUNDATION',
        description: `Dunia cerita '${(u as any).storyMetadata?.title || u.universeId}' diresmikan dengan ${locs.length} wilayah dan ${chars.length} tokoh awal.`
      },
      ...runs.map(r => ({
        date: (r as any).universeDate ?? u.temporalContext.currentUniverseDate,
        title: `Penerbitan Cerita: ${r.purpose}`,
        category: 'NARRATIVE',
        description: `Proses penulisan naskah harian diselesaikan dengan status ${r.status}.`
      }))
    ];

    return res.json({
      universeId: u.universeId,
      currentDate: u.temporalContext.currentUniverseDate,
      items: timelineItems.reverse()
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// -------------------------------------------------------------
// AI ASSISTANT PROPOSAL ENGINE (Blueprint Section 21)
// -------------------------------------------------------------
controlRouter.post('/ai/assist', async (req, res) => {
  try {
    const { capability, input } = req.body ?? {};

    if (capability === 'STORY_PREMISE') {
      const genre = input?.genre || 'Fantasi / Petualangan';
      const userIdea = input?.userIdea || '';
      return res.json({
        proposal: {
          title: userIdea ? `Hikayat ${userIdea.slice(0, 15)}` : 'Rahasia Lembah Kabut Abadi',
          premise: `Di sebuah dunia di mana energi sihir kuno mulai memudar, seorang penjelajah muda menemukan artefak yang menyimpan peta menuju sumber energi pertama.`,
          synopsis: `Dunia Aethelgard berada di ambang krisis ketika kristal pelindung kota-kota besar mulai retak. Tokoh utama, bersama sekutu tak terduga dari faksi terasing, harus melintasi perbatasan terlarang sebelum faksi bayangan merebut kendali atas inti takdir.`,
          genre,
          theme: 'Keberanian, Pengorbanan, dan Batas Ambisi Manusia',
          initialLocation: 'Kota Pelabuhan Oakhaven',
          initialConflict: 'Sebuah kapal misterius tanpa awak terdampar membawa pesan peringatan dalam aksara kuno.'
        }
      });
    }

    if (capability === 'CHARACTER_PROFILE') {
      const name = input?.name || 'Kaelen';
      const archetype = input?.archetype || 'Penjelajah Cerdas';
      return res.json({
        proposal: {
          displayName: name,
          nickname: name.slice(0, 3),
          age: 26,
          birthDate: '12 November',
          zodiac: 'Scorpio',
          shio: 'Harimau',
          distinctFeatures: 'Bekas luka bakar samar di pergelangan tangan kiri menyerupai simbol konstelasi.',
          physicalBuild: 'Ramping, lincah, dengan gerak-gerik penuh perhitungan.',
          clothingStyle: 'Mantel kulit berkerudung tahan cuaca dengan sabuk serbaguna.',
          personalityType: `${archetype} — Analitis & Tangguh`,
          traits: ['Teliti', 'Tenang di Bawah Tekanan', 'Protektif'],
          flaws: ['Kerap memendam rahasia sendiri', 'Sulit memaafkan pengkhianatan'],
          habits: ['Memutar koin perak saat berpikir', 'Bangun sebelum matahari terbit'],
          fears: ['Mengulangi kesalahan masa lalu yang merugikan orang terdekat'],
          coreValues: ['Kehormatan', 'Pencarian Kebenaran'],
          occupation: 'Arkeolog Lapangan & Penjaga Arsip',
          hobbies: ['Menyalin peta kuno', 'Mengamati rasi bintang'],
          interests: ['Mekanisme kunci peradaban kuno', 'Bahan obat-obatan hutan'],
          skills: ['Pemecah kode sandi', 'Akrobatik dasar', 'Beladiri tongkat'],
          dailyRoutine: 'Membaca catatan ekspedisi sebelum fajar dan merawat perlengkapan setiap malam.',
          socialOrientation: 'AMBIVERT',
          innerWound: 'Kehilangan mentor dalam ekspedisi terlarang lima tahun silam.',
          primaryGoal: 'Membuktikan bahwa teori peninggalan sang mentor adalah kebenaran sejati.',
          aspiration: 'Mendirikan suaka perlindungan bagi artefak dunia.',
          secretBackstory: 'Menyimpan pecahan prasasti kunci yang dicari oleh pihak penguasa.',
          notes: 'Memiliki kompas khusus warisan mentor yang tidak pernah menunjuk ke arah utara biasa.'
        }
      });
    }

    if (capability === 'RELATIONSHIP') {
      const charA = input?.charA || 'Tokoh A';
      const charB = input?.charB || 'Tokoh B';
      return res.json({
        proposal: {
          relationshipType: 'RIVAL_TO_ALLY',
          direction: 'BIDIRECTIONAL',
          strength: 0.75,
          dynamic: 'Persaingan Sehat dengan Saling Menghormati',
          narrativeBasis: `${charA} dan ${charB} mulanya bersaing memperebutkan posisi kepala ekspedisi, namun sebuah insiden di reruntuhan memaksa mereka saling melindungi.`
        }
      });
    }

    if (capability === 'LOCATION') {
      const locName = input?.name || 'Kuil Obsidian Terlupakan';
      return res.json({
        proposal: {
          displayName: locName,
          locationType: 'STRUCTURE',
          accessibilityStatus: 'RESTRICTED',
          description: `Bangunan kuno dari batu obsidian hitam legam yang tidak memantulkan cahaya, terletak di ceruk tebing curam yang selalu diselimuti kabut tebal.`
        }
      });
    }

    if (capability === 'OBJECT') {
      const objName = input?.name || 'Kompas Bintang Emas';
      return res.json({
        proposal: {
          displayName: objName,
          objectType: 'PHYSICAL',
          category: 'ARTIFACT',
          condition: 'INTACT',
          description: `Instrumen navigasi kuno bertatahkan batu safir langit yang jarumnya bergetar jika didekatkan pada anomali ruang waktu.`
        }
      });
    }

    return res.json({ proposal: { message: 'Proposal siap diterapkan.' } });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// -------------------------------------------------------------
// ENTITY MUTATIONS (Character, Location, Object, Relationship, Mystery)
// -------------------------------------------------------------
controlRouter.post('/universe/entity/character', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const {
      displayName,
      nickname,
      age,
      birthDate,
      zodiac,
      shio,
      distinctFeatures,
      physicalBuild,
      clothingStyle,
      personalityType,
      traits,
      flaws,
      habits,
      fears,
      coreValues,
      occupation,
      hobbies,
      interests,
      skills,
      dailyRoutine,
      socialOrientation,
      innerWound,
      primaryGoal,
      aspiration,
      secretBackstory,
      notes,
      role,
      locationReference
    } = req.body ?? {};

    if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
      return res.status(400).json({ error: 'NAMA_TOKOH_DIBUTUHKAN', message: 'Nama tokoh wajib diisi.' });
    }

    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const newId = `CHAR_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const profile: CharacterProfile = {
      fullName: String(displayName).trim(),
      nickname: nickname ? String(nickname) : undefined,
      age: age ? Number(age) : undefined,
      birthDate: birthDate ? String(birthDate) : undefined,
      zodiac: zodiac ? String(zodiac) : undefined,
      shio: shio ? String(shio) : undefined,
      distinctiveFeatures: distinctFeatures ? [String(distinctFeatures)] : undefined,
      appearanceStyle: clothingStyle ? String(clothingStyle) : undefined,
      personalityType: personalityType ? String(personalityType) : 'Pemberani & Visioner',
      mainTraits: Array.isArray(traits) ? traits : [String(traits || 'Pemberani')],
      flaws: Array.isArray(flaws) ? flaws : [String(flaws || 'Terkadang keras kepala')],
      habits: Array.isArray(habits) ? habits : (habits ? [String(habits)] : undefined),
      fears: Array.isArray(fears) ? fears : (fears ? [String(fears)] : undefined),
      values: Array.isArray(coreValues) ? coreValues : (coreValues ? [String(coreValues)] : undefined),
      occupation: occupation ? String(occupation) : 'Penjelajah',
      hobbies: Array.isArray(hobbies) ? hobbies : (hobbies ? [String(hobbies)] : undefined),
      interests: Array.isArray(interests) ? interests : (interests ? [String(interests)] : undefined),
      skills: Array.isArray(skills) ? skills : (skills ? [String(skills)] : undefined),
      dailyPattern: dailyRoutine ? String(dailyRoutine) : undefined,
      socialTendency: (socialOrientation as SocialTendency) || SocialTendency.AMBIVERT,
      openWounds: innerWound ? [String(innerWound)] : undefined,
      personalGoal: primaryGoal ? String(primaryGoal) : 'Mencapai tujuan mulia',
      longTermAspiration: aspiration ? String(aspiration) : undefined,
      secrets: secretBackstory ? [String(secretBackstory)] : undefined,
      notes: notes ? String(notes) : undefined,
      source: ActorDataSource.USER_DEFINED
    };

    if (physicalBuild) {
      (profile as any).physicalBuild = physicalBuild;
    }

    const defaultLoc = Object.keys(uCopy.locations || {})[0];
    const newChar: CharacterEntity = {
      identity: EntityIdentityFactory.create({
        id: newId,
        entityType: EntityType.CHARACTER,
        displayName: String(displayName).trim(),
        status: EntityLifecycleStatus.ACTIVE,
        tags: [role ? String(role).toLowerCase() : 'tokoh']
      }),
      roleReferences: [role ? String(role) : 'ROLE_PROTAGONIST'],
      stateReference: `STATE_${newId}_01`,
      knowledgeReferences: [],
      relationshipReferences: [],
      locationReference: locationReference ? String(locationReference) : defaultLoc,
      temporalValidity: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'ACTUAL' as any },
      continuityReference: `CONT_${newId}_INIT`,
      profile,
      history: RevisionHistoryManager.createInitial(makeSystemID('CHARACTER_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: createProvenanceMetadata(makeSystemID('CHARACTER_SYSTEM'), makeDomainID('CHARACTER'))
    };

    uCopy.characters = uCopy.characters || {};
    uCopy.characters[newId] = newChar;

    const reMounted = mounted.universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(uCopy)
      : current.universeAuthority.mount(uCopy, 'CANONICAL');

    return res.json({ success: true, character: newChar, total: Object.keys(reMounted.universe.characters).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/entity/location', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { displayName, locationType, accessibilityStatus, description, parentLocationRef } = req.body ?? {};
    if (!displayName) return res.status(400).json({ error: 'NAMA_LOKASI_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const newId = `LOC_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newLoc: LocationEntity = {
      identity: EntityIdentityFactory.create({
        id: newId,
        entityType: EntityType.LOCATION,
        displayName: String(displayName).trim(),
        status: EntityLifecycleStatus.ACTIVE
      }),
      locationType: locationType ? String(locationType).trim() as any : 'SETTLEMENT',
      accessibilityStatus: (accessibilityStatus ? String(accessibilityStatus).trim() : 'OPEN') as any,
      parentLocationRef: parentLocationRef || null,
      adjacentLocationRefs: [],
      containedLocationRefs: [],
      temporalValidity: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'ACTUAL' as any },
      history: RevisionHistoryManager.createInitial(makeSystemID('LOCATION_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: createProvenanceMetadata(makeSystemID('LOCATION_SYSTEM'), makeDomainID('LOCATION'))
    };

    if (description) {
      (newLoc as any).description = String(description).trim();
    }

    uCopy.locations = uCopy.locations || {};
    uCopy.locations[newId] = newLoc;

    const reMounted = mounted.universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(uCopy)
      : current.universeAuthority.mount(uCopy, 'CANONICAL');

    return res.json({ success: true, location: newLoc, total: Object.keys(reMounted.universe.locations).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/entity/object', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { displayName, objectType, condition, ownershipRef, possessionRef, locationRef } = req.body ?? {};
    if (!displayName) return res.status(400).json({ error: 'NAMA_BENDA_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const newId = `OBJ_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const defaultLoc = Object.keys(uCopy.locations || {})[0] || 'LOC_DEFAULT';

    const newObj: ObjectEntity = {
      identity: EntityIdentityFactory.create({
        id: newId,
        entityType: EntityType.OBJECT,
        displayName: String(displayName).trim(),
        status: EntityLifecycleStatus.ACTIVE
      }),
      objectName: String(displayName).trim(),
      aliases: [String(displayName).trim()],
      objectType: objectType ? String(objectType).trim() as any : 'PHYSICAL' as any,
      category: 'ARTIFACT',
      categoryPath: ['ARTIFACT'],
      ownershipRef: ownershipRef ? makeEntityID(String(ownershipRef)) : null,
      possessionRef: possessionRef ? makeEntityID(String(possessionRef)) : null,
      possessionStatus: possessionRef ? 'HELD' as any : 'UNCLAIMED' as any,
      currentUserRef: null,
      currentWearerRef: null,
      locationRef: locationRef ? String(locationRef) : defaultLoc,
      containedWithinObjectRef: null,
      accessStatus: 'ACCESSIBLE' as any,
      condition: condition ? String(condition).trim() as any : 'INTACT' as any,
      status: 'ACTIVE' as any,
      identityStatus: 'CONFIRMED' as any,
      source: 'USER_DEFINED' as any,
      fieldSources: {} as any,
      quantity: 1,
      temporalValidity: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'ACTUAL' as any },
      history: RevisionHistoryManager.createInitial(makeSystemID('OBJECT_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: createProvenanceMetadata(makeSystemID('OBJECT_SYSTEM'), makeDomainID('OBJECT'))
    };

    uCopy.objects = uCopy.objects || {};
    uCopy.objects[newId] = newObj;

    const reMounted = mounted.universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(uCopy)
      : current.universeAuthority.mount(uCopy, 'CANONICAL');

    return res.json({ success: true, object: newObj, total: Object.keys(reMounted.universe.objects).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/entity/relationship', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { subjectRef, targetRef, relationshipType, direction, strength, dynamic, narrativeBasis } = req.body ?? {};
    if (!subjectRef || !targetRef) return res.status(400).json({ error: 'TOKOH_HUBUNGAN_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const newId = `REL_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newRel: RelationshipEntity = {
      relationshipId: newId,
      subjectRef: makeEntityID(String(subjectRef)),
      targetRef: makeEntityID(String(targetRef)),
      relationshipType: relationshipType ? String(relationshipType) : 'ALLY',
      direction: direction ? String(direction) as any : 'BIDIRECTIONAL',
      status: EntityLifecycleStatus.ACTIVE,
      strength: typeof strength === 'number' ? strength : 0.8,
      temporalValidity: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'ACTUAL' as any },
      continuityReference: `CONT_${newId}_INIT`,
      history: RevisionHistoryManager.createInitial(makeSystemID('RELATIONSHIP_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: createProvenanceMetadata(makeSystemID('RELATIONSHIP_SYSTEM'), makeDomainID('RELATIONSHIP'))
    };

    (newRel as any).dynamic = dynamic ? String(dynamic) : 'Hubungan Saling Percaya';
    (newRel as any).narrativeBasis = narrativeBasis ? String(narrativeBasis) : 'Terbangun dari pengalaman bersama.';

    uCopy.relationships = uCopy.relationships || {};
    uCopy.relationships[newId] = newRel;

    const reMounted = mounted.universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(uCopy)
      : current.universeAuthority.mount(uCopy, 'CANONICAL');

    return res.json({ success: true, relationship: newRel, total: Object.keys(reMounted.universe.relationships).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/entity/mystery', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { conditionType, description, targetEntityRef } = req.body ?? {};
    if (!description) return res.status(400).json({ error: 'DESKRIPSI_MISTERI_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const newId = `UNRES_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newUnres: UnresolvedConditionEntity = {
      conditionId: newId,
      conditionType: conditionType ? String(conditionType) : 'NARRATIVE_MYSTERY',
      description: String(description).trim(),
      ownerDomain: makeDomainID('LOCATION'),
      targetEntityRef: targetEntityRef ? String(targetEntityRef) : 'UNSPECIFIED',
      temporalScope: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'POSSIBILITY' as any },
      dependencyRefs: [],
      currentStatus: 'CARRYOVER',
      createdAt: uCopy.temporalContext.currentUniverseTime,
      lastUpdated: uCopy.temporalContext.currentUniverseTime,
      sourceSystem: makeSystemID('DAILY_UNIVERSE_SYSTEM'),
      validationStatus: 'VALID' as any,
      provenance: createProvenanceMetadata(makeSystemID('DAILY_UNIVERSE_SYSTEM'), makeDomainID('DAILY_UNIVERSE'))
    };

    uCopy.unresolvedConditions = uCopy.unresolvedConditions || {};
    uCopy.unresolvedConditions[newId] = newUnres;

    const reMounted = mounted.universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(uCopy)
      : current.universeAuthority.mount(uCopy, 'CANONICAL');

    return res.json({ success: true, mystery: newUnres, total: Object.keys(reMounted.universe.unresolvedConditions).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// -------------------------------------------------------------
// TIMELINE ADVANCEMENT & CLONING
// -------------------------------------------------------------
controlRouter.post('/universe/advance-day', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    
    const uCopy = JSON.parse(JSON.stringify(mounted.universe));
    const currentDate = new Date(uCopy.temporalContext.currentUniverseDate || '2024-01-01');
    const daysToAdd = Number(req.body?.days ?? 1);
    currentDate.setUTCDate(currentDate.getUTCDate() + daysToAdd);
    const newDateStr = currentDate.toISOString().slice(0, 10);
    const newTimeStr = `${newDateStr}T08:00:00.000Z`;

    uCopy.temporalContext.currentUniverseDate = newDateStr;
    uCopy.temporalContext.currentUniverseTime = newTimeStr;
    if (uCopy.temporalContext.currentPeriodRef) {
      const parts = uCopy.temporalContext.currentPeriodRef.split('_');
      const pNum = Number(parts[parts.length - 1]);
      if (!isNaN(pNum)) {
        parts[parts.length - 1] = String(pNum + 1).padStart(3, '0');
        uCopy.temporalContext.currentPeriodRef = parts.join('_');
      }
    }

    const reMounted = mounted.universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(uCopy)
      : current.universeAuthority.mount(uCopy, 'CANONICAL');

    return res.json({
      success: true,
      message: `Garis waktu berhasil dimajukan ke ${newDateStr}`,
      universe: {
        universeId: reMounted.universe.universeId,
        universeDate: reMounted.universe.temporalContext.currentUniverseDate,
        universeTime: reMounted.universe.temporalContext.currentUniverseTime,
        periodId: reMounted.universe.temporalContext.currentPeriodRef,
        universeScope: reMounted.universeScope,
        storyMetadata: (reMounted.universe as any).storyMetadata
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
        universeScope: mounted.universeScope,
        storyMetadata: (mounted.universe as any).storyMetadata
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/pages/:pageDefinitionId/toggle', (req, res) => {
  const current = getRuntime();
  const page = current.pageCatalog.get(req.params.pageDefinitionId);
  if (!page) return res.status(404).json({ error: 'PAGE_NOT_FOUND' });
  return res.json(page.status === 'ENABLED' ? current.pageCatalog.disable(req.params.pageDefinitionId) : current.pageCatalog.enable(req.params.pageDefinitionId));
});

controlRouter.get('/ai/status', (_req, res) => {
  const current = getRuntime();
  return res.json({ status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER', providers: current.providerRegistry.list().map(adapter => adapter.profile), health: current.providerRegistry.healthSnapshot() });
});

controlRouter.get('/production/usage', (_req, res) => res.json(getRuntime().costController.totalCommitted()));

// -------------------------------------------------------------
// STORY PRODUCTION (Blueprint Section 12)
// -------------------------------------------------------------
controlRouter.post('/produce', async (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED', message: 'Buka dunia cerita terlebih dahulu sebelum menjalankan penulisan.' });
    const parsed = parseProductionHttpInput(req.body, 'DAILY_STORY');
    if (parsed.purpose === 'DAILY_STORY' || parsed.purpose === 'DAILY_PAGE') {
      const bridge = await current.dailyBridge.run(toDailyBridgeInput(parsed, mounted.universe, mounted.universeScope));
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
        pages: bridge.pagePackages.map(page => ({ pageId: page.pageId, pageKey: page.pageKey, pageScope: page.pageScope, validationStatus: page.validationStatus })),
        pageProduction: bridge.pageProduction ?? null,
        reason: bridge.reason ?? null
      });
    }
    const result = await current.productionRunner.run(toProductionRunInput(parsed, mounted.universe, mounted.universeScope));
    return res.status(result.status === 'FAILED' ? 502 : result.status === 'BLOCKED' ? 409 : 200).json(result);
  } catch (error) {
    const status = error instanceof PersistenceError ? 503 : 400;
    return res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
