export interface ComponentStatus {
  id: string;
  name: string;
  status: string;
  detail: string;
}

export interface ControlOverview {
  project: string;
  uiPhase: string;
  runtime: {
    status: string;
    architecturePhase: number;
    productionRoot: string;
  };
  universe: {
    status: string;
    universeId: string | null;
    universeDate: string | null;
    periodId: string | null;
    universeScope?: string | null;
    storedCurrent?: { universeId: string; universeScope: string } | null;
    storedCount?: number;
    storageRoot?: string;
    startupLoadError?: string | null;
    message: string;
    storyMetadata?: {
      title?: string;
      premise?: string;
      synopsis?: string;
      genre?: string;
      theme?: string;
      initialConflict?: string;
    };
  };
  daily: { status: string; message: string };
  story: { status: string; storyId: string | null; message: string };
  pages: {
    status: string;
    total: number;
    enabled: number;
    disabled: number;
    catalogVersion: number;
  };
  production: { status: string; lastRunId: string | null; message: string };
  models: { connected: number; providerNeutral: boolean };
  ai: {
    status: string;
    providers: Array<{
      providerId: string;
      modelId: string;
      tier: string;
      structuredOutput: boolean;
    }>;
  };
  components: ComponentStatus[];
}

export interface PageDefinition {
  pageDefinitionId: string;
  universeId: string;
  universeScope: string;
  pageKey: string;
  pageScope: string;
  status: 'ENABLED' | 'DISABLED';
  revision: number;
  priority: number;
  tags: string[];
}

export interface ProductionRunRecord {
  runId: string;
  status: 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'CACHED' | string;
  universeId?: string;
  universeScope?: string;
  universeDate?: string;
  purpose: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  providerId?: string;
  modelId?: string;
  output?: any;
  reason?: string;
  cached?: boolean;
}

export interface ProviderHealthInfo {
  providerId: string;
  modelId: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  lastChecked: string;
  totalRequests: number;
  totalSuccesses: number;
}

export interface DeploymentReadiness {
  status: 'READY' | 'DEGRADED' | 'UNREADY';
  architecturePhase: number;
  timestamp: string;
  engine: string;
  subsystems: Record<
    string,
    {
      status: string;
      detail?: string;
      rootDir?: string;
      total?: number;
      enabled?: number;
      storedUniverses?: number;
      mounted?: boolean;
      startupLoadError?: string | null;
      activeSchedules?: number;
      jobStoreRoot?: string;
    }
  >;
  checks: Record<string, boolean>;
}

export interface UsageSummary {
  runId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface UniverseStorage {
  mounted: boolean;
  mountedUniverseId: string | null;
  mountedUniverseDate: string | null;
  mountedUniverseScope: string | null;
  storedCurrent: { universeId: string; universeScope: string } | null;
  storageRootDir: string;
  storedUniverseIds: string[];
}

export interface ScheduleDefinition {
  scheduleId: string;
  pageDefinitionId: string;
  universeId: string;
  universeScope: string;
  cadence: string;
  dayOffset?: number;
  customFilter?: string;
  enabled: boolean;
  priority: number;
}

export interface ScheduledJobRecord {
  jobId: string;
  scheduleId: string;
  pageDefinitionId: string;
  universeDate: string;
  priority: number;
  status: string;
  attempt: number;
  universeTime: string;
  productionRunId?: string;
  reason?: string;
}

export interface ToastState {
  tone: 'ok' | 'error' | 'info';
  message: string;
}

export interface UniverseCharacter {
  id: string;
  displayName: string;
  status: string;
  background?: string;
  personalityType?: string;
  traits: string[];
  flaws?: string[];
  role: string;
  occupation?: string;
  locationReference?: string | null;
  alive: boolean;
  profile?: any;
}

export interface UniverseLocation {
  id: string;
  displayName: string;
  description?: string;
  locationType: string;
  accessibilityStatus: string;
  parentLocationRef?: string | null;
  containedLocationRefs?: string[];
  adjacentLocationRefs?: string[];
}

export interface UniverseObject {
  id: string;
  displayName: string;
  objectType: string;
  category?: string;
  possessionStatus: string;
  condition: string;
  currentLocationRef?: string | null;
  holderActorRef?: string | null;
  ownerActorRef?: string | null;
}

export interface UniverseRelationship {
  id: string;
  sourceActorRef: string;
  targetActorRef: string;
  relationshipType: string;
  direction?: string;
  strength?: number;
  status?: string;
  dynamic?: string;
}

export interface UniverseUnresolvedCondition {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
}

export interface UniverseDetails {
  mounted: boolean;
  universeId?: string;
  universeScope?: string;
  storyMetadata?: {
    title?: string;
    premise?: string;
    synopsis?: string;
    genre?: string;
    theme?: string;
    initialConflict?: string;
  };
  temporal?: {
    currentUniverseDate: string;
    currentUniverseTime: string;
    periodRef?: string;
    calendarSystem: string;
  } | null;
  characters: UniverseCharacter[];
  locations: UniverseLocation[];
  objects: UniverseObject[];
  relationships: UniverseRelationship[];
  unresolvedConditions: UniverseUnresolvedCondition[];
}

export interface CharacterWorkspaceData {
  id: string;
  identity: {
    id: string;
    displayName: string;
    nickname?: string;
    status: string;
    tags: string[];
    age?: number;
    birthDate?: string;
    zodiac?: string;
    shio?: string;
  };
  appearance: {
    distinctFeatures?: string;
    physicalBuild?: string;
    clothingStyle?: string;
  };
  personality: {
    personalityType?: string;
    traits: string[];
    flaws: string[];
    habits?: string[];
    fears?: string[];
    values?: string[];
  };
  life: {
    occupation?: string;
    hobbies: string[];
    interests: string[];
    skills: string[];
    dailyRoutine?: string;
  };
  social: {
    socialOrientation: string;
  };
  narrative: {
    innerWound?: string;
    primaryGoal?: string;
    aspiration?: string;
    secretBackstory?: string;
    notes?: string;
  };
  actor: {
    role: string;
    level?: string;
    group?: string;
    gender?: string;
    entityType: string;
    source?: string;
  };
  currentState: {
    vitality: string;
    mood?: string;
    activity?: string;
    condition?: string;
    goal?: string;
    status: string;
    transitionCount?: number;
    stateId?: string;
  };
  behavior?: {
    behaviorPattern: string;
    behaviorContext?: string;
    behaviorFrequency?: string;
    triggers?: string[];
    typicalResponse?: string;
    alternativeResponse?: string;
    responseIntensity?: string;
    changes?: any[];
  } | null;
  style?: {
    languageStyle?: string;
    wordChoice?: string;
    formalityLevel?: string;
    sentencePattern?: string;
    speechRhythm?: string;
    emotionalExpression?: string;
    humorStyle?: string;
    reactionStyle?: string;
    verbalSignature?: string;
    commonExpressions?: string[];
    dialogueTendency?: string;
    communicationHabits?: string[];
  } | null;
  location: {
    id: string;
    displayName: string;
    locationType: string;
    description?: string;
    accessibilityStatus?: string;
  } | null;
  relationships: Array<{
    id: string;
    otherCharacterId: string;
    otherCharacterName: string;
    relationshipType: string;
    direction: string;
    strength: number;
    status: string;
    dynamic: string;
    narrativeBasis: string;
  }>;
  knowledge: Array<{
    id: string;
    statement: string;
    subject?: string;
    certainty: string | number;
    acquisitionSource?: string;
    acquiredDate?: string;
    isUniverseFactConfirmed?: boolean;
  }>;
  possessions: Array<{
    id: string;
    displayName: string;
    objectType: string;
    isOwner: boolean;
    isHolder: boolean;
    isUser?: boolean;
    isWearer?: boolean;
    condition: string;
    possessionStatus: string;
  }>;
  continuity: {
    status: string;
    lastCheckedDate: string;
    invariantsPassed: boolean;
    conflictsCount?: number;
  };
  timeline: Array<{
    date: string;
    event: string;
  }>;
}

export interface DailyContextData {
  universeDate: string;
  universeTime: string;
  periodRef: string;
  initialConditions: string[];
  activeCharactersCount: number;
  activeLocationsCount: number;
  activeObjectsCount: number;
  openMysteriesCount: number;
  availableDevelopments: string[];
}

export interface DevelopmentData {
  currentDate: string;
  storyDevelopments: Array<{
    runId: string;
    date: string;
    purpose: string;
    status: string;
    summary: string;
  }>;
  characterDevelopments: Array<{
    characterId: string;
    name: string;
    role: string;
    currentGoal: string;
    personality: string;
  }>;
  relationshipDevelopments: Array<{
    id: string;
    pair: string;
    status: string;
    dynamic: string;
  }>;
  worldDevelopments: Array<{
    id: string;
    name: string;
    type: string;
    condition: string;
    status: string;
  }>;
  mysteryDevelopments: Array<{
    id: string;
    type: string;
    description: string;
    status: string;
  }>;
}

export interface TimelineData {
  universeId: string;
  currentDate: string;
  items: Array<{
    date: string;
    title: string;
    category: string;
    description: string;
  }>;
}

export type View =
  | 'story'
  | 'universe'
  | 'character'
  | 'sandbox'
  | 'history'
  | 'studio'
  // Legacy mappings for backwards compatibility
  | 'home'
  | 'production'
  | 'pages'
  | 'scheduler'
  | 'ai'
  | 'system';
