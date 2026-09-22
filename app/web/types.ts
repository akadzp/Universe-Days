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

export type View =
  | 'home'
  | 'universe'
  | 'production'
  | 'scheduler'
  | 'pages'
  | 'history'
  | 'ai'
  | 'system';
