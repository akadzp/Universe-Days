export type NavTab = 'dashboard' | 'actor-actress' | 'cerita' | 'reserved' | 'profile';

export interface UniverseStatistics {
  charactersCount: number;
  locationsCount: number;
  objectsCount: number;
  relationshipsCount: number;
  knowledgeCount: number;
  statesCount: number;
  eventsCount: number;
  processesCount: number;
  unresolvedCount: number;
}

export interface CharacterItem {
  identity: {
    id: string;
    entityType: string;
    displayName: string;
    status: string;
    tags?: string[];
  };
  roleReferences?: string[];
  stateReference?: string | null;
  knowledgeReferences?: string[];
  relationshipReferences?: string[];
  locationReference?: string | null;
  temporalValidity?: {
    effectiveFrom: string;
    effectiveTo?: string;
    temporalCategory: string;
  };
  continuityReference?: string;
  history?: {
    currentRevisionId: string;
    revisionsCount?: number;
    initialRevisionTimestamp?: string;
  };
  provenance?: {
    ownerSystemId: string;
    domainId: string;
    createdAt?: string;
  };
}

export interface LocationItem {
  identity: {
    id: string;
    entityType: string;
    displayName: string;
    status: string;
  };
  locationType: string;
  parentLocationRef?: string | null;
  adjacentLocationRefs?: string[];
  containedLocationRefs?: string[];
  accessibilityStatus: string;
}

export interface ObjectItem {
  identity: {
    id: string;
    entityType: string;
    displayName: string;
    status: string;
  };
  objectName: string;
  aliases?: string[];
  objectType: string;
  category: string;
  ownershipRef?: string | null;
  possessionRef?: string | null;
  possessionStatus?: string;
  locationRef?: string | null;
  accessStatus?: string;
  condition?: string;
}

export interface RelationshipItem {
  relationshipId: string;
  subjectRef: string;
  targetRef: string;
  relationshipType: string;
  direction: string;
  status: string;
  strength?: number;
}

export interface KnowledgeItem {
  knowledgeId: string;
  knowerRef: string;
  referencedSubject: string;
  statement: string;
  acquisitionSource: string;
  knowledgeStatus: string;
  certainty: string;
  isUniverseFactConfirmed: boolean;
}

export interface EventItem {
  eventId: string;
  eventType: string;
  title: string;
  participantRefs: string[];
  objectRefs: string[];
  locationRef: string;
  temporalInterval?: {
    start: string;
    temporalCategory: string;
  };
  status: string;
}

export interface ProcessItem {
  processId: string;
  processType: string;
  title: string;
  participantRefs: string[];
  objectRefs: string[];
  locationRef: string;
  startTime: string;
  currentStatus: string;
  progressRatio: number;
}

export interface UnresolvedItem {
  conditionId: string;
  conditionType: string;
  description: string;
  ownerDomain: string;
  targetEntityRef: string;
  currentStatus: string;
}

export interface AuthoritativeUniverse {
  universeId: string;
  universeDate: string;
  universeTime: string;
  scope: string;
  statistics: UniverseStatistics;
  temporalContext: {
    currentUniverseDate: string;
    currentUniverseTime: string;
    temporalStatus?: string;
  };
  characters: Record<string, CharacterItem>;
  locations: Record<string, LocationItem>;
  objects: Record<string, ObjectItem>;
  relationships: Record<string, RelationshipItem>;
  knowledge: Record<string, KnowledgeItem>;
  states: Record<string, any>;
  events: Record<string, EventItem>;
  processes: Record<string, ProcessItem>;
  unresolvedConditions: Record<string, UnresolvedItem>;
}

export interface DeploymentReadinessReport {
  status: 'READY' | 'DEGRADED' | 'UNREADY';
  architecturePhase: number;
  timestamp: string;
  engine: string;
  subsystems: {
    catalog: { status: string; total: number; enabled: number };
    providers: { status: string; connected: number; health: Record<string, unknown> };
    storage: { status: string; rootDir: string };
    universePersistence: { status: string; rootDir: string; mounted: boolean; storedUniverses: number; startupLoadError: string | null };
    scheduler: { status: string; activeSchedules: number; jobStoreRoot: string };
    costController: { status: string; totalCommittedCost: number };
    hardening: { status: string };
  };
  checks: {
    engineAuthoritative: boolean;
    persistenceAccessible: boolean;
    universePersistenceWired: boolean;
    startupUniverseLoadClean: boolean;
    providersAvailable: boolean;
    outputValidationActive: boolean;
    schedulerDispatcherWired: boolean;
  };
}

export interface ProductionRunResponse {
  success: boolean;
  runId: string;
  status: string;
  storyPackage?: {
    storyId: string;
    storyScope: string;
    trigger: any;
    narrativeBeats?: Array<{
      beatId: string;
      title: string;
      focus: string;
      events?: string[];
      characters?: string[];
    }>;
    canonStatus?: string;
  };
  renderResult?: {
    content?: string;
    format?: string;
    renderedAt?: string;
    wordCount?: number;
    metadata?: Record<string, any>;
  };
  traces?: Array<{
    phase: string;
    timestamp: string;
    status: string;
    message?: string;
  }>;
  finalization?: {
    status: string;
    timestamp?: string;
    canonCommitted?: boolean;
  };
  error?: string;
  message?: string;
}
