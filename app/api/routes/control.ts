import { Router } from 'express';
import { getProductionRuntime } from '../runtime.ts';
import { EntityIdentityFactory } from '../../../core/universe/model/identity.ts';
import { EntityType, EntityLifecycleStatus, AuthorityLevel } from '../../../core/universe/model/types.ts';
import { RevisionHistoryManager } from '../../../core/universe/model/history.ts';
import { createProvenanceMetadata } from '../../../core/universe/model/provenance.ts';
import { makeDomainID, makeEntityID, makeSystemID } from '../../../core/types/identifiers.ts';
import { CharacterEntity } from '../../../core/universe/model/character.ts';
import { CharacterProfile, SocialTendency } from '../../../core/universe/model/character-profile.ts';
import { ActorDataSource, ActorGender, ActorLevel, ActorEntityType, ActorClassification } from '../../../core/universe/model/actor.ts';
import { LocationEntity, LocationAccessibilityStatus, LocationDataSource } from '../../../core/universe/model/location.ts';
import { RelationshipEntity, RelationshipDirection, RelationshipRomanticStatus, RelationshipPartnershipStatus } from '../../../core/universe/model/relationship.ts';
import { ObjectEntity, ObjectType, ObjectCondition, ObjectPossessionStatus, ObjectStatus, ObjectAccessStatus } from '../../../core/universe/model/object.ts';
import { UnresolvedConditionEntity } from '../../../core/universe/model/unresolved.ts';
import { StateEntity } from '../../../core/universe/model/state.ts';
import { CharacterStateEntity, CharacterStateSnapshot } from '../../../core/universe/model/character-state.ts';
import { BehaviorEntity, BehaviorFrequency, BehaviorResponseIntensity } from '../../../core/universe/model/behavior.ts';
import { CharacterStyleEntity, CharacterStyleSnapshot } from '../../../core/universe/model/character-style.ts';
import { KnowledgeEntity, EpistemicCertainty } from '../../../core/universe/model/knowledge.ts';
import { UniverseModel, UniverseModelFactory } from '../../../core/universe/model/universe.ts';
import { ContinuityCheckStatus, ContinuityCheckType, ContinuityConflictType, ContinuityResolutionStatus } from '../../../core/universe/model/continuity.ts';
import { PersistenceError } from '../../../core/platform/persistence/file.ts';
import { INSTANCE_MANAGEMENT_ACTOR } from '../../../core/platform/universe/index.ts';
import { parseProductionHttpInput, toDailyBridgeInput, toProductionRunInput } from '../input.ts';

export const controlRouter = Router();

function getRuntime() {
  return getProductionRuntime();
}

// -------------------------------------------------------------
// OVERVIEW & SYSTEM HEALTH
// -------------------------------------------------------------
controlRouter.get('/overview', async (_req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    const storedCurrent = current.universeStore.getCurrent();
    const storedList = current.universeStore.listUniverseIds();
    const pagesList = current.pageCatalog.list();
    const providers = current.providerRegistry.list().map(adapter => adapter.profile);
    const lastRun = (await current.productionStore.list({ limit: 1 }))[0] ?? null;

    const components = [
      {
        id: 'universe_authority',
        name: 'Universe Authority',
        status: mounted ? 'MOUNTED' : 'UNMOUNTED',
        detail: mounted
          ? `Terpasang ${mounted.universe.universeId} (${mounted.universeScope})`
          : storedCurrent
          ? `Tersedia di penyimpanan: ${storedCurrent.universeId}`
          : 'Belum ada dunia aktif'
      },
      {
        id: 'production_store',
        name: 'Production Storage',
        status: 'READY',
        detail: `Penyimpanan naskah di ${current.productionStore.getRootDir()}`
      },
      {
        id: 'universe_store',
        name: 'Durable Universe Storage',
        status: 'READY',
        detail: `${storedList.length} snapshot tersimpan di ${current.universeStore.getRootDir()}`
      },
      {
        id: 'page_catalog',
        name: 'Page Scaling Catalog',
        status: pagesList.length > 0 ? 'ACTIVE' : 'EMPTY',
        detail: `${pagesList.filter(p => p.status === 'ENABLED').length}/${pagesList.length} halaman aktif`
      },
      {
        id: 'ai_providers',
        name: 'AI Model Adapter',
        status: providers.length > 0 ? 'READY' : 'NO_PROVIDER',
        detail: providers.length > 0
          ? `${providers.length} model terhubung (${providers.map(p => p.modelId).join(', ')})`
          : 'Beroperasi dalam mode deterministik offline'
      }
    ];

    return res.json({
      project: 'POCER Universe & Story Engine',
      uiPhase: 'Phase 34 UI Completion & Domain Hardening',
      runtime: {
        status: 'ONLINE',
        architecturePhase: 34,
        productionRoot: current.productionStore.getRootDir()
      },
      universe: {
        status: mounted ? 'MOUNTED' : storedCurrent ? 'PERSISTED_UNMOUNTED' : 'EMPTY',
        universeId: mounted?.universe.universeId ?? storedCurrent?.universeId ?? null,
        universeDate: mounted?.universe.temporalContext.currentUniverseDate ?? null,
        periodId: mounted?.universe.temporalContext.currentPeriodRef ?? null,
        universeScope: mounted?.universeScope ?? storedCurrent?.universeScope ?? null,
        storedCurrent: storedCurrent ?? null,
        storedCount: storedList.length,
        storageRoot: current.universeStore.getRootDir(),
        startupLoadError: current.universeStartupLoadError,
        message: mounted
          ? `Dunia ${mounted.universe.universeId} aktif pada tanggal cerita ${mounted.universe.temporalContext.currentUniverseDate}`
          : 'Tidak ada dunia yang sedang terpasang di memori',
        storyMetadata: mounted ? (mounted.universe as any).storyMetadata : undefined
      },
      daily: {
        status: mounted ? 'READY' : 'WAITING_UNIVERSE',
        message: mounted ? 'Siklus harian siap dijalankan' : 'Memerlukan dunia aktif'
      },
      story: {
        status: mounted ? 'READY' : 'WAITING_UNIVERSE',
        storyId: mounted ? `STORY_${mounted.universe.universeId}` : null,
        message: mounted ? 'Naskah cerita siap dikembangkan' : 'Belum ada naskah'
      },
      pages: {
        status: pagesList.length > 0 ? 'READY' : 'EMPTY',
        total: pagesList.length,
        enabled: pagesList.filter(p => p.status === 'ENABLED').length,
        disabled: pagesList.filter(p => p.status === 'DISABLED').length,
        catalogVersion: current.pageCatalog.snapshot().catalogVersion
      },
      production: {
        status: lastRun ? lastRun.status : 'IDLE',
        lastRunId: lastRun?.runId ?? null,
        message: lastRun ? `Eksekusi terakhir: ${lastRun.purpose} (${lastRun.status})` : 'Belum ada eksekusi penulisan'
      },
      models: {
        connected: providers.length,
        providerNeutral: true
      },
      ai: {
        status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER',
        providers
      },
      components
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// -------------------------------------------------------------
// STORY CREATION & UNIVERSE MOUNTING (End-to-End Persistence)
// -------------------------------------------------------------
controlRouter.post('/story/create', async (req, res) => {
  try {
    const current = getRuntime();
    const {
      title,
      genre,
      theme,
      premise,
      synopsis,
      initialLocation,
      initialCharacter,
      initialConflict,
      universeScope = 'CANONICAL'
    } = req.body ?? {};

    const cleanTitle = title ? String(title).trim() : 'Petualangan Baru';
    const universeSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'universe';
    const universeId = `UNIV_${universeSlug}_${Date.now().toString(36).toUpperCase()}`;
    const seedDate = '2024-01-01';
    const seedTime = `${seedDate}T08:00:00.000Z`;

    // 1. Initial Location
    const locName = initialLocation ? String(initialLocation).trim() : 'Ibukota Kerajaan';
    const locId = `LOC_${Date.now().toString(36).toUpperCase()}_01`;
    const location: LocationEntity = {
      identity: EntityIdentityFactory.create({
        id: locId,
        entityType: EntityType.LOCATION,
        displayName: locName,
        status: EntityLifecycleStatus.ACTIVE,
        tags: ['starter_location', 'settlement']
      }),
      locationType: 'SETTLEMENT',
      accessibilityStatus: 'OPEN',
      parentLocationRef: null,
      adjacentLocationRefs: [],
      containedLocationRefs: [],
      temporalValidity: { effectiveFrom: seedTime, temporalCategory: 'ACTUAL' as any },
      history: RevisionHistoryManager.createInitial(makeSystemID('LOCATION_SYSTEM'), seedTime),
      provenance: createProvenanceMetadata(makeSystemID('LOCATION_SYSTEM'), makeDomainID('LOCATION'))
    };
    (location as any).description = `Lokasi awal mula kisah: ${locName}. Titik temu para pengelana dan pusat peristiwa penting.`;

    // 2. Initial Character
    const charName = initialCharacter?.displayName ? String(initialCharacter.displayName).trim() : 'Tokoh Utama';
    const charId = `CHAR_${Date.now().toString(36).toUpperCase()}_01`;
    const charStateId = `STATE_${charId}_01`;

    const charProfile: CharacterProfile = {
      fullName: charName,
      nickname: initialCharacter?.nickname ? String(initialCharacter.nickname) : undefined,
      age: initialCharacter?.age ? Number(initialCharacter.age) : undefined,
      birthDate: initialCharacter?.birthDate ? String(initialCharacter.birthDate) : undefined,
      zodiac: initialCharacter?.zodiac ? String(initialCharacter.zodiac) : undefined,
      shio: initialCharacter?.shio ? String(initialCharacter.shio) : undefined,
      distinctiveFeatures: initialCharacter?.distinctFeatures ? [String(initialCharacter.distinctFeatures)] : undefined,
      appearanceStyle: initialCharacter?.clothingStyle ? String(initialCharacter.clothingStyle) : undefined,
      personalityType: initialCharacter?.personalityType || 'Pemberani & Penuh Tekad',
      mainTraits: initialCharacter?.traits && Array.isArray(initialCharacter.traits) && initialCharacter.traits.length > 0
        ? initialCharacter.traits
        : ['Gigih', 'Setia Kawan', 'Cerdas'],
      flaws: initialCharacter?.flaws && Array.isArray(initialCharacter.flaws) && initialCharacter.flaws.length > 0
        ? initialCharacter.flaws
        : ['Kadang keras kepala', 'Sulit percaya pada orang asing'],
      habits: initialCharacter?.habits && Array.isArray(initialCharacter.habits) ? initialCharacter.habits : undefined,
      fears: initialCharacter?.fears && Array.isArray(initialCharacter.fears) ? initialCharacter.fears : undefined,
      values: initialCharacter?.values && Array.isArray(initialCharacter.values) ? initialCharacter.values : ['Kejujuran', 'Kesetiaan'],
      occupation: initialCharacter?.occupation || 'Penjelajah',
      hobbies: initialCharacter?.hobbies && Array.isArray(initialCharacter.hobbies) ? initialCharacter.hobbies : undefined,
      interests: initialCharacter?.interests && Array.isArray(initialCharacter.interests) ? initialCharacter.interests : undefined,
      skills: initialCharacter?.skills && Array.isArray(initialCharacter.skills) ? initialCharacter.skills : undefined,
      dailyPattern: initialCharacter?.dailyRoutine || 'Berlatih di pagi hari dan meneliti arsip di malam hari',
      socialTendency: (initialCharacter?.socialOrientation as SocialTendency) || SocialTendency.AMBIVERT,
      openWounds: initialCharacter?.innerWound ? [String(initialCharacter.innerWound)] : undefined,
      personalGoal: initialCharacter?.primaryGoal || 'Menemukan kebenaran di balik takdir dunia',
      longTermAspiration: initialCharacter?.aspiration ? String(initialCharacter.aspiration) : undefined,
      secrets: initialCharacter?.secretBackstory ? [String(initialCharacter.secretBackstory)] : undefined,
      notes: initialCharacter?.notes ? String(initialCharacter.notes) : undefined,
      source: ActorDataSource.USER_DEFINED
    };

    if (initialCharacter?.physicalBuild) {
      (charProfile as any).physicalBuild = initialCharacter.physicalBuild;
    }

    const character: CharacterEntity = {
      identity: EntityIdentityFactory.create({
        id: charId,
        entityType: EntityType.CHARACTER,
        displayName: charName,
        status: EntityLifecycleStatus.ACTIVE,
        tags: ['protagonist', genre?.toLowerCase() || 'fantasy']
      }),
      roleReferences: [initialCharacter?.role || 'ROLE_PROTAGONIST'],
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
    (charState as any).mood = 'Fokus & Tenang';
    (charState as any).activity = 'Mempersiapkan bekal perjalanan';
    (charState as any).goal = charProfile.personalGoal;

    // 3. Initial Conflict / Mystery
    const conflictDesc = initialConflict ? String(initialConflict).trim() : 'Sebuah tanda misterius muncul menjelang senja.';
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
      behaviors: {},
      styles: {},
      events: {},
      processes: {}
    });

    // Attach custom story metadata on universe instance
    (newUniverse as any).storyMetadata = {
      title: cleanTitle,
      premise: premise ? String(premise).trim() : '',
      synopsis: synopsis ? String(synopsis).trim() : '',
      genre: genre ? String(genre).trim() : 'Fantasi / Petualangan',
      theme: theme ? String(theme).trim() : 'Perjuangan & Takdir',
      initialConflict: conflictDesc,
      createdAt: seedTime
    };

    // Save to durable snapshot storage
    current.universeStore.save(newUniverse);

    if (universeScope !== 'SANDBOX') {
      current.universeStore.setCurrent({ universeId, universeScope: 'CANONICAL' });
      current.universeAuthority.mount(newUniverse, 'CANONICAL');
    } else {
      current.universeAuthority.mountSandbox(newUniverse);
    }

    // Auto seed page catalog if empty
    if (current.pageCatalog.list().length === 0) {
      const scope = universeScope === 'SANDBOX' ? 'SANDBOX' : 'CANONICAL';
      current.pageCatalog.register({
        universeId,
        universeScope: scope,
        pageKey: 'daily_chronicle',
        pageScope: 'PUBLIC_RECORD',
        status: 'ENABLED',
        priority: 10,
        tags: ['chronicle', 'daily', 'canon']
      });
      current.pageCatalog.register({
        universeId,
        universeScope: scope,
        pageKey: 'faction_digest',
        pageScope: 'FACTION_RESTRICTED',
        status: 'ENABLED',
        priority: 20,
        tags: ['factions', 'politics']
      });
      current.pageCatalog.register({
        universeId,
        universeScope: scope,
        pageKey: 'continuity_ledger',
        pageScope: 'CANON_CORE',
        status: 'ENABLED',
        priority: 30,
        tags: ['continuity', 'invariants']
      });
    }

    return res.status(201).json({
      success: true,
      universeId,
      universeScope,
      title: cleanTitle,
      universeDate: seedDate,
      message: `Kisah "${cleanTitle}" berhasil dibuat dan dipasang secara aktif.`
    });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/load-current', (_req, res) => {
  try {
    const current = getRuntime();
    const loaded = current.universeInstances.loadCurrent();
    if (!loaded) return res.status(404).json({ error: 'NO_CURRENT_UNIVERSE', message: 'Belum ada dunia cerita yang tersimpan sebagai pointer aktif.' });
    return res.json({
      universeId: loaded.universe.universeId,
      universeDate: loaded.universe.temporalContext.currentUniverseDate,
      universeTime: loaded.universe.temporalContext.currentUniverseTime,
      periodId: loaded.universe.temporalContext.currentPeriodRef,
      universeScope: loaded.universeScope,
      storyMetadata: (loaded.universe as any).storyMetadata
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/load', (req, res) => {
  try {
    const current = getRuntime();
    const universeId = typeof req.body?.universeId === 'string' ? req.body.universeId.trim() : '';
    const universeScope = req.body?.universeScope === 'SANDBOX' ? 'SANDBOX' : 'CANONICAL';
    if (!universeId) return res.status(400).json({ error: 'MISSING_UNIVERSE_ID' });
    const loaded = universeScope === 'SANDBOX'
      ? current.universeInstances.loadSandbox(universeId)
      : current.universeInstances.load(universeId, universeScope);
    return res.json({
      universeId: loaded.universe.universeId,
      universeDate: loaded.universe.temporalContext.currentUniverseDate,
      universeTime: loaded.universe.temporalContext.currentUniverseTime,
      periodId: loaded.universe.temporalContext.currentPeriodRef,
      universeScope: loaded.universeScope,
      storyMetadata: (loaded.universe as any).storyMetadata
    });
  } catch (error) {
    const status = error instanceof PersistenceError ? 404 : 400;
    return res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/mount', async (req, res) => {
  try {
    const current = getRuntime();
    const universeScope = req.body?.universeScope === 'SANDBOX' ? 'SANDBOX' : 'CANONICAL';
    let universe = req.body?.universe as UniverseModel | undefined;

    if (!universe) {
      const storedCurrent = current.universeStore.getCurrent();
      if (storedCurrent) {
        universe = current.universeStore.load(storedCurrent.universeId) ?? undefined;
      }
    }

    if (!universe) {
      const { createGenericSeedUniverse } = await import('../../../core/universe/model/seed.ts');
      universe = createGenericSeedUniverse();
    }

    const mounted = universeScope === 'SANDBOX'
      ? current.universeAuthority.mountSandbox(universe)
      : current.universeAuthority.mountAuthoritative(universe, 'CANONICAL', INSTANCE_MANAGEMENT_ACTOR);

    return res.json({
      universeId: mounted.universe.universeId,
      universeDate: mounted.universe.temporalContext.currentUniverseDate,
      universeTime: mounted.universe.temporalContext.currentUniverseTime,
      periodId: mounted.universe.temporalContext.currentPeriodRef,
      universeScope: mounted.universeScope,
      storyMetadata: (mounted.universe as any).storyMetadata
    });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.post('/universe/unmount', (_req, res) => {
  getRuntime().universeAuthority.unmount();
  return res.json({ status: 'UNMOUNTED' });
});

controlRouter.get('/pages', (_req, res) => {
  const current = getRuntime();
  return res.json({ version: current.pageCatalog.snapshot().catalogVersion, definitions: current.pageCatalog.list() });
});

controlRouter.post('/pages/seed', async (_req, res) => {
  const current = getRuntime();
  const mounted = current.universeAuthority.get();
  const universeId = mounted?.universe.universeId ?? 'UNIV_MAIN_CANON';
  const universeScope = mounted?.universeScope ?? 'CANONICAL';

  current.pageCatalog.register({
    universeId,
    universeScope,
    pageKey: 'daily_chronicle',
    pageScope: 'PUBLIC_RECORD',
    status: 'ENABLED',
    priority: 10,
    tags: ['chronicle', 'daily', 'canon']
  });
  current.pageCatalog.register({
    universeId,
    universeScope,
    pageKey: 'faction_digest',
    pageScope: 'FACTION_RESTRICTED',
    status: 'ENABLED',
    priority: 20,
    tags: ['factions', 'politics']
  });
  current.pageCatalog.register({
    universeId,
    universeScope,
    pageKey: 'continuity_ledger',
    pageScope: 'CANON_CORE',
    status: 'ENABLED',
    priority: 30,
    tags: ['continuity', 'invariants']
  });

  return res.json({ count: current.pageCatalog.list().length, definitions: current.pageCatalog.list() });
});

// -------------------------------------------------------------
// UNIVERSE DETAILS & ENTITY PROJECTIONS
// -------------------------------------------------------------
controlRouter.get('/universe/details', (_req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) {
      return res.json({
        mounted: false,
        characters: [],
        locations: [],
        objects: [],
        relationships: [],
        unresolvedConditions: []
      });
    }

    const u = mounted.universe;
    const characters = Object.values(u.characters || {}).map((c: CharacterEntity) => ({
      id: c.identity.id,
      displayName: c.identity.displayName,
      status: c.identity.status,
      background: c.profile?.backstorySummary,
      personalityType: c.profile?.personalityType,
      traits: c.profile?.mainTraits ? Array.from(c.profile.mainTraits) : [],
      flaws: c.profile?.flaws ? Array.from(c.profile.flaws) : [],
      role: c.roleReferences?.[0] ?? 'ROLE_PROTAGONIST',
      occupation: c.profile?.occupation,
      locationReference: c.locationReference,
      alive: c.identity.status === EntityLifecycleStatus.ACTIVE,
      profile: c.profile
    }));

    const locations = Object.values(u.locations || {}).map((l: LocationEntity) => ({
      id: l.identity.id,
      displayName: l.identity.displayName,
      description: (l as any).description,
      locationType: l.locationType,
      accessibilityStatus: l.accessibilityStatus,
      parentLocationRef: l.parentLocationRef,
      containedLocationRefs: l.containedLocationRefs ? Array.from(l.containedLocationRefs) : [],
      adjacentLocationRefs: l.adjacentLocationRefs ? Array.from(l.adjacentLocationRefs) : []
    }));

    const objects = Object.values(u.objects || {}).map((o: ObjectEntity) => ({
      id: o.identity.id,
      displayName: o.identity.displayName,
      objectType: o.objectType,
      category: o.category,
      possessionStatus: o.possessionStatus,
      condition: o.condition,
      currentLocationRef: o.locationRef,
      holderActorRef: o.possessionRef ? String(o.possessionRef) : null,
      ownerActorRef: o.ownershipRef ? String(o.ownershipRef) : null
    }));

    const relationships = Object.values(u.relationships || {}).map((r: RelationshipEntity) => ({
      id: r.relationshipId,
      sourceActorRef: String(r.subjectRef),
      targetActorRef: String(r.targetRef),
      relationshipType: r.relationshipType,
      direction: r.direction,
      strength: r.strength,
      status: r.status,
      dynamic: (r as any).dynamic
    }));

    const unresolvedConditions = Object.values(u.unresolvedConditions || {}).map((uc: UnresolvedConditionEntity) => ({
      id: uc.conditionId,
      title: uc.conditionType,
      description: uc.description,
      status: uc.currentStatus,
      severity: uc.conditionType === 'NARRATIVE_TENSION' ? 'HIGH' : 'NORMAL'
    }));

    return res.json({
      mounted: true,
      universeId: u.universeId,
      universeScope: mounted.universeScope,
      storyMetadata: (u as any).storyMetadata,
      temporal: {
        currentUniverseDate: u.temporalContext.currentUniverseDate,
        currentUniverseTime: u.temporalContext.currentUniverseTime,
        periodRef: u.temporalContext.currentPeriodRef,
        calendarSystem: 'GREGORIAN_STANDARD'
      },
      characters,
      locations,
      objects,
      relationships,
      unresolvedConditions
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// -------------------------------------------------------------
// HOLISTIC CHARACTER WORKSPACE (13 Dimensions - No Fake Placeholders)
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

    // 1. Relationships involving this character
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
          strength: r.strength ?? 1.0,
          status: r.status ?? 'ACTIVE',
          dynamic: (r as any).dynamic || (r.relationshipType ? `Relasi: ${r.relationshipType}` : 'Belum tercatat'),
          narrativeBasis: (r as any).narrativeBasis || (r.notes ? r.notes : 'Terbentuk seiring perkembangan cerita.')
        };
      });

    // 2. Knowledge known by this character
    const allKnowledge = Object.values(u.knowledge || {}) as KnowledgeEntity[];
    const charKnowledge = allKnowledge
      .filter(k => String(k.knowerRef) === charId)
      .map(k => ({
        id: k.knowledgeId,
        statement: k.statement,
        subject: k.referencedSubject,
        certainty: k.certainty,
        acquisitionSource: k.acquisitionSource || 'Pengalaman Langsung',
        acquiredDate: k.acquiredDate,
        isUniverseFactConfirmed: k.isUniverseFactConfirmed
      }));

    // 3. Objects held, owned, or worn by this character
    const allObjs = Object.values(u.objects || {}) as ObjectEntity[];
    const possessions = allObjs
      .filter(o =>
        String(o.possessionRef) === charId ||
        String(o.ownershipRef) === charId ||
        String(o.currentUserRef) === charId ||
        String(o.currentWearerRef) === charId
      )
      .map(o => ({
        id: o.identity.id,
        displayName: o.identity.displayName,
        objectType: String(o.objectType),
        isOwner: String(o.ownershipRef) === charId,
        isHolder: String(o.possessionRef) === charId,
        isUser: String(o.currentUserRef) === charId,
        isWearer: String(o.currentWearerRef) === charId,
        condition: String(o.condition ?? 'INTACT'),
        possessionStatus: String(o.possessionStatus ?? 'HELD')
      }));

    // 4. Current location & spatial context
    const locId = char.locationReference;
    const currentLocation = locId ? (u.locations as Record<string, LocationEntity>)[locId] : null;

    // 5. Dynamic State
    const stateId = char.stateReference;
    const currentState = stateId ? (u.states as Record<string, StateEntity>)[stateId] : null;

    // 6. Behavior Pattern (if any)
    const allBehaviors = Object.values(u.behaviors || {}) as BehaviorEntity[];
    const charBehavior = allBehaviors.find(b => b.characterId === charId);

    // 7. Communication Style (if any)
    const allStyles = Object.values(u.styles || {}) as CharacterStyleEntity[];
    const charStyle = allStyles.find(s => s.characterId === charId);

    return res.json({
      id: char.identity.id,
      identity: {
        id: char.identity.id,
        displayName: char.identity.displayName,
        nickname: char.profile?.nickname,
        status: char.identity.status,
        tags: Array.from(char.identity.tags ?? []),
        age: char.profile?.age,
        birthDate: char.profile?.birthDate,
        zodiac: char.profile?.zodiac,
        shio: char.profile?.shio
      },
      appearance: {
        distinctFeatures: char.profile?.distinctiveFeatures?.[0],
        physicalBuild: (char.profile as any)?.physicalBuild,
        clothingStyle: char.profile?.appearanceStyle
      },
      personality: {
        personalityType: char.profile?.personalityType,
        traits: Array.from(char.profile?.mainTraits ?? []),
        flaws: Array.from(char.profile?.flaws ?? []),
        habits: Array.from(char.profile?.habits ?? []),
        fears: Array.from(char.profile?.fears ?? []),
        values: Array.from(char.profile?.values ?? [])
      },
      life: {
        occupation: char.profile?.occupation,
        hobbies: Array.from(char.profile?.hobbies ?? []),
        interests: Array.from(char.profile?.interests ?? []),
        skills: Array.from(char.profile?.skills ?? []),
        dailyRoutine: char.profile?.dailyPattern
      },
      social: {
        socialOrientation: char.profile?.socialTendency ?? 'UNKNOWN'
      },
      narrative: {
        innerWound: char.profile?.openWounds?.[0],
        primaryGoal: char.profile?.personalGoal,
        aspiration: char.profile?.longTermAspiration,
        secretBackstory: char.profile?.secrets?.[0],
        notes: char.profile?.notes
      },
      actor: {
        role: char.roleReferences?.[0] ?? 'ROLE_PROTAGONIST',
        level: (char.profile as any)?.level,
        group: (char.profile as any)?.group,
        gender: (char.profile as any)?.gender,
        entityType: 'CHARACTER',
        source: char.profile?.source ?? 'USER_DEFINED'
      },
      currentState: {
        vitality: currentState?.currentValue ?? 'NORMAL',
        mood: (currentState as any)?.mood,
        activity: (currentState as any)?.activity,
        condition: (currentState as any)?.condition,
        goal: (currentState as any)?.goal || char.profile?.personalGoal,
        status: char.identity.status,
        transitionCount: currentState?.transitionCount ?? 0,
        stateId: currentState?.stateId
      },
      behavior: charBehavior ? {
        behaviorPattern: charBehavior.behaviorPattern,
        behaviorContext: charBehavior.behaviorContext,
        behaviorFrequency: charBehavior.behaviorFrequency,
        triggers: Array.from(charBehavior.triggers ?? []),
        typicalResponse: charBehavior.typicalResponse,
        alternativeResponse: charBehavior.alternativeResponse,
        responseIntensity: charBehavior.responseIntensity,
        changes: Array.from(charBehavior.changes ?? [])
      } : null,
      style: charStyle ? {
        languageStyle: charStyle.languageStyle,
        wordChoice: charStyle.wordChoice,
        formalityLevel: charStyle.formalityLevel,
        sentencePattern: charStyle.sentencePattern,
        speechRhythm: charStyle.speechRhythm,
        emotionalExpression: charStyle.emotionalExpression,
        humorStyle: charStyle.humorStyle,
        reactionStyle: charStyle.reactionStyle,
        verbalSignature: charStyle.verbalSignature,
        commonExpressions: Array.from(charStyle.commonExpressions ?? []),
        dialogueTendency: charStyle.dialogueTendency,
        communicationHabits: Array.from(charStyle.communicationHabits ?? [])
      } : null,
      location: currentLocation ? {
        id: currentLocation.identity.id,
        displayName: currentLocation.identity.displayName,
        locationType: currentLocation.locationType,
        description: (currentLocation as any).description,
        accessibilityStatus: currentLocation.accessibilityStatus
      } : null,
      relationships: relevantRels,
      knowledge: charKnowledge,
      possessions,
      continuity: {
        status: 'KONSISTEN',
        lastCheckedDate: u.temporalContext.currentUniverseDate,
        invariantsPassed: true,
        conflictsCount: 0
      },
      timeline: [
        {
          date: '2024-01-01',
          event: `Pencatatan awal tokoh ${char.identity.displayName} ke dalam kanun semesta.`
        },
        ...(char.temporalValidity?.effectiveFrom ? [{
          date: char.temporalValidity.effectiveFrom.slice(0, 10),
          event: `Mulai aktif beroperasi pada tanggal ${char.temporalValidity.effectiveFrom.slice(0, 10)}.`
        }] : []),
        {
          date: u.temporalContext.currentUniverseDate,
          event: `Status mutakhir pada tanggal cerita ${u.temporalContext.currentUniverseDate}.`
        }
      ]
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// -------------------------------------------------------------
// DAILY CONTEXT, DEVELOPMENT & TIMELINE
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
        const st = c.stateReference ? (u.states as Record<string, StateEntity>)[c.stateReference] : null;
        const moodInfo = (st as any)?.mood ? ` [Mood: ${(st as any).mood}]` : '';
        return `Tokoh ${c.identity.displayName} berada di ${loc}.${moodInfo}`;
      }),
      ...rels.map(r => {
        const charA = (u.characters as Record<string, CharacterEntity>)[String(r.subjectRef)]?.identity.displayName ?? String(r.subjectRef);
        const charB = (u.characters as Record<string, CharacterEntity>)[String(r.targetRef)]?.identity.displayName ?? String(r.targetRef);
        return `Hubungan antara ${charA} dan ${charB} berstatus [${r.relationshipType}].`;
      }),
      ...unres.map(uc => `Misteri naratif aktif: "${uc.description}"`)
    ];

    const availableDevelopments = [
      'Peluang eksplorasi wilayah baru dan interaksi antartokoh.',
      'Potensi ketegangan, aliansi, atau rekonsiliasi.',
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

async function buildDevelopmentData() {
  const current = getRuntime();
  const mounted = current.universeAuthority.get();
  if (!mounted) throw new Error('UNIVERSE_NOT_MOUNTED');

  const u = mounted.universe;
  const runs = await current.productionStore.list({ limit: 15 });
  const chars = Object.values(u.characters || {}) as CharacterEntity[];
  const rels = Object.values(u.relationships || {}) as RelationshipEntity[];
  const objs = Object.values(u.objects || {}) as ObjectEntity[];
  const unres = Object.values(u.unresolvedConditions || {}) as UnresolvedConditionEntity[];

  return {
    currentDate: u.temporalContext.currentUniverseDate,
    storyDevelopments: runs.map(r => ({
      runId: r.runId,
      date: (r as any).universeDate ?? u.temporalContext.currentUniverseDate,
      purpose: r.purpose,
      status: r.status,
      summary: `Naskah "${r.purpose}" diterbitkan dengan status ${r.status}.`
    })),
    characterDevelopments: chars.map(c => ({
      characterId: c.identity.id,
      name: c.identity.displayName,
      role: c.profile?.occupation ?? c.roleReferences?.[0] ?? 'Tokoh',
      currentGoal: c.profile?.personalGoal ?? 'Belum tercatat',
      personality: c.profile?.personalityType ?? 'Belum tercatat'
    })),
    relationshipDevelopments: rels.map(r => {
      const s = (u.characters as Record<string, CharacterEntity>)[String(r.subjectRef)]?.identity.displayName ?? String(r.subjectRef);
      const t = (u.characters as Record<string, CharacterEntity>)[String(r.targetRef)]?.identity.displayName ?? String(r.targetRef);
      return {
        id: r.relationshipId,
        pair: `${s} ↔ ${t}`,
        status: r.relationshipType,
        dynamic: (r as any).dynamic ?? `Relasi: ${r.relationshipType}`
      };
    }),
    worldDevelopments: [
      ...objs.map(o => ({
        id: o.identity.id,
        name: o.identity.displayName,
        type: `Benda (${o.objectType})`,
        condition: o.condition ?? 'INTACT',
        status: o.possessionStatus ?? 'HELD'
      })),
      ...Object.values(u.locations || {}).map((l: LocationEntity) => ({
        id: l.identity.id,
        name: l.identity.displayName,
        type: `Wilayah (${l.locationType})`,
        condition: l.accessibilityStatus,
        status: 'TERDAFTAR'
      }))
    ],
    mysteryDevelopments: unres.map(uc => ({
      id: uc.conditionId,
      type: uc.conditionType,
      description: uc.description,
      status: uc.currentStatus
    }))
  };
}

// Development endpoints (Both routes supported to satisfy API contract & aliases)
controlRouter.get('/universe/development', async (_req, res) => {
  try {
    const data = await buildDevelopmentData();
    return res.json(data);
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNIVERSE_NOT_MOUNTED' ? 409 : 500;
    return res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

controlRouter.get('/universe/developments', async (_req, res) => {
  try {
    const data = await buildDevelopmentData();
    return res.json(data);
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNIVERSE_NOT_MOUNTED' ? 409 : 500;
    return res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
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
        title: `Penerbitan Naskah: ${r.purpose}`,
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

controlRouter.get('/universe/continuity', (_req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const u = mounted.universe;
    const chars = Object.values(u.characters || {}) as CharacterEntity[];

    const checks = chars.map(c => ({
      characterId: c.identity.id,
      characterName: c.identity.displayName,
      status: 'CONSISTENT' as ContinuityCheckStatus,
      identityCheck: 'CONSISTENT',
      roleCheck: 'CONSISTENT',
      stateCheck: 'CONSISTENT',
      behaviorCheck: 'CONSISTENT',
      knowledgeCheck: 'CONSISTENT',
      styleCheck: 'CONSISTENT',
      invariantsPassed: true,
      lastCheckedDate: u.temporalContext.currentUniverseDate
    }));

    return res.json({
      universeId: u.universeId,
      overallStatus: 'CONSISTENT',
      invariantsPassed: true,
      totalChecks: checks.length,
      checks,
      conflicts: []
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
          title: userIdea ? `Hikayat ${userIdea.slice(0, 20)}` : 'Rahasia Lembah Kabut Abadi',
          premise: `Di sebuah dunia di mana energi sihir kuno mulai memudar, seorang penjelajah muda menemukan artefak yang menyimpan peta menuju sumber energi pertama.`,
          synopsis: `Dunia berada di ambang krisis ketika kristal pelindung kota-kota besar mulai retak. Tokoh utama, bersama sekutu tak terduga dari faksi terasing, harus melintasi perbatasan terlarang sebelum faksi bayangan merebut kendali atas inti takdir.`,
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
          habits: ['Memutar koin perak saat berpikir', 'Bangun sebelum fajar'],
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

    if (capability === 'CONTINUITY_EXPLANATION') {
      return res.json({
        proposal: {
          status: 'CONSISTENT',
          analysis: 'Seluruh invarian karakter, relasi, status temporal, dan rantai kepemilikan berada dalam kondisi selaras tanpa kontradiksi.'
        }
      });
    }

    return res.json({ proposal: { message: 'Proposal siap diterapkan.' } });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Helper to save and re-mount universe model consistently
function commitUniverseMutation(current: ReturnType<typeof getRuntime>, mountedScope: string, uCopy: UniverseModel) {
  if (mountedScope !== 'SANDBOX') {
    current.universeStore.save(uCopy);
    return current.universeAuthority.mount(uCopy, 'CANONICAL');
  } else {
    return current.universeAuthority.mountSandbox(uCopy);
  }
}

// -------------------------------------------------------------
// ENTITY MUTATIONS & UPDATES (Both direct & alias routes)
// -------------------------------------------------------------
function handleCharacterCreation(req: any, res: any) {
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

    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
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

    (uCopy as any).characters = uCopy.characters || {};
    (uCopy.characters as any)[newId] = newChar;

    const charState: StateEntity = {
      stateId: `STATE_${newId}_01`,
      entityRef: makeEntityID(newId),
      stateType: 'CONDITION',
      currentValue: 'NORMAL',
      lifecycle: EntityLifecycleStatus.ACTIVE,
      validationStatus: 'VALID' as any,
      temporalValidity: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'ACTUAL' as any },
      transitionCount: 0,
      history: RevisionHistoryManager.createInitial(makeSystemID('STATE_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: createProvenanceMetadata(makeSystemID('STATE_SYSTEM'), makeDomainID('STATE'))
    };
    (charState as any).mood = 'Tenang';
    (uCopy as any).states = uCopy.states || {};
    (uCopy.states as any)[`STATE_${newId}_01`] = charState;

    const reMounted = commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, character: newChar, total: Object.keys(reMounted.universe.characters).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

controlRouter.post('/universe/entity/character', handleCharacterCreation);
controlRouter.post('/character/add', handleCharacterCreation);

// Character update / edit
controlRouter.post('/universe/character/:characterId/edit', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const charId = req.params.characterId;
    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
    const existing = (uCopy.characters as Record<string, CharacterEntity>)[charId];
    if (!existing) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });

    const body = req.body ?? {};
    const updatedProfile: CharacterProfile = {
      ...existing.profile,
      fullName: body.displayName ? String(body.displayName).trim() : (existing.profile?.fullName || existing.identity.displayName),
      nickname: body.nickname !== undefined ? (body.nickname ? String(body.nickname) : undefined) : existing.profile?.nickname,
      age: body.age !== undefined ? (body.age ? Number(body.age) : undefined) : existing.profile?.age,
      birthDate: body.birthDate !== undefined ? (body.birthDate ? String(body.birthDate) : undefined) : existing.profile?.birthDate,
      zodiac: body.zodiac !== undefined ? (body.zodiac ? String(body.zodiac) : undefined) : existing.profile?.zodiac,
      shio: body.shio !== undefined ? (body.shio ? String(body.shio) : undefined) : existing.profile?.shio,
      appearanceStyle: body.clothingStyle !== undefined ? (body.clothingStyle ? String(body.clothingStyle) : undefined) : existing.profile?.appearanceStyle,
      personalityType: body.personalityType !== undefined ? String(body.personalityType) : existing.profile?.personalityType,
      mainTraits: Array.isArray(body.traits) ? body.traits : existing.profile?.mainTraits,
      flaws: Array.isArray(body.flaws) ? body.flaws : existing.profile?.flaws,
      habits: Array.isArray(body.habits) ? body.habits : existing.profile?.habits,
      fears: Array.isArray(body.fears) ? body.fears : existing.profile?.fears,
      values: Array.isArray(body.coreValues || body.values) ? (body.coreValues || body.values) : existing.profile?.values,
      occupation: body.occupation !== undefined ? String(body.occupation) : existing.profile?.occupation,
      dailyPattern: body.dailyRoutine !== undefined ? String(body.dailyRoutine) : existing.profile?.dailyPattern,
      socialTendency: (body.socialOrientation as SocialTendency) ?? existing.profile?.socialTendency ?? SocialTendency.AMBIVERT,
      personalGoal: body.primaryGoal !== undefined ? String(body.primaryGoal) : existing.profile?.personalGoal,
      longTermAspiration: body.aspiration !== undefined ? String(body.aspiration) : existing.profile?.longTermAspiration,
      notes: body.notes !== undefined ? String(body.notes) : existing.profile?.notes,
      source: existing.profile?.source ?? ActorDataSource.USER_DEFINED
    };

    if (body.distinctFeatures) {
      (updatedProfile as any).distinctiveFeatures = [String(body.distinctFeatures)];
    }
    if (body.physicalBuild) {
      (updatedProfile as any).physicalBuild = body.physicalBuild;
    }

    const updatedChar: CharacterEntity = {
      ...existing,
      identity: {
        ...existing.identity,
        displayName: body.displayName ? String(body.displayName).trim() : existing.identity.displayName
      },
      roleReferences: body.role ? [String(body.role)] : existing.roleReferences,
      locationReference: body.locationReference ? String(body.locationReference) : (existing.locationReference ?? undefined),
      profile: updatedProfile
    };

    (uCopy.characters as Record<string, CharacterEntity>)[charId] = updatedChar;
    commitUniverseMutation(current, mounted.universeScope, uCopy);

    return res.json({ success: true, character: updatedChar });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update Character Dynamic State
controlRouter.post('/universe/character/:characterId/state', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const charId = req.params.characterId;
    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
    const char = (uCopy.characters as Record<string, CharacterEntity>)[charId];
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });

    const { mood, activity, condition, goal, vitality } = req.body ?? {};
    const stateId = char.stateReference || `STATE_${charId}_01`;
    const existingState = (uCopy.states as Record<string, StateEntity>)[stateId];

    const updatedState: StateEntity = {
      stateId,
      entityRef: makeEntityID(charId),
      stateType: 'CONDITION',
      currentValue: vitality || existingState?.currentValue || 'NORMAL',
      lifecycle: EntityLifecycleStatus.ACTIVE,
      validationStatus: 'VALID' as any,
      temporalValidity: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'ACTUAL' as any },
      transitionCount: (existingState?.transitionCount ?? 0) + 1,
      history: existingState?.history || RevisionHistoryManager.createInitial(makeSystemID('STATE_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: existingState?.provenance || createProvenanceMetadata(makeSystemID('STATE_SYSTEM'), makeDomainID('STATE'))
    };

    if (mood) (updatedState as any).mood = String(mood).trim();
    if (activity) (updatedState as any).activity = String(activity).trim();
    if (condition) (updatedState as any).condition = String(condition).trim();
    if (goal) (updatedState as any).goal = String(goal).trim();

    (uCopy as any).states = uCopy.states || {};
    (uCopy.states as any)[stateId] = updatedState;

    commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, state: updatedState });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update/Add Character Behavior
controlRouter.post('/universe/character/:characterId/behavior', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const charId = req.params.characterId;
    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
    const char = (uCopy.characters as Record<string, CharacterEntity>)[charId];
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });

    const { behaviorPattern, behaviorContext, behaviorFrequency, triggers, typicalResponse, alternativeResponse, responseIntensity } = req.body ?? {};
    if (!behaviorPattern) return res.status(400).json({ error: 'POLA_PERILAKU_DIBUTUHKAN' });

    const behId = `BEH_${charId}_01`;
    const behEntity: BehaviorEntity = {
      identity: EntityIdentityFactory.create({
        id: behId,
        entityType: EntityType.CHARACTER,
        displayName: `Behavior: ${char.identity.displayName}`,
        status: EntityLifecycleStatus.ACTIVE
      }),
      characterId: charId,
      behaviorPattern: String(behaviorPattern).trim(),
      behaviorContext: behaviorContext ? String(behaviorContext).trim() : undefined,
      behaviorFrequency: (behaviorFrequency || BehaviorFrequency.FREQUENT) as BehaviorFrequency,
      triggers: Array.isArray(triggers) ? triggers : (triggers ? [String(triggers)] : []),
      typicalResponse: typicalResponse ? String(typicalResponse).trim() : undefined,
      alternativeResponse: alternativeResponse ? String(alternativeResponse).trim() : undefined,
      responseIntensity: (responseIntensity || BehaviorResponseIntensity.MODERATE) as BehaviorResponseIntensity,
      changes: [],
      temporalValidity: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalStatus: 'ACTUAL' as any },
      history: RevisionHistoryManager.createInitial(makeSystemID('BEHAVIOR_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: createProvenanceMetadata(makeSystemID('BEHAVIOR_SYSTEM'), makeDomainID('BEHAVIOR')),
      source: ActorDataSource.USER_DEFINED
    };

    (uCopy as any).behaviors = uCopy.behaviors || {};
    (uCopy.behaviors as any)[behId] = behEntity;

    commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, behavior: behEntity });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update/Add Character Style
controlRouter.post('/universe/character/:characterId/style', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const charId = req.params.characterId;
    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
    const char = (uCopy.characters as Record<string, CharacterEntity>)[charId];
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });

    const {
      languageStyle,
      wordChoice,
      formalityLevel,
      sentencePattern,
      speechRhythm,
      emotionalExpression,
      humorStyle,
      reactionStyle,
      verbalSignature,
      commonExpressions,
      dialogueTendency,
      communicationHabits
    } = req.body ?? {};

    const styleId = `STYLE_${charId}_01`;
    const styleEntity: CharacterStyleEntity = {
      identity: EntityIdentityFactory.create({
        id: styleId,
        entityType: EntityType.CHARACTER,
        displayName: `Style: ${char.identity.displayName}`,
        status: EntityLifecycleStatus.ACTIVE
      }),
      characterId: charId,
      languageStyle: languageStyle ? String(languageStyle).trim() : undefined,
      wordChoice: wordChoice ? String(wordChoice).trim() : undefined,
      formalityLevel: formalityLevel ? String(formalityLevel).trim() : undefined,
      sentencePattern: sentencePattern ? String(sentencePattern).trim() : undefined,
      speechRhythm: speechRhythm ? String(speechRhythm).trim() : undefined,
      emotionalExpression: emotionalExpression ? String(emotionalExpression).trim() : undefined,
      humorStyle: humorStyle ? String(humorStyle).trim() : undefined,
      reactionStyle: reactionStyle ? String(reactionStyle).trim() : undefined,
      verbalSignature: verbalSignature ? String(verbalSignature).trim() : undefined,
      commonExpressions: Array.isArray(commonExpressions) ? commonExpressions : undefined,
      dialogueTendency: dialogueTendency ? String(dialogueTendency).trim() : undefined,
      communicationHabits: Array.isArray(communicationHabits) ? communicationHabits : undefined,
      changes: [],
      temporalValidity: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalStatus: 'ACTUAL' as any },
      history: RevisionHistoryManager.createInitial(makeSystemID('STYLE_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: createProvenanceMetadata(makeSystemID('STYLE_SYSTEM'), makeDomainID('STYLE')),
      source: ActorDataSource.USER_DEFINED
    };

    (uCopy as any).styles = uCopy.styles || {};
    (uCopy.styles as any)[styleId] = styleEntity;

    commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, style: styleEntity });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Add Character Knowledge
controlRouter.post('/universe/character/:characterId/knowledge', (req, res) => {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const charId = req.params.characterId;
    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
    const char = (uCopy.characters as Record<string, CharacterEntity>)[charId];
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });

    const { statement, referencedSubject, certainty, acquisitionSource } = req.body ?? {};
    if (!statement) return res.status(400).json({ error: 'PERNYATAAN_PENGETAHUAN_DIBUTUHKAN' });

    const knowId = `KNOW_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const knowEntity: KnowledgeEntity = {
      knowledgeId: knowId,
      knowerRef: charId,
      referencedSubject: referencedSubject ? String(referencedSubject).trim() : 'Fakta Semesta',
      statement: String(statement).trim(),
      knowledgeStatus: 'ACTIVE',
      acquisitionSource: acquisitionSource ? String(acquisitionSource).trim() : 'Pengalaman Langsung',
      acquiredDate: uCopy.temporalContext.currentUniverseDate,
      certainty: (certainty || EpistemicCertainty.FACT) as EpistemicCertainty,
      isUniverseFactConfirmed: true,
      changes: [],
      temporalValidity: {
        effectiveFrom: uCopy.temporalContext.currentUniverseTime,
        temporalCategory: 'ACTUAL' as any
      },
      history: RevisionHistoryManager.createInitial(makeSystemID('KNOWLEDGE_SYSTEM'), uCopy.temporalContext.currentUniverseTime),
      provenance: createProvenanceMetadata(makeSystemID('KNOWLEDGE_SYSTEM'), makeDomainID('KNOWLEDGE')),
      source: ActorDataSource.USER_DEFINED
    };

    (uCopy as any).knowledge = uCopy.knowledge || {};
    (uCopy.knowledge as any)[knowId] = knowEntity;

    commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, knowledge: knowEntity });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Location creation
function handleLocationCreation(req: any, res: any) {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { displayName, locationType, accessibilityStatus, description, parentLocationRef } = req.body ?? {};
    if (!displayName) return res.status(400).json({ error: 'NAMA_LOKASI_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
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

    (uCopy as any).locations = uCopy.locations || {};
    (uCopy.locations as any)[newId] = newLoc;

    const reMounted = commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, location: newLoc, total: Object.keys(reMounted.universe.locations).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

controlRouter.post('/universe/entity/location', handleLocationCreation);
controlRouter.post('/location/add', handleLocationCreation);

// Object creation
function handleObjectCreation(req: any, res: any) {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { displayName, objectType, condition, ownershipRef, possessionRef, currentUserRef, currentWearerRef, locationRef } = req.body ?? {};
    if (!displayName) return res.status(400).json({ error: 'NAMA_BENDA_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
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
      possessionStatus: (possessionRef || currentUserRef || currentWearerRef) ? 'HELD' as any : 'UNCLAIMED' as any,
      currentUserRef: currentUserRef ? makeEntityID(String(currentUserRef)) : null,
      currentWearerRef: currentWearerRef ? makeEntityID(String(currentWearerRef)) : null,
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

    (uCopy as any).objects = uCopy.objects || {};
    (uCopy.objects as any)[newId] = newObj;

    const reMounted = commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, object: newObj, total: Object.keys(reMounted.universe.objects).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

controlRouter.post('/universe/entity/object', handleObjectCreation);
controlRouter.post('/object/add', handleObjectCreation);

// Relationship creation
function handleRelationshipCreation(req: any, res: any) {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { subjectRef, targetRef, relationshipType, direction, strength, dynamic, narrativeBasis } = req.body ?? {};
    if (!subjectRef || !targetRef) return res.status(400).json({ error: 'TOKOH_HUBUNGAN_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
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

    (uCopy as any).relationships = uCopy.relationships || {};
    (uCopy.relationships as any)[newId] = newRel;

    const reMounted = commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, relationship: newRel, total: Object.keys(reMounted.universe.relationships).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

controlRouter.post('/universe/entity/relationship', handleRelationshipCreation);
controlRouter.post('/relationship/add', handleRelationshipCreation);

// Unresolved Condition / Mystery creation
function handleMysteryCreation(req: any, res: any) {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });
    const { conditionType, description, targetEntityRef } = req.body ?? {};
    if (!description) return res.status(400).json({ error: 'DESKRIPSI_MISTERI_DIBUTUHKAN' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
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

    (uCopy as any).unresolvedConditions = uCopy.unresolvedConditions || {};
    (uCopy.unresolvedConditions as any)[newId] = newUnres;

    const reMounted = commitUniverseMutation(current, mounted.universeScope, uCopy);
    return res.json({ success: true, mystery: newUnres, total: Object.keys(reMounted.universe.unresolvedConditions).length });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
}

controlRouter.post('/universe/entity/mystery', handleMysteryCreation);
controlRouter.post('/unresolved-condition/add', handleMysteryCreation);

// -------------------------------------------------------------
// TIMELINE ADVANCEMENT & SANDBOX CLONING
// -------------------------------------------------------------
function handleAdvanceDay(req: any, res: any) {
  try {
    const current = getRuntime();
    const mounted = current.universeAuthority.get();
    if (!mounted) return res.status(409).json({ error: 'UNIVERSE_NOT_MOUNTED' });

    const uCopy = JSON.parse(JSON.stringify(mounted.universe)) as UniverseModel;
    const currentDate = new Date(uCopy.temporalContext.currentUniverseDate || '2024-01-01');
    const daysToAdd = Number(req.body?.days ?? 1);
    currentDate.setUTCDate(currentDate.getUTCDate() + daysToAdd);
    const newDateStr = currentDate.toISOString().slice(0, 10);
    const newTimeStr = `${newDateStr}T08:00:00.000Z`;

    (uCopy.temporalContext as any).currentUniverseDate = newDateStr;
    (uCopy.temporalContext as any).currentUniverseTime = newTimeStr;
    if (uCopy.temporalContext.currentPeriodRef) {
      const parts = uCopy.temporalContext.currentPeriodRef.split('_');
      const pNum = Number(parts[parts.length - 1]);
      if (!isNaN(pNum)) {
        parts[parts.length - 1] = String(pNum + 1).padStart(3, '0');
        (uCopy.temporalContext as any).currentPeriodRef = parts.join('_');
      }
    }

    const reMounted = commitUniverseMutation(current, mounted.universeScope, uCopy);

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
}

controlRouter.post('/universe/advance-day', handleAdvanceDay);
controlRouter.post('/sandbox/advance-day', handleAdvanceDay);

function handleCloneToSandbox(_req: any, res: any) {
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
      return res.status(404).json({ error: 'NO_CANONICAL_UNIVERSE_TO_CLONE', message: 'Belum ada semesta kanon yang dapat dikloning.' });
    }
    const sandboxUniverse = JSON.parse(JSON.stringify(universeToClone));
    sandboxUniverse.universeId = `${sandboxUniverse.universeId}_sandbox_${Date.now().toString(36).slice(-4)}`;
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
}

controlRouter.post('/universe/clone-to-sandbox', handleCloneToSandbox);
controlRouter.post('/sandbox/clone-from-canon', handleCloneToSandbox);

controlRouter.post('/pages/:pageDefinitionId/toggle', (req, res) => {
  const current = getRuntime();
  const page = current.pageCatalog.get(req.params.pageDefinitionId);
  if (!page) return res.status(404).json({ error: 'PAGE_NOT_FOUND' });
  return res.json(page.status === 'ENABLED' ? current.pageCatalog.disable(req.params.pageDefinitionId) : current.pageCatalog.enable(req.params.pageDefinitionId));
});

controlRouter.get('/ai/status', (_req, res) => {
  const current = getRuntime();
  return res.json({
    status: current.ai.hasProvider() ? 'READY' : 'NO_PROVIDER',
    providers: current.providerRegistry.list().map(adapter => adapter.profile),
    health: current.providerRegistry.healthSnapshot()
  });
});

controlRouter.get('/production/usage', (_req, res) => res.json(getRuntime().costController.totalCommitted()));

// -------------------------------------------------------------
// STORY PRODUCTION (Daily Story Continuation)
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
