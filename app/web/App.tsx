import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Coins,
  Cpu,
  Database,
  Eye,
  FileCode2,
  HardDrive,
  Layers3,
  Play,
  PlusCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Workflow,
  X,
  XCircle
} from 'lucide-react';

interface ComponentStatus {
  id: string;
  name: string;
  status: 'WIRED' | 'NO_PROVIDER' | 'READY' | 'CONNECTED';
  detail: string;
}

interface ControlOverview {
  project: string;
  uiPhase: string;
  runtime: { status: string; architecturePhase: number; productionRoot: string };
  universe: {
    status: string;
    universeId: string | null;
    universeDate: string | null;
    periodId: string | null;
    universeScope?: string | null;
    message: string;
  };
  daily: { status: string; message: string };
  story: { status: string; storyId: string | null; message: string };
  pages: { status: string; total: number; enabled: number; disabled: number; catalogVersion: number };
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

interface PageDefinition {
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

interface ProductionRunRecord {
  runId: string;
  status: 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'CACHED';
  universeId?: string;
  universeScope?: string;
  purpose: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  providerId?: string;
  modelId?: string;
  output?: unknown;
  reason?: string;
  cached?: boolean;
}

interface ProviderHealthInfo {
  providerId: string;
  modelId: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  lastChecked: string;
  totalRequests: number;
  totalSuccesses: number;
}

interface DeploymentReadiness {
  status: 'READY' | 'DEGRADED' | 'UNREADY';
  architecturePhase: number;
  timestamp: string;
  engine: string;
  subsystems: Record<string, { status: string; detail?: string; rootDir?: string; total?: number; enabled?: number }>;
  checks: Record<string, boolean>;
}

interface UsageSummary {
  runId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

type View = 'overview' | 'universe' | 'pages' | 'production' | 'providers' | 'cost' | 'readiness';

const navItems: Array<{ id: View; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'universe', label: 'Universe & Daily', icon: Database },
  { id: 'pages', label: 'Page Catalog', icon: Layers3 },
  { id: 'production', label: 'Production Runner', icon: Workflow },
  { id: 'providers', label: 'AI Providers', icon: Cpu },
  { id: 'cost', label: 'Cost & Tokens', icon: Coins },
  { id: 'readiness', label: 'Readiness & Deploy', icon: Server }
];

function statusTone(status: string): string {
  if (['WIRED', 'READY', 'CONNECTED', 'INITIALIZED', 'COMPLETED', 'HEALTHY', 'ENABLED'].includes(status)) {
    return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
  }
  if (['NO_PROVIDER', 'DEGRADED', 'CACHED', 'WAITING_FOR_UNIVERSE', 'WAITING_FOR_DAILY_CONTEXT'].includes(status)) {
    return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
  }
  if (['EMPTY', 'NOT_RUN', 'NOT_INITIALIZED', 'DISABLED', 'UNREADY'].includes(status)) {
    return 'text-stone-400 bg-stone-900 border-stone-800';
  }
  if (['FAILED', 'BLOCKED', 'UNAVAILABLE'].includes(status)) {
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  }
  return 'text-sky-300 bg-sky-400/10 border-sky-400/20';
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider ${statusTone(
      status
    )}`}
  >
    {['WIRED', 'READY', 'CONNECTED', 'INITIALIZED', 'COMPLETED', 'HEALTHY', 'ENABLED'].includes(status) ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : ['NO_PROVIDER', 'DEGRADED', 'CACHED'].includes(status) ? (
      <AlertCircle className="h-3 w-3" />
    ) : ['FAILED', 'BLOCKED'].includes(status) ? (
      <XCircle className="h-3 w-3" />
    ) : (
      <CircleDot className="h-3 w-3" />
    )}
    {status}
  </span>
);

export const App: React.FC = () => {
  const [data, setData] = useState<ControlOverview | null>(null);
  const [pages, setPages] = useState<PageDefinition[]>([]);
  const [runs, setRuns] = useState<ProductionRunRecord[]>([]);
  const [providerHealth, setProviderHealth] = useState<Record<string, ProviderHealthInfo>>({});
  const [readiness, setReadiness] = useState<DeploymentReadiness | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [view, setView] = useState<View>('overview');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState('');

  // Production runner form state
  const [runPurpose, setRunPurpose] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('DAILY_STORY');
  const [runInstruction, setRunInstruction] = useState('Generate daily chronicle synthesis for current universe epoch.');
  const [latestRunResult, setLatestRunResult] = useState<ProductionRunRecord | null>(null);
  const [inspectedRun, setInspectedRun] = useState<ProductionRunRecord | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [ovRes, pgRes, rnRes, aiRes, rdRes, usRes] = await Promise.all([
        fetch('/api/control/overview'),
        fetch('/api/control/pages'),
        fetch('/api/production/runs?limit=15'),
        fetch('/api/production/providers'),
        fetch('/api/production/readiness'),
        fetch('/api/control/production/usage')
      ]);

      if (ovRes.ok) setData(await ovRes.json());
      if (pgRes.ok) {
        const pData = await pgRes.json();
        setPages(pData.definitions || []);
      }
      if (rnRes.ok) {
        const rData = await rnRes.json();
        setRuns(rData.runs || []);
      }
      if (aiRes.ok) {
        const aData = await aiRes.json();
        setProviderHealth(aData.health || {});
      }
      if (rdRes.ok) setReadiness(await rdRes.json());
      if (usRes.ok) setUsage(await usRes.json());

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to communicate with engine backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const handleToggleUniverse = async () => {
    setActionLoading(true);
    try {
      if (data?.universe.status === 'READY') {
        await fetch('/api/control/universe/unmount', { method: 'POST' });
      } else {
        await fetch('/api/control/universe/mount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            universeId: 'UNIVERSE_PRIME',
            universeDate: '2026-03-22',
            periodId: 'PERIOD_CYCLE_01'
          })
        });
      }
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Universe state toggle failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedPages = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/control/pages/seed', { method: 'POST' });
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Page seeding failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePage = async (pageId: string) => {
    setActionLoading(true);
    try {
      await fetch(`/api/control/pages/${encodeURIComponent(pageId)}/toggle`, { method: 'POST' });
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Page toggle failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunProduction = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/control/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: runPurpose,
          userInstruction: runInstruction
        })
      });
      const result = await res.json();
      setLatestRunResult(result);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Production run request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const currentNav = navItems.find(item => item.id === view) ?? navItems[0];
  const wiredCount = useMemo(() => data?.components.filter(c => c.status === 'WIRED' || c.status === 'READY').length ?? 0, [data]);

  return (
    <div className="min-h-screen bg-[#09090b] text-stone-200 antialiased font-sans">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row border-x border-stone-800/80">
        {/* Sidebar */}
        <aside className="border-b border-stone-800/80 bg-stone-950/70 lg:w-64 lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="sticky top-0 p-5">
            {/* Brand */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-stone-100">Pocer Universe</h1>
                <div className="text-[10px] font-mono tracking-widest uppercase text-stone-500">Engine Phase 34</div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-all ${
                      active
                        ? 'bg-amber-400/10 text-amber-200 ring-1 ring-inset ring-amber-400/30 font-semibold'
                        : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-amber-300' : 'text-stone-400'}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 text-amber-400/60" />}
                  </button>
                );
              })}
            </nav>

            {/* Subsystem Summary Card */}
            <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/50 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-stone-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Hardening
                </span>
                <span className="text-emerald-400">Active</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Architecture</span>
                  <span className="font-mono text-stone-200">Phase 34 Root</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Modules Wired</span>
                  <span className="font-mono text-emerald-300">
                    {wiredCount}/{data?.components.length ?? 13}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Persistence</span>
                  <span className="font-mono text-stone-300">Atomic JSON</span>
                </div>
              </div>
            </div>

            {/* Quick Universe Mount Toggle */}
            <div className="mt-4 rounded-2xl border border-stone-800 bg-stone-900/30 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium text-stone-300">Authoritative Instance</div>
                  <div className="text-[10px] font-mono text-stone-500">{data?.universe.universeId ?? 'Unmounted'}</div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleUniverse}
                  disabled={actionLoading}
                  className="rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1 text-[11px] font-medium text-stone-300 hover:border-amber-400/50 hover:text-amber-200 transition-colors disabled:opacity-50"
                >
                  {data?.universe.status === 'READY' ? 'Unmount' : 'Mount'}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 min-w-0">
          {/* Header */}
          <header className="mb-6 flex flex-col gap-4 border-b border-stone-800/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-stone-400 mb-1.5">
                <span>Phase 34 Production Root</span>
                <span>/</span>
                <span className="text-amber-400">{currentNav.label}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">{currentNav.label}</h2>
              <p className="mt-1 text-xs text-stone-400">
                Authoritative deterministic engine state — page output is projection, AI is proposal-only.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void fetchAll()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-200 hover:border-stone-500 transition-all disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-300' : ''}`} />
                Refresh State
              </button>
            </div>
          </header>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
              <XCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Engine notice: </span>
                {error}
              </div>
              <button type="button" onClick={() => setError('')} className="text-stone-400 hover:text-stone-200">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* VIEW: OVERVIEW */}
          {view === 'overview' && data && (
            <div className="space-y-6">
              {/* Metric Grid */}
              <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" /> Runtime
                  </div>
                  <div className="text-xl font-bold text-stone-100">{data.runtime.status}</div>
                  <div className="mt-1 text-[11px] text-stone-400 font-mono">Phase {data.runtime.architecturePhase}</div>
                </div>

                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                    <Database className="h-3.5 w-3.5 text-sky-400" /> Universe
                  </div>
                  <div className="text-xl font-bold text-stone-100">{data.universe.status}</div>
                  <div className="mt-1 text-[11px] text-stone-400 font-mono">{data.universe.universeDate ?? 'No date'}</div>
                </div>

                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                    <Layers3 className="h-3.5 w-3.5 text-amber-400" /> Page Catalog
                  </div>
                  <div className="text-xl font-bold text-stone-100">
                    {data.pages.enabled}/{data.pages.total}
                  </div>
                  <div className="mt-1 text-[11px] text-stone-400">Enabled / Total Definitions</div>
                </div>

                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                    <Cpu className="h-3.5 w-3.5 text-violet-400" /> AI Adapters
                  </div>
                  <div className="text-xl font-bold text-stone-100">{data.models.connected}</div>
                  <div className="mt-1 text-[11px] text-stone-400">Provider-Neutral Gateway</div>
                </div>
              </div>

              {/* Authority & Pipeline Status Panels */}
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-sky-400/10 p-2 text-sky-400 border border-sky-400/20">
                        <Database className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-stone-100">Authoritative Universe</h3>
                    </div>
                    <StatusBadge status={data.universe.status} />
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed mb-4">{data.universe.message}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-stone-800/80 text-xs">
                    <span className="text-stone-400">Universe Scope</span>
                    <span className="font-mono text-stone-300">{data.universe.universeScope ?? 'GLOBAL'}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-amber-400/10 p-2 text-amber-400 border border-amber-400/20">
                        <Workflow className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-stone-100">Production Execution</h3>
                    </div>
                    <StatusBadge status={data.production.status} />
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed mb-4">{data.production.message}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-stone-800/80 text-xs">
                    <span className="text-stone-400">Last Execution</span>
                    <span className="font-mono text-stone-300">{data.production.lastRunId ? data.production.lastRunId.slice(0, 20) + '...' : 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Wired Components Registry */}
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-100">Phase 34 Platform Subsystems</h3>
                    <p className="text-xs text-stone-400">Full composition root components instantiated and verified.</p>
                  </div>
                  <StatusBadge status="CONNECTED" />
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.components.map(comp => (
                    <div key={comp.id} className="rounded-xl border border-stone-800/90 bg-stone-950/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-stone-200">{comp.name}</span>
                        <StatusBadge status={comp.status} />
                      </div>
                      <div className="mt-1.5 text-[11px] text-stone-400">{comp.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: UNIVERSE & DAILY */}
          {view === 'universe' && data && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-stone-100">Active Universe Context</h3>
                    <p className="text-xs text-stone-400">All downstream stories and pages project from this canonical state.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleUniverse}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {data.universe.status === 'READY' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {data.universe.status === 'READY' ? 'Unmount Active Universe' : 'Mount Canonical Universe'}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
                  <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
                    <span className="text-[10px] font-mono uppercase text-stone-400">Universe ID</span>
                    <div className="mt-1 font-mono text-sm font-semibold text-stone-200">{data.universe.universeId ?? '—'}</div>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
                    <span className="text-[10px] font-mono uppercase text-stone-400">Universe Date</span>
                    <div className="mt-1 font-mono text-sm font-semibold text-stone-200">{data.universe.universeDate ?? '—'}</div>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
                    <span className="text-[10px] font-mono uppercase text-stone-400">Period Epoch</span>
                    <div className="mt-1 font-mono text-sm font-semibold text-stone-200">{data.universe.periodId ?? '—'}</div>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
                    <span className="text-[10px] font-mono uppercase text-stone-400">Scope</span>
                    <div className="mt-1 font-mono text-sm font-semibold text-stone-200">{data.universe.universeScope ?? 'CANONICAL'}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-400" />
                      <h4 className="text-sm font-semibold text-stone-200">Daily Universe Pipeline</h4>
                    </div>
                    <StatusBadge status={data.daily.status} />
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{data.daily.message}</p>
                </div>

                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-amber-400" />
                      <h4 className="text-sm font-semibold text-stone-200">Daily Story Generator</h4>
                    </div>
                    <StatusBadge status={data.story.status} />
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{data.story.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PAGE CATALOG */}
          {view === 'pages' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-stone-100">Registered Page Definitions</h3>
                  <p className="text-xs text-stone-400">
                    Scalable page catalog for parallel production fan-out and scheduling.
                  </p>
                </div>
                {pages.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSeedPages}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Seed Standard Page Definitions
                  </button>
                )}
              </div>

              {pages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-800 p-8 text-center bg-stone-900/30">
                  <Layers3 className="mx-auto h-8 w-8 text-stone-600 mb-2" />
                  <div className="text-sm font-medium text-stone-300">No Page Definitions Registered</div>
                  <p className="mt-1 text-xs text-stone-500 max-w-md mx-auto">
                    The page infrastructure is wired and ready. Click &quot;Seed Standard Page Definitions&quot; to initialize sample canonical page projections.
                  </p>
                  <button
                    type="button"
                    onClick={handleSeedPages}
                    disabled={actionLoading}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition-all"
                  >
                    <PlusCircle className="h-4 w-4" /> Seed Standard Definitions
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {pages.map(page => (
                    <div
                      key={page.pageDefinitionId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-900/60 p-4 shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-semibold text-stone-100">{page.pageKey}</span>
                          <StatusBadge status={page.status} />
                          <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] font-mono text-stone-400">
                            P{page.priority}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-stone-400 flex items-center gap-2">
                          <span>Scope: {page.pageScope}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-stone-500">{page.pageDefinitionId}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {page.tags.map(tag => (
                            <span key={tag} className="rounded-full bg-stone-800/80 px-2 py-0.5 text-[10px] font-mono text-stone-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleTogglePage(page.pageDefinitionId)}
                        disabled={actionLoading}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                          page.status === 'ENABLED'
                            ? 'border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                      >
                        {page.status === 'ENABLED' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: PRODUCTION RUNNER */}
          {view === 'production' && (
            <div className="space-y-6">
              {/* Trigger Production Form */}
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-stone-100">Execute Production Run</h3>
                    <p className="text-xs text-stone-400">
                      Dispatches Compiler → Cost Authorization → AI Proposal → Validator → Persistence.
                    </p>
                  </div>
                  <StatusBadge status={data?.universe.status === 'READY' ? 'READY' : 'UNIVERSE_REQUIRED'} />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                      Production Purpose
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['DAILY_STORY', 'DAILY_PAGE', 'GENERAL_PRODUCTION'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setRunPurpose(p)}
                          className={`rounded-xl border px-3.5 py-1.5 text-xs font-mono transition-all ${
                            runPurpose === p
                              ? 'border-amber-400/40 bg-amber-400/15 text-amber-200 font-semibold'
                              : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                      Creative Instruction
                    </label>
                    <input
                      type="text"
                      value={runInstruction}
                      onChange={e => setRunInstruction(e.target.value)}
                      placeholder="e.g. Synthesize daily story events and faction shifts..."
                      className="w-full rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:border-amber-400/40 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleRunProduction}
                      disabled={actionLoading || data?.universe.status !== 'READY'}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-stone-950 hover:bg-amber-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-400/10"
                    >
                      <Play className="h-4 w-4 fill-stone-950" />
                      {actionLoading ? 'Executing Production Cycle...' : 'Execute Production Cycle'}
                    </button>
                    {data?.universe.status !== 'READY' && (
                      <span className="ml-3 text-xs text-amber-400/80">Mount an authoritative Universe first.</span>
                    )}
                  </div>
                </div>

                {latestRunResult && (
                  <div className="mt-5 rounded-xl border border-stone-800 bg-stone-950/80 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-stone-200">Latest Run Result</span>
                      <StatusBadge status={latestRunResult.status} />
                    </div>
                    <div className="font-mono text-xs text-stone-400 space-y-1">
                      <div>ID: {latestRunResult.runId}</div>
                      <div>Tokens: {latestRunResult.inputTokens} in / {latestRunResult.outputTokens} out</div>
                      {latestRunResult.reason && (
                        <div className="text-rose-300 mt-1">Notice: {latestRunResult.reason}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Persisted Runs Explorer */}
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-stone-100">Persisted Production Runs</h3>
                    <p className="text-xs text-stone-400">Durable JSON run repository under POCER_DATA_DIR.</p>
                  </div>
                  <span className="font-mono text-xs text-stone-400">{runs.length} run(s)</span>
                </div>

                {runs.length === 0 ? (
                  <div className="rounded-xl border border-stone-800 bg-stone-950/40 p-6 text-center text-xs text-stone-500">
                    No production runs have been executed yet in this session.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-800/80">
                    {runs.map(run => (
                      <div key={run.runId} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-stone-200 truncate">{run.runId}</span>
                            <StatusBadge status={run.status} />
                            {run.cached && (
                              <span className="rounded bg-sky-400/10 text-sky-300 border border-sky-400/20 px-1.5 py-0.2 text-[9px] font-mono">
                                CACHED
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-stone-400 font-mono">
                            <span>{run.purpose}</span>
                            <span>•</span>
                            <span>{new Date(run.timestamp).toLocaleTimeString()}</span>
                            <span>•</span>
                            <span>{run.inputTokens + run.outputTokens} tokens</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setInspectedRun(run)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-300 hover:text-stone-100 hover:border-stone-500 transition-all shrink-0"
                        >
                          <Eye className="h-3.5 w-3.5" /> Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: AI PROVIDERS */}
          {view === 'providers' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-stone-100">AI Model Adapters & Failover Gateway</h3>
                    <p className="text-xs text-stone-400">
                      External providers generate proposals only; Canon mutations are strictly forbidden.
                    </p>
                  </div>
                  <StatusBadge status={data?.ai.status ?? 'NO_PROVIDER'} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {data?.ai.providers.map(prov => {
                    const health = providerHealth[prov.providerId];
                    return (
                      <div key={prov.providerId} className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-stone-200">{prov.providerId}</span>
                          <StatusBadge status={health?.status ?? 'HEALTHY'} />
                        </div>
                        <div className="space-y-1.5 font-mono text-xs text-stone-400">
                          <div>Model: <span className="text-stone-200">{prov.modelId}</span></div>
                          <div>Tier: <span className="text-amber-300">{prov.tier}</span></div>
                          <div>Structured: <span className="text-emerald-300">{prov.structuredOutput ? 'Yes' : 'No'}</span></div>
                          {health && (
                            <div>
                              Requests: {health.totalRequests} (Success: {health.totalSuccesses})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {data?.ai.providers.length === 0 && (
                  <div className="rounded-xl border border-dashed border-stone-800 p-6 text-center text-xs text-stone-500">
                    No external AI provider API keys configured in environment. Provide GEMINI_API_KEY in .env.production to connect live models.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: COST & TOKENS */}
          {view === 'cost' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-stone-100 mb-1">Token Budget & Cost Controller</h3>
                <p className="text-xs text-stone-400 mb-6">Deterministic usage accounting and budget reservation.</p>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
                    <span className="text-[10px] font-mono uppercase text-stone-400">Committed Input Tokens</span>
                    <div className="mt-1 text-2xl font-bold font-mono text-stone-100">{usage?.inputTokens.toLocaleString() ?? '0'}</div>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
                    <span className="text-[10px] font-mono uppercase text-stone-400">Committed Output Tokens</span>
                    <div className="mt-1 text-2xl font-bold font-mono text-stone-100">{usage?.outputTokens.toLocaleString() ?? '0'}</div>
                  </div>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
                    <span className="text-[10px] font-mono uppercase text-stone-400">Total Incurred Cost</span>
                    <div className="mt-1 text-2xl font-bold font-mono text-emerald-300">${(usage?.cost ?? 0).toFixed(4)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: READINESS & DEPLOY */}
          {view === 'readiness' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-stone-100">Production Deployment Readiness</h3>
                    <p className="text-xs text-stone-400">Automated diagnostic report from /api/production/readiness.</p>
                  </div>
                  <StatusBadge status={readiness?.status ?? 'UNKNOWN'} />
                </div>

                {readiness && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(readiness.checks).map(([check, passed]) => (
                        <div key={check} className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/50 p-3 text-xs">
                          <span className="font-mono text-stone-300">{check}</span>
                          <StatusBadge status={passed ? 'READY' : 'UNREADY'} />
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4">
                      <div className="text-xs font-semibold text-stone-200 mb-2 flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-amber-400" /> Storage Subsystem
                      </div>
                      <div className="font-mono text-xs text-stone-400">
                        Root Directory: <span className="text-stone-200">{readiness.subsystems.storage?.rootDir}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal / Inspector for Run Record */}
          {inspectedRun && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
              <div className="w-full max-w-2xl rounded-2xl border border-stone-700 bg-stone-950 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-100">Production Run Details</h4>
                    <span className="font-mono text-xs text-stone-500">{inspectedRun.runId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedRun(null)}
                    className="rounded-lg p-1.5 text-stone-400 hover:text-stone-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-2 text-stone-400">
                    <div>Status: <span className="text-stone-100 font-semibold">{inspectedRun.status}</span></div>
                    <div>Purpose: <span className="text-stone-100">{inspectedRun.purpose}</span></div>
                    <div>Input Tokens: <span className="text-stone-100">{inspectedRun.inputTokens}</span></div>
                    <div>Output Tokens: <span className="text-stone-100">{inspectedRun.outputTokens}</span></div>
                    <div>Provider: <span className="text-stone-100">{inspectedRun.providerId ?? 'None'}</span></div>
                    <div>Model: <span className="text-stone-100">{inspectedRun.modelId ?? 'None'}</span></div>
                  </div>

                  {inspectedRun.reason && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-200">
                      Reason: {inspectedRun.reason}
                    </div>
                  )}

                  <div>
                    <div className="text-stone-400 font-semibold mb-1 flex items-center gap-1.5">
                      <FileCode2 className="h-3.5 w-3.5 text-amber-400" /> Output Payload
                    </div>
                    <pre className="rounded-xl border border-stone-800 bg-stone-900/80 p-3 text-stone-300 overflow-x-auto text-[11px] whitespace-pre-wrap">
                      {typeof inspectedRun.output === 'object'
                        ? JSON.stringify(inspectedRun.output, null, 2)
                        : String(inspectedRun.output ?? 'No payload output')}
                    </pre>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setInspectedRun(null)}
                    className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-200 hover:bg-stone-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 flex flex-col gap-2 border-t border-stone-800/80 pt-5 text-[10px] font-mono text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Pocer Universe Engine · Phase 34 Production Root · Deterministic Rules & Pipeline</span>
            <span>{lastRefreshed ? `Synchronized at: ${lastRefreshed}` : 'Connecting to runtime...'}</span>
          </footer>
        </main>
      </div>
    </div>
  );
};
