import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Database,
  FileClock,
  Layers3,
  Loader2,
  Menu,
  Play,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
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

type View = 'home' | 'universe' | 'production' | 'scheduler' | 'pages' | 'history' | 'ai' | 'system';

const mainNav: Array<{ id: View; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', label: 'Beranda', hint: 'Ringkasan dan langkah berikutnya', icon: Activity },
  { id: 'universe', label: 'Universe', hint: 'Universe aktif dan penyimpanan', icon: Database },
  { id: 'production', label: 'Produksi', hint: 'Buat Story dan produksi Page', icon: Play },
  { id: 'scheduler', label: 'Jadwal', hint: 'Pekerjaan otomatis terjadwal', icon: CalendarClock },
  { id: 'pages', label: 'Halaman', hint: 'Daftar Page dan statusnya', icon: Layers3 },
];

const adminNav: Array<{ id: View; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'history', label: 'Riwayat', hint: 'Hasil produksi sebelumnya', icon: FileClock },
  { id: 'ai', label: 'AI & Model', hint: 'Provider dan model produksi', icon: Bot },
  { id: 'system', label: 'Sistem', hint: 'Pemeriksaan dan detail teknis', icon: Settings2 },
];

const allNav = [...mainNav, ...adminNav];

const statusText: Record<string, string> = {
  READY: 'Siap', CONNECTED: 'Terhubung', HEALTHY: 'Sehat', COMPLETED: 'Selesai', ENABLED: 'Aktif', INITIALIZED: 'Siap',
  WAITING_FOR_UNIVERSE: 'Menunggu Universe', WAITING_FOR_DAILY_CONTEXT: 'Menunggu konteks harian', NO_PROVIDER: 'Belum ada provider', DEGRADED: 'Perlu perhatian', CACHED: 'Dari cache', DISPATCHED: 'Dikirim',
  BLOCKED: 'Terblokir', FAILED: 'Gagal', UNAVAILABLE: 'Tidak tersedia', UNREADY: 'Belum siap', DISABLED: 'Nonaktif', EMPTY: 'Kosong', UNKNOWN: 'Belum diketahui',
};

const friendlyKeys: Record<string, string> = {
  engineAuthoritative: 'Engine sebagai sumber kebenaran',
  persistenceAccessible: 'Penyimpanan dapat diakses',
  universePersistenceWired: 'Penyimpanan Universe terhubung',
  startupUniverseLoadClean: 'Pemuatan Universe saat mulai',
  providersAvailable: 'Provider AI tersedia',
  outputValidationActive: 'Validasi output aktif',
  schedulerDispatcherWired: 'Jadwal terhubung',
  engine: 'Engine',
  persistence: 'Penyimpanan',
  universe: 'Universe',
  scheduler: 'Jadwal',
  production: 'Produksi',
};

function labelStatus(status: string | undefined | null): string {
  if (!status) return 'Belum diketahui';
  return statusText[status] ?? status.replaceAll('_', ' ').toLowerCase().replace(/(^| )\S/g, char => char.toUpperCase());
}

function statusTone(status: string): string {
  if (['READY', 'CONNECTED', 'HEALTHY', 'COMPLETED', 'ENABLED', 'INITIALIZED'].includes(status)) return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20';
  if (['WAITING_FOR_UNIVERSE', 'WAITING_FOR_DAILY_CONTEXT', 'NO_PROVIDER', 'DEGRADED', 'CACHED', 'DISPATCHED'].includes(status)) return 'text-amber-300 bg-amber-400/10 border-amber-400/20';
  if (['BLOCKED', 'FAILED', 'UNAVAILABLE', 'UNREADY'].includes(status)) return 'text-rose-300 bg-rose-500/10 border-rose-500/20';
  return 'text-stone-300 bg-stone-800/70 border-stone-700';
}

function StatusBadge({ status }: { status: string }) {
  const positive = ['READY', 'CONNECTED', 'HEALTHY', 'COMPLETED', 'ENABLED', 'INITIALIZED'].includes(status);
  const warning = ['WAITING_FOR_UNIVERSE', 'WAITING_FOR_DAILY_CONTEXT', 'NO_PROVIDER', 'DEGRADED', 'CACHED', 'DISPATCHED'].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusTone(status)}`}>
      {positive ? <CheckCircle2 className="h-3 w-3" /> : warning ? <AlertCircle className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
      {labelStatus(status)}
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

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Belum ada tanggal';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const [, year, month, day] = match;
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('id-ID');
}

function friendlyPurpose(purpose: string): string {
  if (purpose === 'DAILY_STORY') return 'Cerita harian';
  if (purpose === 'DAILY_PAGE') return 'Produksi halaman';
  if (purpose === 'GENERAL_PRODUCTION') return 'Produksi umum';
  return purpose.replaceAll('_', ' ');
}

function friendlyCadence(cadence: string): string {
  const map: Record<string, string> = { DAILY: 'Setiap hari', WEEKLY: 'Mingguan', MONTHLY: 'Bulanan', CUSTOM: 'Khusus' };
  return map[cadence] ?? cadence;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productionKind, setProductionKind] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('DAILY_STORY');
  const [instruction, setInstruction] = useState('');
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
      const pairs = [ovRes, storageRes, pagesRes, runsRes, providersRes, readinessRes, usageRes, schedulesRes];
      const names = ['ringkasan', 'penyimpanan', 'halaman', 'riwayat produksi', 'provider AI', 'kesiapan sistem', 'penggunaan', 'jadwal'];
      for (let i = 0; i < pairs.length; i += 1) {
        if (!pairs[i].ok) throw new Error(`Gagal memuat ${names[i]} (${pairs[i].status}).`);
      }

      const [ov, st, pg, rn, pv, rd, us, sc] = await Promise.all(pairs.map(response => response.json()));
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
        const jobsRes = await fetch(`/api/production/schedules/jobs/${encodeURIComponent(date)}`);
        if (jobsRes.ok) {
          const jobs = await jobsRes.json();
          setScheduledJobs(jobs.jobs ?? []);
        } else {
          setScheduledJobs([]);
        }
      } else {
        setScheduledJobs([]);
      }
      setLastRefreshed(new Date().toLocaleTimeString('id-ID'));
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const mounted = overview?.universe.status === 'READY';
  const universeDate = overview?.universe.universeDate ?? null;
  const schedulerCompleted = scheduledJobs.filter(job => job.status === 'COMPLETED').length;
  const schedulerPending = scheduledJobs.filter(job => !['COMPLETED', 'SKIPPED'].includes(job.status)).length;
  const currentPage = allNav.find(item => item.id === view) ?? mainNav[0];
  const nextAction = !mounted && storage?.storedCurrent ? 'load' : mounted ? 'production' : 'universe';

  const runProduction = async () => {
    if (!mounted) return showToast({ tone: 'error', message: 'Muat Universe terlebih dahulu sebelum menjalankan produksi.' });
    setBusy(true);
    try {
      const fallbackInstruction = productionKind === 'DAILY_STORY'
        ? 'Buat cerita hari ini berdasarkan Universe yang sedang aktif.'
        : productionKind === 'DAILY_PAGE'
          ? 'Produksi halaman berdasarkan Universe dan konteks produksi yang sedang aktif.'
          : 'Jalankan produksi berdasarkan Universe yang sedang aktif.';
      const response = await fetch('/api/control/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: productionKind, userInstruction: instruction.trim() || fallbackInstruction }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? result.reason ?? `Produksi gagal (${response.status}).`);
      setLatestRun(result);
      showToast({ tone: result.status === 'COMPLETED' ? 'ok' : 'info', message: `${friendlyPurpose(productionKind)} selesai: ${labelStatus(result.status)}.` });
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
      if (!response.ok) throw new Error(result.error ?? `Pemuatan gagal (${response.status}).`);
      showToast({ tone: 'ok', message: `Universe ${result.universe.universeId} aktif untuk ${formatDate(result.universe.universeDate)}.` });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const loadSandbox = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/control/universe/mount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'GENERIC_SEED', universeScope: 'SANDBOX' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? `Sandbox gagal dibuka (${response.status}).`);
      showToast({ tone: 'info', message: 'Mode Sandbox dibuka. Ini bukan data Canonical Pocer.' });
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
      if (!response.ok) throw new Error(result.error ?? 'Gagal menonaktifkan Universe.');
      showToast({ tone: 'ok', message: 'Universe dinonaktifkan. Data tersimpan tetap aman.' });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const seedPages = async () => {
    if (!mounted) return showToast({ tone: 'error', message: 'Muat Universe terlebih dahulu.' });
    setBusy(true);
    try {
      const response = await fetch('/api/control/pages/seed', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Gagal memuat daftar halaman bawaan.');
      showToast({ tone: 'ok', message: `${result.count} halaman tersedia.` });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const executeScheduler = async () => {
    if (!universeDate) return showToast({ tone: 'error', message: 'Belum ada tanggal Universe yang aktif.' });
    setBusy(true);
    try {
      const response = await fetch(`/api/production/schedules/execute/${encodeURIComponent(universeDate)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? result.reason ?? `Jalankan jadwal gagal (${response.status}).`);
      showToast({ tone: result.status === 'COMPLETED' ? 'ok' : 'info', message: `Jadwal ${formatDate(universeDate)}: ${result.completed} selesai, ${result.failed} gagal, ${result.skipped} dilewati.` });
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
      if (!response.ok) throw new Error(result.error ?? 'Gagal mengubah status halaman.');
      showToast({ tone: 'ok', message: `${result.pageKey ?? pageId} sekarang ${currentStatus === 'ENABLED' ? 'nonaktif' : 'aktif'}.` });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally { setBusy(false); }
  };

  const navigate = (next: View) => {
    setView(next);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#08090b] text-stone-200 antialiased">
      <div className="mx-auto flex min-h-screen max-w-[1500px] border-x border-stone-800/80 bg-[#0b0c0f]">
        <aside className="hidden w-72 shrink-0 border-r border-stone-800/80 bg-stone-950/80 lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-5">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300"><Sparkles className="h-5 w-5" /></div>
              <div>
                <div className="text-sm font-semibold text-stone-100">Pocer Universe</div>
                <div className="text-[10px] font-medium text-stone-500">Pusat Kendali</div>
              </div>
            </div>

            <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">Menu utama</div>
            <nav className="space-y-1">
              {mainNav.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${view === item.id ? 'border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border-transparent text-stone-400 hover:border-stone-800 hover:bg-stone-900 hover:text-stone-200'}`}>
                    <div className="flex items-center gap-3"><Icon className="h-4 w-4" /><span className="text-xs font-semibold">{item.label}</span>{view === item.id && <ChevronRight className="ml-auto h-3.5 w-3.5" />}</div>
                    <div className="mt-1 pl-7 text-[10px] text-stone-500">{item.hint}</div>
                  </button>
                );
              })}
            </nav>

            <div className="my-5 border-t border-stone-800/80" />
            <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">Administrasi</div>
            <nav className="space-y-1">
              {adminNav.map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${view === item.id ? 'border-stone-700 bg-stone-900 text-stone-100' : 'border-transparent text-stone-500 hover:border-stone-800 hover:bg-stone-900 hover:text-stone-200'}`}>
                    <div className="flex items-center gap-3"><Icon className="h-4 w-4" /><span className="text-xs font-semibold">{item.label}</span>{view === item.id && <ChevronRight className="ml-auto h-3.5 w-3.5" />}</div>
                    <div className="mt-1 pl-7 text-[10px] text-stone-600">{item.hint}</div>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3">
              <Card className="p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-stone-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Status sistem</div>
                <StatusBadge status={readiness?.status ?? 'UNKNOWN'} />
                <div className="mt-3 text-[11px] leading-relaxed text-stone-500">AI membuat usulan. Kebenaran Universe tetap dijaga oleh sistem inti.</div>
              </Card>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-[#0b0c0f]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-stone-500">Pocer Universe</div>
                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-stone-100">{currentPage.label}</h1>
              </div>
              <div className="flex items-center gap-2">
                {mounted && <div className="hidden rounded-xl border border-stone-800 bg-stone-950 px-3 py-2 sm:block"><div className="text-[9px] font-semibold text-stone-500">Tanggal Universe</div><div className="mt-0.5 text-xs font-semibold text-stone-200">{formatDate(universeDate)}</div></div>}
                <Button onClick={() => void refresh()} disabled={loading || busy}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Muat ulang</Button>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-800 bg-stone-950 text-stone-300 lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Buka menu"><Menu className="h-4 w-4" /></button>
              </div>
            </div>
          </header>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
              <div className="ml-auto h-full w-[86%] max-w-sm overflow-y-auto border-l border-stone-800 bg-stone-950 p-5" onClick={event => event.stopPropagation()}>
                <div className="mb-6 flex items-center justify-between"><div><div className="text-sm font-semibold text-stone-100">Menu</div><div className="mt-1 text-[11px] text-stone-500">Navigasi Pocer Universe</div></div><button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-900" aria-label="Tutup menu"><X className="h-4 w-4" /></button></div>
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">Menu utama</div>
                <div className="space-y-1">{mainNav.map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`w-full rounded-xl border px-3 py-3 text-left ${view === item.id ? 'border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border-transparent text-stone-300 hover:bg-stone-900'}`}><div className="flex items-center gap-3"><item.icon className="h-4 w-4" /><span className="text-xs font-semibold">{item.label}</span></div><div className="mt-1 pl-7 text-[10px] text-stone-500">{item.hint}</div></button>)}</div>
                <div className="my-5 border-t border-stone-800/80" />
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">Administrasi</div>
                <div className="space-y-1">{adminNav.map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`w-full rounded-xl border px-3 py-3 text-left ${view === item.id ? 'border-stone-700 bg-stone-900 text-stone-100' : 'border-transparent text-stone-300 hover:bg-stone-900'}`}><div className="flex items-center gap-3"><item.icon className="h-4 w-4" /><span className="text-xs font-semibold">{item.label}</span></div><div className="mt-1 pl-7 text-[10px] text-stone-600">{item.hint}</div></button>)}</div>
              </div>
            </div>
          )}

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
                      <div className="max-w-3xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold text-amber-200"><Sparkles className="h-3 w-3" /> Pusat Kendali</div>
                        <h2 className="text-3xl font-semibold tracking-tight text-stone-100 sm:text-4xl">Semua pekerjaan utama ada di sini.</h2>
                        <p className="mt-3 text-sm leading-7 text-stone-400">Mulai dari membuka Universe, membuat cerita, menjalankan jadwal, sampai memeriksa hasil produksi. Menu administrasi hanya berisi pengaturan dan informasi teknis.</p>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {nextAction === 'load' && <Button kind="primary" onClick={() => void loadCurrentUniverse()} disabled={busy}><Database className="h-4 w-4" /> Aktifkan Universe tersimpan</Button>}
                        {nextAction === 'production' && <Button kind="primary" onClick={() => navigate('production')} disabled={busy}><Play className="h-4 w-4" /> Mulai produksi</Button>}
                        {nextAction === 'universe' && <Button onClick={() => navigate('universe')} disabled={busy}><Database className="h-4 w-4" /> Buka pengaturan Universe</Button>}
                        <Button onClick={() => navigate('history')} disabled={busy}><FileClock className="h-4 w-4" /> Lihat riwayat</Button>
                      </div>
                    </section>

                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-semibold text-stone-500"><Database className="h-4 w-4 text-sky-400" /> Universe</div><StatusBadge status={overview.universe.status} /></div><div className="text-lg font-semibold text-stone-100">{overview.universe.universeId ?? 'Belum aktif'}</div><div className="mt-1 text-xs text-stone-500">{formatDate(overview.universe.universeDate)}</div><p className="mt-3 text-xs leading-5 text-stone-400">{overview.universe.message}</p></Card>
                      <Card className="p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-semibold text-stone-500"><Bot className="h-4 w-4 text-violet-400" /> AI</div><StatusBadge status={overview.ai.status} /></div><div className="text-lg font-semibold text-stone-100">{overview.models.connected} provider</div><div className="mt-1 text-xs text-stone-500">Model siap digunakan: {overview.models.connected > 0 ? 'ya' : 'belum'}</div><p className="mt-3 text-xs leading-5 text-stone-400">AI memberi usulan. Sistem inti tetap memegang kendali atas Universe.</p></Card>
                      <Card className="p-5"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] font-semibold text-stone-500"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Sistem</div><StatusBadge status={readiness?.status ?? 'UNKNOWN'} /></div><div className="text-lg font-semibold text-stone-100">{readiness?.checks ? Object.values(readiness.checks).filter(Boolean).length : 0}/{readiness?.checks ? Object.keys(readiness.checks).length : 0}</div><div className="mt-1 text-xs text-stone-500">pemeriksaan lolos</div><p className="mt-3 text-xs leading-5 text-stone-400">Detail teknis tersedia di menu Sistem.</p></Card>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-stone-100">Yang bisa dikerjakan sekarang</h3><p className="mt-1 text-xs text-stone-500">Status langsung dari sistem aktif.</p></div></div><div className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div><div className="text-xs font-semibold text-stone-200">Cerita harian</div><div className="mt-1 text-[11px] text-stone-500">{overview.daily.message}</div></div><StatusBadge status={overview.daily.status} /></div><div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div><div className="text-xs font-semibold text-stone-200">Halaman</div><div className="mt-1 text-[11px] text-stone-500">{overview.pages.enabled} aktif dari {overview.pages.total}</div></div><StatusBadge status={overview.pages.status} /></div><div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-3"><div><div className="text-xs font-semibold text-stone-200">Jadwal</div><div className="mt-1 text-[11px] text-stone-500">{schedules.length} jadwal terdaftar untuk dikelola</div></div><StatusBadge status={schedules.length ? 'READY' : 'EMPTY'} /></div></div></Card>
                      <Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-stone-100">Produksi terbaru</h3><p className="mt-1 text-xs text-stone-500">Lihat hasil terakhir tanpa masuk ke detail teknis.</p></div><FileClock className="h-4 w-4 text-stone-600" /></div>{runs[0] ? <div className="mt-5 rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="font-mono text-xs font-semibold text-stone-200">{friendlyPurpose(runs[0].purpose)}</div><div className="mt-1 text-[11px] text-stone-500">{formatTime(runs[0].timestamp)}</div></div><StatusBadge status={runs[0].status} /></div><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div><div className="text-sm font-semibold text-stone-100">{runs[0].inputTokens}</div><div className="text-[10px] text-stone-500">token masuk</div></div><div><div className="text-sm font-semibold text-stone-100">{runs[0].outputTokens}</div><div className="text-[10px] text-stone-500">token keluar</div></div><div><div className="text-sm font-semibold text-stone-100">${runs[0].cost.toFixed(4)}</div><div className="text-[10px] text-stone-500">biaya</div></div></div></div> : <div className="mt-5 rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-600">Belum ada produksi.</div>}</Card>
                    </div>
                  </div>
                )}

                {view === 'universe' && overview && (
                  <div className="space-y-6">
                    <section><h2 className="text-lg font-semibold text-stone-100">Universe</h2><p className="mt-1 text-sm text-stone-500">Atur Universe yang dipakai sistem untuk produksi. Data Canonical dimuat dari penyimpanan resmi.</p></section>
                    <Card className="p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><h3 className="text-base font-semibold text-stone-100">Universe aktif</h3><StatusBadge status={overview.universe.status} /></div><div className="mt-3 text-xl font-semibold text-stone-100">{overview.universe.universeId ?? 'Belum ada Universe aktif'}</div><div className="mt-1 text-sm text-stone-500">Tanggal Universe: {formatDate(universeDate)}</div><div className="mt-1 text-sm text-stone-500">Ruang: {overview.universe.universeScope ?? '—'}</div></div><div className="flex flex-wrap gap-2">{!mounted && storage?.storedCurrent && <Button kind="primary" onClick={() => void loadCurrentUniverse()} disabled={busy}><Database className="h-4 w-4" /> Muat Universe tersimpan</Button>}{mounted && <Button kind="danger" onClick={() => void unmount()} disabled={busy}>Nonaktifkan Universe</Button>}</div></div><div className="mt-6 rounded-xl border border-stone-800 bg-stone-950/50 p-4"><div className="text-xs font-semibold text-stone-300">Cara kerja</div><div className="mt-2 text-xs leading-6 text-stone-500">Universe aktif menjadi konteks utama untuk produksi. Menonaktifkan Universe tidak menghapus snapshot yang tersimpan.</div></div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Penyimpanan</h3><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-semibold text-stone-500">Snapshot tersimpan</div><div className="mt-2 text-2xl font-semibold text-stone-100">{storage?.storedUniverseIds.length ?? overview.universe.storedCount ?? 0}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-semibold text-stone-500">Universe tersimpan saat ini</div><div className="mt-2 text-sm font-semibold text-stone-100">{storage?.storedCurrent?.universeId ?? 'Belum ada'}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-semibold text-stone-500">Lokasi penyimpanan</div><div className="mt-2 break-all text-xs text-stone-300">{storage?.storageRootDir ?? overview.universe.storageRoot ?? '—'}</div></div></div></Card>
                    <Card className="border-amber-400/20 bg-amber-400/[0.04] p-6"><h3 className="text-sm font-semibold text-amber-100">Mode Sandbox</h3><p className="mt-2 text-xs leading-6 text-amber-100/60">Gunakan hanya untuk eksplorasi teknis. Sandbox bukan Canonical Pocer dan tidak menggantikan Universe tersimpan.</p><div className="mt-4"><Button onClick={() => void loadSandbox()} disabled={busy}>Buka Sandbox</Button></div></Card>
                  </div>
                )}

                {view === 'production' && overview && (
                  <div className="space-y-6">
                    <section><h2 className="text-lg font-semibold text-stone-100">Produksi</h2><p className="mt-1 text-sm text-stone-500">Pilih pekerjaan yang ingin dijalankan. Universe aktif akan dipakai sebagai sumber konteks.</p></section>
                    {!mounted && <Card className="border-amber-400/20 bg-amber-400/[0.04] p-5"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><div><div className="text-sm font-semibold text-amber-100">Universe belum aktif</div><div className="mt-1 text-xs leading-6 text-amber-100/60">Aktifkan Universe dari menu Universe sebelum menjalankan produksi.</div><div className="mt-3"><Button onClick={() => navigate('universe')}>Buka Universe</Button></div></div></div></Card>}
                    <Card className="p-6"><div className="grid gap-3 md:grid-cols-3"><button type="button" onClick={() => setProductionKind('DAILY_STORY')} className={`rounded-2xl border p-5 text-left transition ${productionKind === 'DAILY_STORY' ? 'border-amber-400/30 bg-amber-400/10' : 'border-stone-800 bg-stone-950/50 hover:bg-stone-900'}`}><div className="text-sm font-semibold text-stone-100">Buat cerita hari ini</div><div className="mt-2 text-xs leading-5 text-stone-500">Produksi cerita berdasarkan kondisi Universe saat ini.</div></button><button type="button" onClick={() => setProductionKind('DAILY_PAGE')} className={`rounded-2xl border p-5 text-left transition ${productionKind === 'DAILY_PAGE' ? 'border-amber-400/30 bg-amber-400/10' : 'border-stone-800 bg-stone-950/50 hover:bg-stone-900'}`}><div className="text-sm font-semibold text-stone-100">Produksi halaman</div><div className="mt-2 text-xs leading-5 text-stone-500">Membuat output Page dari Universe yang sama.</div></button><button type="button" onClick={() => setProductionKind('GENERAL_PRODUCTION')} className={`rounded-2xl border p-5 text-left transition ${productionKind === 'GENERAL_PRODUCTION' ? 'border-amber-400/30 bg-amber-400/10' : 'border-stone-800 bg-stone-950/50 hover:bg-stone-900'}`}><div className="text-sm font-semibold text-stone-100">Produksi khusus</div><div className="mt-2 text-xs leading-5 text-stone-500">Gunakan untuk instruksi produksi yang tidak termasuk dua pilihan utama.</div></button></div><div className="mt-6"><label className="text-xs font-semibold text-stone-300">Instruksi tambahan <span className="font-normal text-stone-600">(opsional)</span></label><textarea value={instruction} onChange={event => setInstruction(event.target.value)} rows={5} className="mt-2 w-full rounded-2xl border border-stone-800 bg-stone-950 p-4 text-sm text-stone-200 outline-none ring-0 placeholder:text-stone-700 focus:border-amber-400/30" placeholder="Kosongkan untuk menggunakan instruksi standar." /><div className="mt-4 flex flex-wrap items-center gap-2"><Button kind="primary" onClick={() => void runProduction()} disabled={busy || !mounted}><Play className="h-4 w-4" /> Jalankan {friendlyPurpose(productionKind)}</Button><span className="text-[11px] text-stone-600">Hasil dan status akan masuk ke Riwayat.</span></div></div></Card>
                    {(latestRun || runs[0]) && <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Hasil terbaru</h3>{(() => { const run = latestRun ?? runs[0]; return <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold text-stone-100">{friendlyPurpose(run.purpose)}</div><div className="mt-1 text-[11px] text-stone-500">{formatTime(run.timestamp)}</div></div><StatusBadge status={run.status} /></div>{run.reason && <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-100/80">{run.reason}</div>}<div className="mt-4 text-xs text-stone-500">Run ID: <span className="font-mono text-stone-300">{run.runId}</span></div></div>; })()}</Card>}
                  </div>
                )}

                {view === 'scheduler' && overview && (
                  <div className="space-y-6">
                    <section><h2 className="text-lg font-semibold text-stone-100">Jadwal produksi</h2><p className="mt-1 text-sm text-stone-500">Jadwal mengikuti tanggal Universe yang sedang aktif, bukan jam server.</p></section>
                    <Card className="p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><h3 className="text-base font-semibold text-stone-100">Tanggal yang sedang diproses</h3><StatusBadge status={universeDate && schedules.length ? 'READY' : 'WAITING_FOR_UNIVERSE'} /></div><div className="mt-2 text-xl font-semibold text-stone-100">{formatDate(universeDate)}</div></div>{universeDate && <Button kind="primary" onClick={() => void executeScheduler()} disabled={busy || !mounted}><CalendarClock className="h-4 w-4" /> Jalankan jadwal sekarang</Button>}</div><div className="mt-6 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-semibold text-stone-500">Jadwal terdaftar</div><div className="mt-2 text-2xl font-semibold text-stone-100">{schedules.length}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-semibold text-stone-500">Selesai</div><div className="mt-2 text-2xl font-semibold text-emerald-300">{schedulerCompleted}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] font-semibold text-stone-500">Menunggu / aktif</div><div className="mt-2 text-2xl font-semibold text-amber-300">{schedulerPending}</div></div></div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Daftar jadwal</h3><div className="mt-4 space-y-2">{schedules.map(schedule => <div key={schedule.scheduleId} className="rounded-xl border border-stone-800 bg-stone-950/50 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-semibold text-stone-200">{schedule.pageDefinitionId}</div><div className="mt-1 text-[11px] text-stone-500">{friendlyCadence(schedule.cadence)} · prioritas {schedule.priority}</div></div><StatusBadge status={schedule.enabled ? 'ENABLED' : 'DISABLED'} /></div></div>)}{schedules.length === 0 && <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-600">Belum ada jadwal yang terdaftar.</div>}</div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Pekerjaan pada tanggal Universe ini</h3><div className="mt-4 space-y-2">{scheduledJobs.map(job => <div key={job.jobId} className="rounded-xl border border-stone-800 bg-stone-950/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-semibold text-stone-200">{job.pageDefinitionId}</div><div className="mt-1 text-[10px] text-stone-500">Percobaan {job.attempt} · {job.universeTime}</div></div><div className="flex items-center gap-2"><StatusBadge status={job.status} /></div></div>{job.reason && <div className="mt-2 text-[11px] text-stone-500">{job.reason}</div>}</div>)}{scheduledJobs.length === 0 && <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-600">Belum ada pekerjaan tersimpan untuk tanggal ini.</div>}</div></Card>
                  </div>
                )}

                {view === 'pages' && overview && (
                  <div className="space-y-6">
                    <section><h2 className="text-lg font-semibold text-stone-100">Halaman</h2><p className="mt-1 text-sm text-stone-500">Setiap halaman membaca Universe yang sama. Halaman tidak memiliki Canon sendiri.</p></section>
                    <Card className="p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="text-sm font-semibold text-stone-100">Katalog halaman</div><div className="mt-1 text-xs text-stone-500">{overview.pages.enabled} aktif dari {overview.pages.total} halaman.</div></div><Button onClick={() => void seedPages()} disabled={busy || !mounted}><Layers3 className="h-4 w-4" /> Muat halaman bawaan</Button></div></Card>
                    <div className="grid gap-3">{pages.map(page => <Card key={page.pageDefinitionId} className="p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-stone-100">{page.pageKey}</span><StatusBadge status={page.status} /></div><div className="mt-1 text-xs text-stone-500">Ruang: {page.pageScope} · prioritas {page.priority}</div><div className="mt-2 flex flex-wrap gap-1.5">{page.tags.map(tag => <span key={tag} className="rounded-full border border-stone-800 bg-stone-950 px-2 py-0.5 text-[9px] text-stone-500">#{tag}</span>)}</div></div><Button onClick={() => void togglePage(page.pageDefinitionId, page.status)} disabled={busy}>{page.status === 'ENABLED' ? 'Nonaktifkan' : 'Aktifkan'}</Button></div></Card>)}{pages.length === 0 && <Card className="p-10 text-center text-xs text-stone-600">Belum ada halaman.</Card>}</div>
                  </div>
                )}

                {view === 'history' && (
                  <div className="space-y-6">
                    <section><h2 className="text-lg font-semibold text-stone-100">Riwayat produksi</h2><p className="mt-1 text-sm text-stone-500">Semua eksekusi produksi yang sudah dicatat oleh sistem.</p></section>
                    <div className="space-y-3">{runs.map(run => <Card key={run.runId} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-stone-100">{friendlyPurpose(run.purpose)}</span><StatusBadge status={run.status} /></div><div className="mt-1 text-[11px] text-stone-500">{formatTime(run.timestamp)}</div><div className="mt-1 text-[10px] text-stone-600">Run ID: {run.runId}</div></div><div className="grid grid-cols-3 gap-4 text-center"><div><div className="text-sm font-semibold text-stone-100">{run.inputTokens}</div><div className="text-[10px] text-stone-500">token masuk</div></div><div><div className="text-sm font-semibold text-stone-100">{run.outputTokens}</div><div className="text-[10px] text-stone-500">token keluar</div></div><div><div className="text-sm font-semibold text-stone-100">${run.cost.toFixed(4)}</div><div className="text-[10px] text-stone-500">biaya</div></div></div></div>{run.reason && <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-100/80">{run.reason}</div>}</Card>)}{runs.length === 0 && <Card className="p-10 text-center text-xs text-stone-600">Belum ada riwayat produksi.</Card>}</div>
                    {usage && <Card className="p-5"><div className="text-sm font-semibold text-stone-100">Penggunaan terakhir</div><div className="mt-3 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] text-stone-500">Token masuk</div><div className="mt-2 text-lg font-semibold text-stone-100">{usage.inputTokens}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] text-stone-500">Token keluar</div><div className="mt-2 text-lg font-semibold text-stone-100">{usage.outputTokens}</div></div><div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-[10px] text-stone-500">Biaya</div><div className="mt-2 text-lg font-semibold text-stone-100">${usage.cost.toFixed(4)}</div></div></div></Card>}
                  </div>
                )}

                {view === 'ai' && overview && (
                  <div className="space-y-6">
                    <section><h2 className="text-lg font-semibold text-stone-100">AI & Model</h2><p className="mt-1 text-sm text-stone-500">Informasi koneksi provider dan model yang tersedia untuk produksi.</p></section>
                    <Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-stone-100">Status koneksi</h3><p className="mt-1 text-xs text-stone-500">AI hanya mengusulkan output. Sistem inti tetap menjadi otoritas.</p></div><StatusBadge status={overview.ai.status} /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{overview.ai.providers.map(provider => { const health = providerHealth[provider.providerId]; return <Card key={provider.providerId} className="p-4"><div className="flex items-center justify-between"><div className="text-sm font-semibold text-stone-100">{provider.providerId}</div><StatusBadge status={health?.status ?? 'HEALTHY'} /></div><div className="mt-3 space-y-1 text-[11px] text-stone-500"><div>Model: <span className="font-mono text-stone-300">{provider.modelId}</span></div><div>Tingkat: <span className="text-stone-300">{provider.tier}</span></div><div>Output terstruktur: <span className="text-stone-300">{provider.structuredOutput ? 'Ya' : 'Tidak'}</span></div></div></Card>; })}</div>{overview.ai.providers.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-stone-800 p-8 text-center text-xs text-stone-600">Belum ada provider AI yang terhubung.</div>}</Card>
                  </div>
                )}

                {view === 'system' && readiness && (
                  <div className="space-y-6">
                    <section><h2 className="text-lg font-semibold text-stone-100">Sistem</h2><p className="mt-1 text-sm text-stone-500">Halaman administrasi untuk melihat kesiapan dan detail internal engine.</p></section>
                    <Card className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-stone-100">Kesiapan sistem</h3><p className="mt-1 text-xs text-stone-500">Pemeriksaan operasional.</p></div><StatusBadge status={readiness.status} /></div><div className="mt-6 grid gap-3 md:grid-cols-2">{Object.entries(readiness.checks).map(([name, passed]) => <div key={name} className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 p-4"><div className="text-xs text-stone-300">{friendlyKeys[name] ?? name.replaceAll('_', ' ')}</div><StatusBadge status={passed ? 'READY' : 'UNREADY'} /></div>)}</div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Komponen sistem</h3><div className="mt-4 space-y-2">{Object.entries(readiness.subsystems).map(([name, subsystem]) => <div key={name} className="rounded-xl border border-stone-800 bg-stone-950/50 p-4"><div className="flex items-center justify-between gap-3"><div className="text-xs font-semibold text-stone-200">{friendlyKeys[name] ?? name.replaceAll('_', ' ')}</div><StatusBadge status={subsystem.status} /></div><div className="mt-1 break-all text-[11px] text-stone-500">{subsystem.detail ?? subsystem.rootDir ?? subsystem.jobStoreRoot ?? ''}</div></div>)}</div></Card>
                    <Card className="p-6"><h3 className="text-sm font-semibold text-stone-100">Aturan penting</h3><div className="mt-3 space-y-2 text-xs leading-6 text-stone-400"><div>• Tanggal Universe berasal dari Universe yang aktif.</div><div>• Universe Canonical dimuat melalui penyimpanan resmi.</div><div>• AI tidak menjadi sumber kebenaran Universe.</div><div>• Kegagalan penyimpanan memblokir operasi, bukan diam-diam beralih ke memori.</div><div>• Status jadwal dicatat secara persisten.</div></div></Card>
                  </div>
                )}
              </>
            )}
          </div>

          <footer className="border-t border-stone-800/80 px-4 py-4 text-[10px] text-stone-600 sm:px-6 lg:px-8"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span>Pocer Universe · Pusat kendali aplikasi</span><span>{lastRefreshed ? `Terakhir diperbarui ${lastRefreshed}` : 'Menghubungkan…'}</span></div></footer>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-800 bg-stone-950/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-1">
          {mainNav.slice(0, 4).map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 ${view === item.id ? 'bg-amber-400/10 text-amber-200' : 'text-stone-500'}`}><item.icon className="h-4 w-4" /><span className="truncate text-[9px] font-semibold">{item.label}</span></button>)}
          <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-stone-500"><Menu className="h-4 w-4" /><span className="text-[9px] font-semibold">Lainnya</span></button>
        </div>
      </nav>
    </div>
  );
};
