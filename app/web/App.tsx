import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  FileClock,
  HardDrive,
  Layers3,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  XCircle,
} from 'lucide-react';

interface ComponentStatus { id: string; name: string; status: string; detail: string; }
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
    storedCurrent?: { universeId: string; universeScope: string } | null;
    storedCount?: number;
    storageRoot?: string;
    startupLoadError?: string | null;
    message: string;
  };
  daily: { status: string; message: string };
  story: { status: string; storyId: string | null; message: string };
  pages: { status: string; total: number; enabled: number; disabled: number; catalogVersion: number };
  production: { status: string; lastRunId: string | null; message: string };
  models: { connected: number; providerNeutral: boolean };
  ai: { status: string; providers: Array<{ providerId: string; modelId: string; tier: string; structuredOutput: boolean }> };
  components: ComponentStatus[];
}
interface PageDefinition { pageDefinitionId: string; universeId: string; universeScope: string; pageKey: string; pageScope: string; status: 'ENABLED' | 'DISABLED'; revision: number; priority: number; tags: string[]; }
interface ProductionRunRecord { runId: string; status: 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'CACHED'; universeId?: string; universeScope?: string; purpose: string; timestamp: string; inputTokens: number; outputTokens: number; cost: number; providerId?: string; modelId?: string; output?: unknown; reason?: string; cached?: boolean; }
interface ProviderHealthInfo { providerId: string; modelId: string; status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'; lastChecked: string; totalRequests: number; totalSuccesses: number; }
interface DeploymentReadiness { status: 'READY' | 'DEGRADED' | 'UNREADY'; architecturePhase: number; timestamp: string; engine: string; subsystems: Record<string, { status: string; detail?: string; rootDir?: string; total?: number; enabled?: number; storedUniverses?: number; mounted?: boolean; startupLoadError?: string | null; activeSchedules?: number; jobStoreRoot?: string }>; checks: Record<string, boolean>; }
interface UsageSummary { runId: string; inputTokens: number; outputTokens: number; cost: number; }
interface UniverseStorage { mounted: boolean; mountedUniverseId: string | null; mountedUniverseDate: string | null; mountedUniverseScope: string | null; storedCurrent: { universeId: string; universeScope: string } | null; storageRootDir: string; storedUniverseIds: string[]; }
interface ScheduleDefinition { scheduleId: string; pageDefinitionId: string; universeId: string; universeScope: string; cadence: string; dayOffset?: number; customFilter?: string; enabled: boolean; priority: number; }
interface ScheduledJobRecord { jobId: string; scheduleId: string; pageDefinitionId: string; universeDate: string; priority: number; status: string; attempt: number; universeTime: string; productionRunId?: string; reason?: string; }

interface ToastState { tone: 'ok' | 'error' | 'info'; message: string; }
type View = 'home' | 'universe' | 'production' | 'scheduler' | 'pages' | 'ai' | 'system';

const nav: Array<{ id: View; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }> = [
  { id: 'home', label: 'Home', icon: Activity, hint: 'Ringkasan keadaan engine' },
  { id: 'universe', label: 'Universe', icon: Database, hint: 'Universe aktif & penyimpanan' },
  { id: 'production', label: 'Production', icon: Workflow, hint: 'Story, Page, dan produksi AI' },
  { id: 'scheduler', label: 'Scheduler', icon: CalendarClock, hint: 'Pekerjaan terjadwal' },
  { id: 'pages', label: 'Pages', icon: Layers3, hint: 'Page definitions' },
  { id: 'ai', label: 'AI', icon: Bot, hint: 'Provider & model' },
  { id: 'system', label: 'System', icon: Settings2, hint: 'Readiness & runtime' },
];

function tone(status: string): string {
  if (['READY', 'CONNECTED', 'HEALTHY', 'COMPLETED', 'ENABLED', 'INITIALIZED'].includes(status)) return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
  if (['WAITING_FOR_UNIVERSE', 'WAITING_FOR_DAILY_CONTEXT', 'NO_PROVIDER', 'DEGRADED', 'CACHED', 'DISPATCHED'].includes(status)) return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
  if (['BLOCKED', 'FAILED', 'UNAVAILABLE', 'UNREADY'].includes(status)) return 'text-rose-300 bg-rose-500/10 border-rose-500/20';
  return 'text-stone-300 bg-stone-800/70 border-stone-700';
}

function StatusBadge({ status }: { status: string }) {
  const positive = ['READY', 'CONNECTED', 'HEALTHY', 'COMPLETED', 'ENABLED', 'INITIALIZED'].includes(status);
  const warning = ['WAITING_FOR_UNIVERSE', 'WAITING_FOR_DAILY_CONTEXT', 'NO_PROVIDER', 'DEGRADED', 'CACHED', 'DISPATCHED'].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider ${tone(status)}`}>
      {positive ? <CheckCircle2 className="h-3 w-3" /> : warning ? <AlertCircle className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
      {status}
    </span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-stone-800 bg-stone-900/60 shadow-sm ${className}`}>{children}</div>;
}

function Button({ children, onClick, disabled = false, kind = 'secondary', className = '' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; kind?: 'primary' | 'secondary' | 'danger'; className?: string }) {
  const base = kind === 'primary'
    ? 'border-amber-300 bg-amber-300 text-stone-950 hover:bg-amber-200'
    : kind === 'danger'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
      : 'border-stone-700 bg-stone-950 text-stone-200 hover:bg-stone-800';
  return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${base} ${className}`}>{children}</button>;
}

export const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [overview, setOverview] = useState<ControlOverview | null>(null);
  const [storage, setStorage] = useState<UniverseStorage | null>(null);
  const [pages, setPages] = useState<PageDefinition[]>([]);
  const [runs, setRuns] = useState<ProductionRunRecord[]>([]);
  const [providerHealth, setProviderHealth] = useState<Record<string, ProviderHealthInfo>>({});
  const [readiness, setReadiness] = useState<DeploymentReadiness | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [schedules, setSchedules] = useState<ScheduleDefinition[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState('');
  const [runPurpose, setRunPurpose] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('DAILY_STORY');
  const [instruction, setInstruction] = useState('Generate today\'s production from the current authoritative Universe.');
  const [latestRun, setLatestRun] = useState<ProductionRunRecord | null>(null);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    window.setTimeout(() => setToast(current => current?.message === next.message ? null : current), 3500);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch('/api/control/overview'),
        fetch('/api/control/universe/storage'),
        fetch('/api/control/pages'),
        fetch('/api/production/runs?limit=20'),
        fetch('/api/production/providers'),
        fetch('/api/production/readiness'),
        fetch('/api/control/production/usage'),
        fetch('/api/production/schedules'),
      ]);
      const [ovRes, storageRes, pagesRes, runsRes, providersRes, readinessRes, usageRes, schedulesRes] = responses;
      if (!ovRes.ok) throw new Error(`Overview request failed (${ovRes.status}).`);
      if (!storageRes.ok) throw new Error(`Universe storage request failed (${storageRes.status}).`);
      if (!pagesRes.ok) throw new Error(`Page catalog request failed (${pagesRes.status}).`);
      if (!runsRes.ok) throw new Error(`Production history request failed (${runsRes.status}).`);
      if (!providersRes.ok) throw new Error(`Provider request failed (${providersRes.status}).`);
      if (!readinessRes.ok) throw new Error(`Readiness request failed (${readinessRes.status}).`);
      if (!usageRes.ok) throw new Error(`Usage request failed (${usageRes.status}).`);
      if (!schedulesRes.ok) throw new Error(`Scheduler request failed (${schedulesRes.status}).`);

      const ov = await ovRes.json();
      const st = await storageRes.json();
      const pg = await pagesRes.json();
      const rn = await runsRes.json();
      const pv = await providersRes.json();
      const rd = await readinessRes.json();
      const us = await usageRes.json();
      const sc = await schedulesRes.json();

      setOverview(ov);
      setStorage(st);
      setPages(pg.definitions ?? []);
      setRuns(rn.runs ?? []);
      setProviderHealth(pv.health ?? {});
      setReadiness(rd);
      setUsage(us);
      setSchedules(sc.schedules ?? []);

      const date = ov.universe?.universeDate;
      if (date) {
        const [dueRes, jobsRes] = await Promise.all([
          fetch(`/api/production/schedules/due/${encodeURIComponent(date)}`),
          fetch(`/api/production/schedules/jobs/${encodeURIComponent(date)}`),
        ]);
        if (dueRes.ok && jobsRes.ok) {
          const jobs = await jobsRes.json();
          setScheduledJobs(jobs.jobs ?? []);
        }
      } else {
        setScheduledJobs([]);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const mounted = overview?.universe.status === 'READY';
  const universeDate = overview?.universe.universeDate ?? null;
  const enabledPages = pages.filter(page => page.status === 'ENABLED');
  const schedulerCompleted = scheduledJobs.filter(job => job.status === 'COMPLETED').length;
  const schedulerPending = scheduledJobs.filter(job => !['COMPLETED', 'SKIPPED'].includes(job.status)).length;
  const currentPageLabel = nav.find(item => item.id === view)?.label ?? 'Home';

  const runProduction = async () => {
    if (!mounted) return showToast({ tone: 'error', message: 'Load an authoritative Universe first.' });
    setBusy(true);
    try {
      const response = await fetch('/api/control/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: runPurpose, userInstruction: instruction }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? result.reason ?? `Production failed (${response.status}).`);
      setLatestRun(result);
      showToast({ tone: result.status === 'COMPLETED' ? 'ok' : 'info', message: `${runPurpose} finished with status ${result.status}.` });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const loadCurrentUniverse = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/control/universe/load-current', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? `Load failed (${response.status}).`);
      showToast({ tone: 'ok', message: `Loaded ${result.universe.universeId} at ${result.universe.universeDate}.` });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const loadSandbox = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/control/universe/mount', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'GENERIC_SEED', universeScope: 'SANDBOX' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? `Sandbox load failed (${response.status}).`);
      showToast({ tone: 'info', message: 'Generic Sandbox Universe loaded. This is not Canonical Pocer data.' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const unmount = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/control/universe/unmount', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unmount failed.');
      showToast({ tone: 'ok', message: 'Universe unmounted. Persistent snapshot remains unchanged.' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const seedPages = async () => {
    if (!mounted) return showToast({ tone: 'error', message: 'Load an authoritative Universe first.' });
    setBusy(true);
    try {
      const response = await fetch('/api/control/pages/seed', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Page seed failed.');
      showToast({ tone: 'ok', message: `${result.count} page definition(s) available.` });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const executeScheduler = async () => {
    if (!universeDate) return showToast({ tone: 'error', message: 'No Universe Date is available.' });
    setBusy(true);
    try {
      const response = await fetch(`/api/production/schedules/execute/${encodeURIComponent(universeDate)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? result.reason ?? `Scheduler execution failed (${response.status}).`);
      showToast({ tone: result.status === 'COMPLETED' ? 'ok' : 'info', message: `Scheduler ${universeDate}: ${result.completed} completed, ${result.failed} failed, ${result.skipped} skipped.` });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const togglePage = async (pageId: string, currentStatus: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/control/pages/${encodeURIComponent(pageId)}/toggle`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Page toggle failed.');
      showToast({ tone: 'ok', message: `${result.pageKey ?? pageId} is now ${currentStatus === 'ENABLED' ? 'disabled' : 'enabled'}.` });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const homeReadiness = useMemo(() => {
    if (!readiness) return 'UNKNOWN';
    return readiness.status;
  }, [readiness]);

  return (
    <div className="min-h-screen bg-[#08090b] text-stone-200 antialiased">
      <div className="mx-auto flex min-h-screen max-w-[1500px] border-x border-stone-800/80 bg-[#0b0c0f]">
        <aside className="hidden w-64 shrink-0 border-r border-stone-800/80 bg-stone-950/80 lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-5">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300"><Sparkles className="h-5 w-5" /></div>
              <div>
                <div className="text-sm font-semibold text-stone-100">Pocer Universe</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-stone-500">Control Center</div>
              </div>
            </div>
            <nav className="space-y-1">
              {nav.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => setView(item.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${view === item.id ? 'border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border-transparent text-stone-400 hover:border-stone-800 hover:bg-stone-900 hover:text-stone-200'}`}>
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-semibold">{item.label}</span>
                      {view === item.id && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
                    </div>
                    <div className="mt-1 pl-7 text-[10px] text-stone-500">{item.hint}</div>
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto space-y-3">
              <Card className="p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-stone-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Engine</div>
                <StatusBadge status={homeReadiness} />
                <div className="mt-3 text-[11px] leading-relaxed text-stone-500">AI generates proposals. Universe truth stays inside deterministic owner systems.</div>
              </Card>
              <div className="text-[10px] font-mono text-stone-600">Architecture frozen · Control layer only</div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-stone-800/80 bg-[#0b0c0f]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-500">{currentPageLabel}</div>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-stone-100">{view === 'home' ? 'Pocer Universe Control Center' : currentPageLabel}</h1>
              </div>
              <div className="flex items-center gap-2">
                {mounted && <div className="hidden rounded-xl border border-stone-800 bg-stone-950 px-3 py-2 sm:block"><div className="text-[9px] font-mono uppercase tracking-wider text-stone-500">Universe Date</div><div className="mt-0.5 text-xs font-semibold text-stone-200">{universeDate}</div></div>}
                <Button onClick={() => void refresh()} disabled={loading || busy}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            {toast && (
              <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-xs ${toast.tone === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-100' : toast.tone === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}>
                {toast.tone === 'error' ? <XCircle className="h-4 w-4 shrink-0" /> : toast.tone === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <div className="flex-1">{toast.message}</div>
                <button type="button" onClick={() => setToast(null)}><X className="h-4 w-4" /></button>
              </div>
            )}

            {loading && !overview ? (
              <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-300" /></div>
            ) : (
              <>
                {view === 'home' && overview && (
                  <div className="space-y-6">
                    <section className="rounded-3xl border border-stone-800 bg-gradient-to-br from-stone-900/90 to-stone-950 p-6 sm:p-8">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-200"><Sparkles className="h-3 w-3" /> Production control</div>
                          <h2 className="text-3xl font-semibold tracking-tight text-stone-100 sm:text-4xl">Run the Universe from one place.</h2>
                          <p className="mt-3 text-sm leading-7 text-stone-400">Load the authoritative Universe, prepare Daily production, run scheduled Pages, and inspect AI execution without touching the deterministic engine.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!mounted && overview.universe.storedCurrent && <Button kind="primary" onClick={() => void loadCurrentUniverse()} disabled={busy}><Database className="h-4 w-4" /> Load Current Universe</Button>}
                          {!mounted && !overview.universe.storedCurrent && <Button kind="secondary" onClick={() => void loadSandbox()} disabled={busy}><Database className="h-4 w-4" /> Open Sandbox</Button>}
                          {mounted && <Button onClick={() => setView('production')} disabled={busy}><Play className="h-4 w-4" /> Production</Button>}
                        </div>
                      </div>
                    </section>

                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-stone-500"><Database className="h-4 w-4 text-sky-400" /> Universe</div><StatusBadge status={overview.universe.status} /></div><div className="text-lg font-semibold text-stone-100">{overview.universe.universeId ?? 'Not mounted'}</div><div className="mt-1 text-xs text-stone-500">{overview.universe.universeDate ?? 'No authoritative date'}</div><p className="mt-3 text-xs leading-5 text-stone-400">{overview.universe.message}</p></Card>
                      <Card className="p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-stone-500"><Bot className="h-4 w-4 text-violet-400" /> AI</div><StatusBadge status={overview.ai.status} /></div><div className="text-lg font-semibold text-stone-100">{overview.models.connected} provider{overview.models.connected === 1 ? '' : 's'}</div><div className="mt-1 text-xs text-stone-500">Provider-neutral model gateway</div><p className="mt-3 text-xs leading-5 text-stone-400">AI output stays proposal-only and is validated before production use.</p></Card>
                      <Card className="p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-stone-500"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Readiness</div><StatusBadge status={homeReadiness} /></div><div className="text-lg font-semibold text-stone-100">{readiness?.checks ? Object.values(readiness.checks).filter(Boolean).length : 0}/{readiness?.checks ? Object.keys(readiness.checks).length : 0}</div><div className="mt-1 text-xs text-stone-500">Readiness checks passing</div><p className="mt-3 text-xs leading-5 text-stone-400">{readiness?.status === 'READY' ? 'Core runtime boundaries are wired.' : 'Review System for the blocking condition.'}</p></Card>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-stone-100">What can run now?</h3><p className="mt-1 text-xs text-stone-500">Based on the current authoritative state.</p></div><ChevronRight className="h-4 w-4 text-stone-600" /></div><div className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div><div className="text-xs font-semibold text-stone-200">Daily production</div><div className="mt-1 text-[11px] text-stone-500">{overview.daily.message}</div></div><StatusBadge status={overview.daily.status} /></div><div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div><div className="text-xs font-semibold text-stone-200">Pages</div><div className="mt-1 text-[11px] text-stone-500">{overview.pages.enabled} enabled / {overview.pages.total} definitions</div></div><StatusBadge status={overview.pages.status} /></div><div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div><div className="text-xs font-semibold text-stone-200">Scheduler</div><div className="mt-1 text-[11px] text-stone-500">{schedules.length} schedule definitions · {schedulerCompleted} completed jobs on current date</div></div><StatusBadge status={schedules.length ? 'READY' : 'EMPTY'} /></div></div></Card>
                      <Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-stone-100">Latest production</h3><p className="mt-1 text-xs text-stone-500">Persisted execution history.</p></div><FileClock className="h-4 w-4 text-stone-600" /></div>{runs[0] ? <div className="mt-5 rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-mono text-xs font-semibold text-stone-200">{runs[0].runId}</div><div className="mt-1 text-[11px] text-stone-500">{runs[0].purpose}</div></div><StatusBadge status={runs[0].status} /></div><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div><div className="text-sm font-semibold text-stone-100">{runs[0].inputTokens}</div><div className="text-[10px] text-stone-500">input</div></div><div><div className="text-sm font-semibold text-stone-100">{runs[0].outputTokens}</div><div className="text-[10px] text-stone-500">output</div></div><div><div className="text-sm font-semibold text-stone-100">${runs[0].cost.toFixed(4)}</div><div className="text-[10px] text-stone-500">cost</div></div></div></div> : <div className="mt-5 rounded-xl border border-dashed border-stone-800 p-6 text-center text-xs text-stone-500">No production run has been recorded yet.</div>}</Card>
                    </div>
                  </div>
                )}

                {view === 'universe' && overview && storage && (
                  <div className="space-y-6">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <Card className="p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-semibold text-stone-100">Authoritative Universe</h2><p className="mt-1 text-xs text-stone-500">The active Canonical runtime instance.</p></div><StatusBadge status={overview.universe.status} /></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Universe ID</div><div className="mt-2 break-all font-mono text-sm text-stone-100">{overview.universe.universeId ?? '—'}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Universe Date</div><div className="mt-2 font-mono text-sm text-stone-100">{overview.universe.universeDate ?? '—'}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Scope</div><div className="mt-2 font-mono text-sm text-stone-100">{overview.universe.universeScope ?? '—'}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Period Ref</div><div className="mt-2 break-all font-mono text-sm text-stone-100">{overview.universe.periodId ?? '—'}</div></div></div><div className="mt-5 flex flex-wrap gap-2">{mounted ? <Button kind="danger" onClick={() => void unmount()} disabled={busy}>Unmount Universe</Button> : <Button kind="primary" onClick={() => void loadCurrentUniverse()} disabled={busy}>Load Persisted Current</Button>}<Button onClick={() => void loadSandbox()} disabled={busy}>Open Sandbox</Button></div>{overview.universe.startupLoadError && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">Startup load blocked: {overview.universe.startupLoadError}</div>}</Card>
                      <Card className="p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-semibold text-stone-100">Persistent Storage</h2><p className="mt-1 text-xs text-stone-500">Snapshots survive process restarts; storage is not Universe authority.</p></div><HardDrive className="h-5 w-5 text-sky-400" /></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Storage root</div><div className="mt-2 break-all font-mono text-xs text-stone-300">{storage.storageRootDir}</div></div><div className="mt-3 rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Persisted Current</div><div className="mt-2 font-mono text-sm text-stone-100">{storage.storedCurrent?.universeId ?? 'None'}</div><div className="mt-1 text-[11px] text-stone-500">{storage.storedCurrent?.universeScope ?? 'No pointer'}</div></div><div className="mt-3"><div className="mb-2 text-xs font-semibold text-stone-200">Stored snapshots ({storage.storedUniverseIds.length})</div><div className="max-h-56 space-y-2 overflow-auto">{storage.storedUniverseIds.map(id => <div key={id} className="rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-2 font-mono text-xs text-stone-400">{id}</div>)}{storage.storedUniverseIds.length === 0 && <div className="text-xs text-stone-600">No persisted snapshots.</div>}</div></div></Card>
                    </div>
                  </div>
                )}

                {view === 'production' && overview && (
                  <div className="space-y-6">
                    <Card className="p-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="text-lg font-semibold text-stone-100">Production</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-stone-500">Choose what the engine should produce. The engine always supplies the authoritative Universe; operator input is limited to the production instruction and bounded options.</p></div><StatusBadge status={mounted ? 'READY' : 'WAITING_FOR_UNIVERSE'} /></div><div className="mt-6 grid gap-3 md:grid-cols-3">{(['DAILY_STORY', 'DAILY_PAGE', 'GENERAL_PRODUCTION'] as const).map(purpose => <button key={purpose} type="button" onClick={() => setRunPurpose(purpose)} className={`rounded-xl border p-4 text-left transition ${runPurpose === purpose ? 'border-amber-400/30 bg-amber-400/10' : 'border-stone-800 bg-stone-950/50 hover:bg-stone-900'}`}><div className="text-xs font-semibold text-stone-100">{purpose === 'DAILY_STORY' ? 'Daily Story' : purpose === 'DAILY_PAGE' ? 'Daily Page' : 'General Production'}</div><div className="mt-1 text-[11px] leading-5 text-stone-500">{purpose === 'DAILY_STORY' ? 'Story package + AI narrative proposal.' : purpose === 'DAILY_PAGE' ? 'Page projection for enabled definitions.' : 'Provider-neutral production run.'}</div></button>)}</div><div className="mt-5"><label className="mb-2 block text-[10px] font-mono uppercase tracking-wider text-stone-500">Instruction</label><textarea value={instruction} onChange={event => setInstruction(event.target.value)} className="min-h-28 w-full resize-y rounded-xl border border-stone-800 bg-stone-950 px-4 py-3 text-xs leading-5 text-stone-200 outline-none focus:border-amber-400/30" maxLength={8000} /><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div className="text-[10px] text-stone-600">Operator input is bounded at 8,000 characters.</div><Button kind="primary" onClick={() => void runProduction()} disabled={busy || !mounted}><Play className="h-4 w-4" /> {busy ? 'Running…' : 'Run Production'}</Button></div></div>{latestRun && <div className="mt-5 rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="flex items-center justify-between"><div className="font-mono text-xs text-stone-300">{latestRun.runId}</div><StatusBadge status={latestRun.status} /></div>{latestRun.reason && <div className="mt-2 text-xs text-rose-300">{latestRun.reason}</div>}</div>}</Card>
                    <div className="grid gap-4 xl:grid-cols-2"><Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-stone-100">Daily state</h3><p className="mt-1 text-xs text-stone-500">Owner-controlled context feeds Story and Page production.</p></div><StatusBadge status={overview.daily.status} /></div><div className="mt-5 rounded-xl border border-stone-800 bg-stone-950/50 p-4 text-xs leading-6 text-stone-400">{overview.daily.message}</div></Card><Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-stone-100">Usage</h3><p className="mt-1 text-xs text-stone-500">Committed tokens and cost across persisted runs.</p></div><Clock3 className="h-4 w-4 text-stone-600" /></div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl border border-stone-800 bg-stone-950/50 p-3"><div className="text-lg font-semibold text-stone-100">{usage?.inputTokens.toLocaleString() ?? 0}</div><div className="text-[10px] text-stone-500">input</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/50 p-3"><div className="text-lg font-semibold text-stone-100">{usage?.outputTokens.toLocaleString() ?? 0}</div><div className="text-[10px] text-stone-500">output</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/50 p-3"><div className="text-lg font-semibold text-stone-100">${(usage?.cost ?? 0).toFixed(4)}</div><div className="text-[10px] text-stone-500">cost</div></div></div></Card></div></div>
                )}

                {view === 'scheduler' && overview && (
                  <div className="space-y-6">
                    <Card className="p-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-lg font-semibold text-stone-100">Scheduler</h2><p className="mt-1 text-xs text-stone-500">Schedules are evaluated against the authoritative Universe Date, not server wall-clock time.</p></div><div className="flex items-center gap-2"><StatusBadge status={universeDate && schedules.length ? 'READY' : 'WAITING_FOR_UNIVERSE'} />{universeDate && <Button kind="primary" onClick={() => void executeScheduler()} disabled={busy || !mounted}><CalendarClock className="h-4 w-4" /> Execute Due Jobs</Button>}</div></div><div className="mt-6 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] uppercase tracking-wider text-stone-500">Schedules</div><div className="mt-2 text-2xl font-semibold text-stone-100">{schedules.length}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] uppercase tracking-wider text-stone-500">Completed</div><div className="mt-2 text-2xl font-semibold text-emerald-300">{schedulerCompleted}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] uppercase tracking-wider text-stone-500">Pending / Active</div><div className="mt-2 text-2xl font-semibold text-amber-300">{schedulerPending}</div></div></div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Schedule definitions</h3><div className="mt-4 space-y-2">{schedules.map(schedule => <div key={schedule.scheduleId} className="rounded-xl border border-stone-800 bg-stone-950/50 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-mono text-xs font-semibold text-stone-200">{schedule.scheduleId}</div><div className="mt-1 text-[11px] text-stone-500">{schedule.pageDefinitionId} · {schedule.cadence} · priority {schedule.priority}</div></div><StatusBadge status={schedule.enabled ? 'ENABLED' : 'DISABLED'} /></div></div>)}{schedules.length === 0 && <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-600">No schedule definitions are registered.</div>}</div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Jobs for {universeDate ?? 'current Universe date'}</h3><div className="mt-4 space-y-2">{scheduledJobs.map(job => <div key={job.jobId} className="rounded-xl border border-stone-800 bg-stone-950/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-mono text-xs text-stone-200">{job.pageDefinitionId}</div><div className="mt-1 text-[10px] text-stone-500">Attempt {job.attempt} · {job.universeTime}</div></div><div className="flex items-center gap-2"><StatusBadge status={job.status} />{job.productionRunId && <span className="font-mono text-[9px] text-stone-600">{job.productionRunId}</span>}</div></div>{job.reason && <div className="mt-2 text-[11px] text-stone-500">{job.reason}</div>}</div>)}{scheduledJobs.length === 0 && <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-600">No persisted scheduler jobs for this Universe Date.</div>}</div></Card>
                  </div>
                )}

                {view === 'pages' && overview && (
                  <div className="space-y-6">
                    <Card className="p-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-lg font-semibold text-stone-100">Page Catalog</h2><p className="mt-1 text-xs text-stone-500">Pages are projections over the same authoritative Universe; they do not own Canon.</p></div><Button onClick={() => void seedPages()} disabled={busy || !mounted}><Layers3 className="h-4 w-4" /> Seed Standard Definitions</Button></div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div className="text-lg font-semibold text-stone-100">{overview.pages.total}</div><div className="text-[10px] text-stone-500">total</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div className="text-lg font-semibold text-emerald-300">{overview.pages.enabled}</div><div className="text-[10px] text-stone-500">enabled</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div className="text-lg font-semibold text-stone-400">{overview.pages.disabled}</div><div className="text-[10px] text-stone-500">disabled</div></div></div></Card>
                    <div className="grid gap-3">{pages.map(page => <Card key={page.pageDefinitionId} className="p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold text-stone-100">{page.pageKey}</span><StatusBadge status={page.status} /></div><div className="mt-1 text-xs text-stone-500">{page.pageScope} · priority {page.priority} · {page.pageDefinitionId}</div><div className="mt-2 flex flex-wrap gap-1.5">{page.tags.map(tag => <span key={tag} className="rounded-full border border-stone-800 bg-stone-950 px-2 py-0.5 text-[9px] font-mono text-stone-500">#{tag}</span>)}</div></div><Button onClick={() => void togglePage(page.pageDefinitionId, page.status)} disabled={busy}>{page.status === 'ENABLED' ? 'Disable' : 'Enable'}</Button></div></Card>)}{pages.length === 0 && <Card className="p-10 text-center text-xs text-stone-600">No page definitions yet.</Card>}</div>
                  </div>
                )}

                {view === 'ai' && overview && (
                  <div className="space-y-6">
                    <Card className="p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-stone-100">AI Providers</h2><p className="mt-1 text-xs text-stone-500">Adapters generate proposals; they do not own Universe state.</p></div><StatusBadge status={overview.ai.status} /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{overview.ai.providers.map(provider => { const health = providerHealth[provider.providerId]; return <Card key={provider.providerId} className="p-4"><div className="flex items-center justify-between"><div className="text-sm font-semibold text-stone-100">{provider.providerId}</div><StatusBadge status={health?.status ?? 'HEALTHY'} /></div><div className="mt-3 space-y-1 text-[11px] text-stone-500"><div>Model: <span className="font-mono text-stone-300">{provider.modelId}</span></div><div>Tier: <span className="font-mono text-stone-300">{provider.tier}</span></div><div>Structured output: <span className="text-stone-300">{provider.structuredOutput ? 'yes' : 'no'}</span></div>{health && <div>Requests: {health.totalRequests} · Success: {health.totalSuccesses}</div>}</div></Card>; })}</div>{overview.ai.providers.length === 0 && <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-600">No provider is connected. Configure the server-side provider credentials before running production.</div>}</Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Why this boundary exists</h3><p className="mt-3 text-xs leading-6 text-stone-400">The production model receives compiled authoritative context and returns a proposal. It cannot create Canon, storage paths, permissions, IDs, or deterministic state transitions.</p></Card>
                  </div>
                )}

                {view === 'system' && readiness && (
                  <div className="space-y-6">
                    <Card className="p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-stone-100">System Readiness</h2><p className="mt-1 text-xs text-stone-500">Operational checks for the frozen engine architecture.</p></div><StatusBadge status={readiness.status} /></div><div className="mt-6 grid gap-3 md:grid-cols-2">{Object.entries(readiness.checks).map(([name, passed]) => <div key={name} className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="font-mono text-[11px] text-stone-400">{name}</div><StatusBadge status={passed ? 'READY' : 'UNREADY'} /></div>)}</div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Subsystems</h3><div className="mt-4 space-y-2">{Object.entries(readiness.subsystems).map(([name, subsystem]) => <div key={name} className="rounded-xl border border-stone-800 bg-stone-950/50 p-4"><div className="flex items-center justify-between gap-3"><div className="text-xs font-semibold text-stone-200">{name}</div><StatusBadge status={subsystem.status} /></div><div className="mt-1 text-[11px] text-stone-500">{subsystem.detail ?? subsystem.rootDir ?? subsystem.jobStoreRoot ?? ''}</div></div>)}</div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Runtime rules</h3><div className="mt-3 space-y-2 text-xs leading-5 text-stone-400"><div>• Universe Date comes from authoritative Universe state.</div><div>• Canonical Universe loads through Instance Management / persistence.</div><div>• AI is proposal-only.</div><div>• Storage failure blocks rather than silently falling back.</div><div>• Scheduler state is durable and deterministic.</div></div></Card>
                  </div>
                )}
              </>
            )}
          </div>

          <footer className="border-t border-stone-800/80 px-4 py-4 text-[10px] font-mono text-stone-600 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span>Pocer Universe · Control layer over frozen deterministic engine</span><span>{lastRefreshed ? `Refreshed ${lastRefreshed}` : 'Connecting…'}</span></div>
          </footer>
        </main>
      </div>
    </div>
  );
};
