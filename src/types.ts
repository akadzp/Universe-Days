export type RootNav = 'dashboard' | 'aktor' | 'cerita' | 'cocokkan' | 'dunia';

export type SidebarNav =
  | 'tata_kelola'
  | 'mesin_produksi'
  | 'waktu_semesta'
  | 'diagnostik'
  | 'instance_semesta'
  | 'audit_ledger';

export type ActiveView = RootNav | SidebarNav;

export type DashboardSection = 'beranda' | 'hari_ini' | 'aktivitas';
export type AktorSection = 'semua_aktor' | 'karakter' | 'grup' | 'buat_karakter' | 'riwayat';
export type CeritaSection = 'hari_ini' | 'daily_story' | 'daily_page' | 'ide' | 'riwayat';
export type CocokkanSection = 'ringkasan' | 'cerita' | 'karakter' | 'dunia' | 'masalah';
export type DuniaSection = 'ringkasan' | 'tempat' | 'benda' | 'hubungan' | 'pengetahuan' | 'peristiwa';

export interface UniverseData {
  universeId: string;
  universeDate: string;
  universeTime: string;
  scope: string;
  statistics: {
    charactersCount: number;
    locationsCount: number;
    objectsCount: number;
    relationshipsCount: number;
    knowledgeCount: number;
    statesCount: number;
    eventsCount: number;
    processesCount: number;
    unresolvedCount: number;
  };
  temporalContext: {
    currentUniverseDate: string;
    currentUniverseTime: string;
  };
  characters: Record<string, any>;
  locations: Record<string, any>;
  objects: Record<string, any>;
  relationships: Record<string, any>;
  knowledge: Record<string, any>;
  states: Record<string, any>;
  events: Record<string, any>;
  processes: Record<string, any>;
  unresolvedConditions: Record<string, any>;
}

export interface ReadinessReport {
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
  checks: Record<string, boolean>;
}

export interface ProductionRunRecord {
  runId: string;
  status: string;
  storyPackage?: any;
  renderResult?: any;
  traces: Array<{
    stage: string;
    status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'STARTED';
    detail?: string;
  }>;
  finalization?: any;
}
