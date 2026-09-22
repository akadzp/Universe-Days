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
  Cpu,
  Database,
  Layers3,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Workflow,
  XCircle
} from 'lucide-react';

interface ComponentStatus {
  id: string;
  name: string;
  status: 'WIRED' | 'NO_PROVIDER';
  detail: string;
}

interface ControlOverview {
  project: string;
  uiPhase: string;
  runtime: { status: string; architecturePhase: number; productionRoot: string };
  universe: { status: string; universeId: string | null; universeDate: string | null; periodId: string | null; message: string };
  daily: { status: string; message: string };
  story: { status: string; storyId: string | null; message: string };
  pages: { status: string; total: number; enabled: number; disabled: number; catalogVersion: number };
  production: { status: string; lastRunId: string | null; message: string };
  models: { connected: number; providerNeutral: boolean };
  components: ComponentStatus[];
}

type View = 'overview' | 'universe' | 'daily' | 'story' | 'pages' | 'production' | 'system';

const navItems: Array<{ id: View; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'universe', label: 'Universe', icon: Database },
  { id: 'daily', label: 'Daily', icon: CalendarDays },
  { id: 'story', label: 'Story', icon: BookOpen },
  { id: 'pages', label: 'Pages', icon: Layers3 },
  { id: 'production', label: 'Production', icon: Workflow },
  { id: 'system', label: 'System', icon: Server }
];

function statusTone(status: string): string {
  if (status === 'WIRED' || status === 'READY' || status === 'CONNECTED' || status === 'INITIALIZED') {
    return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
  }
  if (status === 'NO_PROVIDER') {
    return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
  }
  if (status === 'EMPTY' || status === 'NOT_RUN' || status === 'NOT_INITIALIZED') {
    return 'text-stone-300 bg-stone-800/80 border-stone-700';
  }
  return 'text-sky-300 bg-sky-400/10 border-sky-400/20';
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider ${statusTone(status)}`}>
    {status === 'WIRED' || status === 'READY' || status === 'CONNECTED' || status === 'INITIALIZED'
      ? <CheckCircle2 className="h-3 w-3" />
      : status === 'NO_PROVIDER'
        ? <AlertCircle className="h-3 w-3" />
        : <CircleDot className="h-3 w-3" />}
    {status}
  </span>
);

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; detail: string }> = ({ icon, label, value, detail }) => (
  <div className="rounded-2xl border border-stone-800 bg-stone-900/75 p-4 shadow-lg">
    <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-stone-500">
      {icon}
      {label}
    </div>
    <div className="text-xl font-semibold text-stone-100">{value}</div>
    <div className="mt-1 text-[11px] text-stone-500">{detail}</div>
  </div>
);

const StatePanel: React.FC<{ title: string; status: string; message: string; icon: React.ReactNode; actionLabel?: string; disabled?: boolean }> = ({ title, status, message, icon, actionLabel, disabled }) => (
  <section className="rounded-2xl border border-stone-800 bg-stone-900/75 p-5 shadow-lg">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-stone-800 bg-stone-950 p-2 text-amber-300">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-100">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">{message}</p>
        </div>
      </div>
      <StatusBadge status={status} />
    </div>
    {actionLabel && (
      <button
        type="button"
        disabled={disabled}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2 text-xs font-medium text-stone-300 transition hover:border-stone-600 hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" />
        {actionLabel}
      </button>
    )}
  </section>
);

export const App: React.FC = () => {
  const [data, setData] = useState<ControlOverview | null>(null);
  const [view, setView] = useState<View>('overview');
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [error, setError] = useState('');

  const fetchOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/control/overview');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = (await response.json()) as ControlOverview;
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Control Center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchOverview(); }, []);

  const currentView = navItems.find(item => item.id === view) ?? navItems[0];
  const wiredCount = useMemo(() => data?.components.filter(component => component.status === 'WIRED').length ?? 0, [data]);

  return (
    <div className="min-h-screen bg-[#090908] text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-stone-800 bg-stone-950/90 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div className="sticky top-0 p-4 lg:p-5">
            <div className="mb-6 flex items-center gap-3 px-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Pocer Universe</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Control Center</div>
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition ${active ? 'bg-amber-400/10 text-amber-200 ring-1 ring-inset ring-amber-400/20' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {active && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 hidden rounded-2xl border border-stone-800 bg-stone-900/60 p-3 lg:block">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-stone-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Runtime
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Architecture</span>
                <span className="font-mono text-stone-200">Phase {data?.runtime.architecturePhase ?? '—'}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-stone-400">Modules wired</span>
                <span className="font-mono text-emerald-300">{wiredCount}/{data?.components.length ?? '—'}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-7 flex flex-col gap-4 border-b border-stone-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-stone-500">
                <span>{data?.uiPhase ?? 'Phase 25.5 — UI Control Center'}</span>
                <span className="text-stone-700">/</span>
                <span>{currentView.label}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-100 sm:text-3xl">{currentView.label}</h1>
              <p className="mt-1 max-w-3xl text-sm text-stone-400">The interface reads engine state; it does not invent Universe state.</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchOverview()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-xs font-medium text-stone-300 transition hover:border-stone-600 hover:text-stone-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Runtime
            </button>
          </header>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
              <XCircle className="h-4 w-4 shrink-0" />
              <div><strong className="font-semibold">Control Center unavailable.</strong> {error}</div>
            </div>
          )}

          {data && view === 'overview' && (
            <div className="space-y-5">
              <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <MetricCard icon={<Activity className="h-3.5 w-3.5 text-emerald-300" />} label="Runtime" value={data.runtime.status} detail="Final production composition root" />
                <MetricCard icon={<Database className="h-3.5 w-3.5 text-sky-300" />} label="Universe" value={data.universe.status} detail="Authoritative instance" />
                <MetricCard icon={<Layers3 className="h-3.5 w-3.5 text-amber-300" />} label="Pages" value={`${data.pages.enabled}/${data.pages.total}`} detail="Enabled page definitions" />
                <MetricCard icon={<Cpu className="h-3.5 w-3.5 text-violet-300" />} label="AI Providers" value={String(data.models.connected)} detail="External adapters connected" />
              </section>

              <div className="grid gap-5 xl:grid-cols-2">
                <StatePanel title="Universe" status={data.universe.status} message={data.universe.message} icon={<Database className="h-4 w-4" />} />
                <StatePanel title="Daily Universe" status={data.daily.status} message={data.daily.message} icon={<CalendarDays className="h-4 w-4" />} />
                <StatePanel title="Daily Story" status={data.story.status} message={data.story.message} icon={<BookOpen className="h-4 w-4" />} />
                <StatePanel title="Production" status={data.production.status} message={data.production.message} icon={<Workflow className="h-4 w-4" />} actionLabel="Produce Today" disabled={data.universe.status !== 'READY'} />
              </div>

              <section className="rounded-2xl border border-stone-800 bg-stone-900/75 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-100">Runtime Components</h2>
                    <p className="mt-1 text-xs text-stone-500">Infrastructure registered by the Phase 25 production composition root.</p>
                  </div>
                  <StatusBadge status={data.runtime.productionRoot} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {data.components.slice(0, 6).map(component => (
                    <div key={component.id} className="rounded-xl border border-stone-800 bg-stone-950/55 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-stone-200">{component.name}</span>
                        <StatusBadge status={component.status} />
                      </div>
                      <div className="mt-1 text-[10px] text-stone-500">{component.detail}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {data && view === 'universe' && (
            <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
              <StatePanel title="Active Universe Instance" status={data.universe.status} message={data.universe.message} icon={<Database className="h-4 w-4" />} />
              <section className="rounded-2xl border border-stone-800 bg-stone-900/75 p-5">
                <h2 className="text-sm font-semibold">Universe Identity</h2>
                <div className="mt-4 space-y-3 font-mono text-xs">
                  <div><span className="text-stone-500">Universe ID</span><div className="mt-1 text-stone-300">{data.universe.universeId ?? '—'}</div></div>
                  <div><span className="text-stone-500">Universe Date</span><div className="mt-1 text-stone-300">{data.universe.universeDate ?? '—'}</div></div>
                  <div><span className="text-stone-500">Period ID</span><div className="mt-1 text-stone-300">{data.universe.periodId ?? '—'}</div></div>
                </div>
              </section>
            </div>
          )}

          {data && view === 'daily' && <StatePanel title="Daily Universe" status={data.daily.status} message={data.daily.message} icon={<CalendarDays className="h-4 w-4" />} />}
          {data && view === 'story' && <StatePanel title="Daily Story" status={data.story.status} message={data.story.message} icon={<BookOpen className="h-4 w-4" />} />}

          {data && view === 'pages' && (
            <div className="space-y-5">
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard icon={<Layers3 className="h-3.5 w-3.5" />} label="Catalog" value={`v${data.pages.catalogVersion}`} detail="Page registry version" />
                <MetricCard icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />} label="Enabled" value={String(data.pages.enabled)} detail="Eligible for production" />
                <MetricCard icon={<CircleDot className="h-3.5 w-3.5" />} label="Disabled" value={String(data.pages.disabled)} detail="Excluded from fan-out" />
                <MetricCard icon={<Clock3 className="h-3.5 w-3.5" />} label="Total" value={String(data.pages.total)} detail="Registered definitions" />
              </section>
              <StatePanel title="Page Production Surface" status={data.pages.status} message={data.pages.total === 0 ? 'The scalable page infrastructure is connected, but no Page Definitions are registered yet. This is intentionally different from creating a fake page state.' : `${data.pages.enabled} enabled Page Definition(s) are currently eligible for production.`} icon={<Layers3 className="h-4 w-4" />} />
            </div>
          )}

          {data && view === 'production' && (
            <div className="space-y-5">
              <StatePanel title="Production Runner" status={data.production.status} message={data.production.message} icon={<Workflow className="h-4 w-4" />} actionLabel="Produce Today" disabled={data.universe.status !== 'READY'} />
              <section className="rounded-2xl border border-stone-800 bg-stone-900/75 p-5">
                <div className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-stone-500" /><div><h2 className="text-sm font-semibold">Last Production Run</h2><p className="text-xs text-stone-500">No fake run IDs are displayed when nothing has executed.</p></div></div>
                <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/55 p-4 font-mono text-xs text-stone-400">{data.production.lastRunId ?? 'No production run in this session.'}</div>
              </section>
            </div>
          )}

          {data && view === 'system' && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.components.map(component => (
                <section key={component.id} className="rounded-2xl border border-stone-800 bg-stone-900/75 p-4">
                  <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">{component.name}</h2><StatusBadge status={component.status} /></div>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">{component.detail}</p>
                </section>
              ))}
            </div>
          )}

          <footer className="mt-10 flex flex-col gap-2 border-t border-stone-800 pt-4 text-[10px] font-mono text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <span>Pocer Universe Engine · Architecture Phase 25 · UI Phase 25.5</span>
            <span>{lastRefreshed ? `Last refresh: ${lastRefreshed}` : 'Waiting for runtime'}</span>
          </footer>
        </main>
      </div>
    </div>
  );
};
