import React, { useCallback, useEffect, useState } from 'react';
import {
  Menu,
  X,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BookOpen,
  HelpCircle,
  Sparkles,
  TestTube,
} from 'lucide-react';

import {
  ControlOverview,
  DeploymentReadiness,
  PageDefinition,
  ProductionRunRecord,
  ProviderHealthInfo,
  ScheduleDefinition,
  ScheduledJobRecord,
  ToastState,
  UniverseStorage,
  UsageSummary,
  View,
} from './types.ts';

import {
  decodeFriendlyError,
  formatFriendlyDate,
  getFriendlyPurpose,
  getFriendlyStatus,
} from './translations.ts';

import { Button, ModeBadge } from './components/UIElements.tsx';
import { Sidebar, mainNavItems, secondaryNavItems } from './components/Navigation.tsx';
import { HomeView } from './views/HomeView.tsx';
import { UniverseView } from './views/UniverseView.tsx';
import { ProductionView } from './views/ProductionView.tsx';
import { SchedulerView } from './views/SchedulerView.tsx';
import { PagesView } from './views/PagesView.tsx';
import { HistoryView } from './views/HistoryView.tsx';
import { SandboxView } from './views/SandboxView.tsx';
import { AiView } from './views/AiView.tsx';
import { SystemView } from './views/SystemView.tsx';
import { GuideModal } from './views/GuideModal.tsx';

async function safeFetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const contentType = response.headers.get('content-type') ?? '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error(`Permintaan ke ${url} gagal (${response.status})`);
      }
      return {} as T;
    }
  }
  if (!response.ok) {
    throw new Error(data?.error ?? data?.message ?? data?.reason ?? `Gagal memproses (${response.status})`);
  }
  return data;
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
  const [guideOpen, setGuideOpen] = useState(false);
  const [latestRun, setLatestRun] = useState<ProductionRunRecord | null>(null);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    window.setTimeout(() => {
      setToast(current => (current?.message === next.message ? null : current));
    }, 4000);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, st, pg, rn, pv, rd, us, sc] = await Promise.all([
        safeFetchJson<ControlOverview>('/api/control/overview'),
        safeFetchJson<UniverseStorage>('/api/control/universe/storage'),
        safeFetchJson<{ definitions: PageDefinition[] }>('/api/control/pages'),
        safeFetchJson<{ runs: ProductionRunRecord[] }>('/api/production/runs?limit=25'),
        safeFetchJson<{ health: Record<string, ProviderHealthInfo> }>('/api/production/providers'),
        safeFetchJson<DeploymentReadiness>('/api/production/readiness'),
        safeFetchJson<UsageSummary>('/api/control/production/usage'),
        safeFetchJson<{ schedules: ScheduleDefinition[] }>('/api/production/schedules'),
      ]);

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
        try {
          const jobs = await safeFetchJson<{ jobs: ScheduledJobRecord[] }>(
            `/api/production/schedules/jobs/${encodeURIComponent(date)}`
          );
          setScheduledJobs(jobs.jobs ?? []);
        } catch {
          setScheduledJobs([]);
        }
      } else {
        setScheduledJobs([]);
      }

      setLastRefreshed(new Date().toLocaleTimeString('id-ID'));
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadCurrentUniverse = async () => {
    setBusy(true);
    try {
      const result = await safeFetchJson<{ universe?: { universeDate?: string } }>('/api/control/universe/load-current', { method: 'POST' });
      showToast({
        tone: 'ok',
        message: `Dunia cerita berhasil dibuka untuk tanggal ${formatFriendlyDate(result.universe?.universeDate)}.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const loadSandbox = async () => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/universe/mount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'GENERIC_SEED', universeScope: 'SANDBOX' }),
      });
      showToast({
        tone: 'info',
        message: 'Ruang Draf Bebas dibuka. Anda dapat mencoba ide cerita tanpa mengubah arsip resmi.',
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const unmount = async () => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/universe/unmount', { method: 'POST' });
      showToast({
        tone: 'ok',
        message: 'Dunia cerita telah ditutup sementara. Semua naskah dan data tetap aman tersimpan.',
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const advanceDay = async (days: number) => {
    setBusy(true);
    try {
      const result = await safeFetchJson<{ universe?: { universeDate?: string } }>('/api/control/universe/advance-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      showToast({
        tone: 'ok',
        message: `Garis waktu berhasil dimajukan ke ${formatFriendlyDate(result.universe?.universeDate)}.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const cloneToSandbox = async () => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/universe/clone-to-sandbox', { method: 'POST' });
      showToast({
        tone: 'info',
        message: 'Dunia cerita berhasil dikloning ke Laboratorium Sandbox.',
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const addCharacter = async (data: { displayName: string; role: string; background: string; traits: string[] }) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/universe/entity/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showToast({
        tone: 'ok',
        message: `Tokoh "${data.displayName}" berhasil ditambahkan ke Sandbox.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const addLocation = async (data: { displayName: string; locationType: string; accessibilityStatus: string }) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/universe/entity/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showToast({
        tone: 'ok',
        message: `Wilayah "${data.displayName}" berhasil ditambahkan ke Sandbox.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const addObject = async (data: { displayName: string; objectType: string; condition: string }) => {
    setBusy(true);
    try {
      await safeFetchJson('/api/control/universe/entity/object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showToast({
        tone: 'ok',
        message: `Benda pusaka "${data.displayName}" berhasil ditambahkan ke Sandbox.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const seedPages = async () => {
    if (!overview || overview.universe.status !== 'READY') {
      return showToast({
        tone: 'error',
        message: 'Silakan buka dunia cerita terlebih dahulu sebelum memuat format standar.',
      });
    }
    setBusy(true);
    try {
      const result = await safeFetchJson<{ count?: number }>('/api/control/pages/seed', { method: 'POST' });
      showToast({
        tone: 'ok',
        message: `${result.count ?? 3} format standar cerita telah ditambahkan ke katalog.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const executeScheduler = async () => {
    const date = overview?.universe?.universeDate;
    if (!date) {
      return showToast({
        tone: 'error',
        message: 'Belum ada tanggal cerita yang aktif untuk menjalankan penerbitan.',
      });
    }
    setBusy(true);
    try {
      const result = await safeFetchJson<{ status?: string; completed?: number; skipped?: number }>(
        `/api/production/schedules/execute/${encodeURIComponent(date)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      showToast({
        tone: result.status === 'COMPLETED' ? 'ok' : 'info',
        message: `Penerbitan ${formatFriendlyDate(date)} selesai: ${result.completed ?? 0} terbit, ${result.skipped ?? 0} dilewati.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const togglePage = async (pageId: string, currentStatus: string) => {
    setBusy(true);
    try {
      await safeFetchJson(`/api/control/pages/${encodeURIComponent(pageId)}/toggle`, {
        method: 'POST',
      });
      showToast({
        tone: 'ok',
        message: `Format halaman sekarang ${currentStatus === 'ENABLED' ? 'dinonaktifkan' : 'diaktifkan'}.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const runProduction = async (
    kind: 'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION',
    userInstruction: string
  ) => {
    if (!overview || overview.universe.status !== 'READY') {
      return showToast({
        tone: 'error',
        message: 'Buka dunia cerita terlebih dahulu sebelum memulai penulisan naskah.',
      });
    }
    setBusy(true);
    try {
      const fallback =
        kind === 'DAILY_STORY'
          ? 'Tuliskan kisah narasi hari ini berdasarkan kondisi dunia cerita dan relasi para tokoh saat ini.'
          : kind === 'DAILY_PAGE'
            ? 'Terbitkan format halaman bacaan berdasarkan peristiwa dunia cerita yang sedang berlangsung.'
            : 'Tuliskan naskah cerita sesuai instruksi penulisan bebas.';

      const result = await safeFetchJson<ProductionRunRecord>('/api/control/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: kind,
          userInstruction: userInstruction.trim() || fallback,
        }),
      });

      setLatestRun(result);
      showToast({
        tone: result.status === 'COMPLETED' ? 'ok' : 'info',
        message: `Naskah "${getFriendlyPurpose(kind)}" berhasil diselesaikan.`,
      });
      await refresh();
    } catch (error) {
      showToast({ tone: 'error', message: decodeFriendlyError(error) });
    } finally {
      setBusy(false);
    }
  };

  const isMounted = overview?.universe?.status === 'READY';
  const universeDate = overview?.universe?.universeDate ?? null;
  const isSandbox = overview?.universe?.universeScope === 'SANDBOX';

  const allItems = [...mainNavItems, ...secondaryNavItems];
  const activeNavItem = allItems.find(i => i.id === view) ?? mainNavItems[0];

  return (
    <div className="min-h-screen bg-[#EEF2F7] text-slate-900 antialiased selection:bg-amber-300 selection:text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {/* Desktop Sidebar */}
        <Sidebar
          currentView={view}
          onNavigate={v => {
            setView(v);
            setMobileMenuOpen(false);
          }}
          systemStatus={readiness?.status ?? 'READY'}
          onOpenGuide={() => setGuideOpen(true)}
          isSandbox={isSandbox}
        />

        {/* Main Content Pane */}
        <main className="min-w-0 flex-1 flex flex-col pb-20 lg:pb-0">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b-2 border-white/80 bg-[#F4F7FB]/90 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8 shadow-[0_4px_16px_rgba(160,175,200,0.12)]">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Pocer Universe
                </div>
                <h1 className="mt-0.5 truncate text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  {activeNavItem.label}
                </h1>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Active Mode Switcher / Badge in Header */}
                <div className="hidden sm:block">
                  <ModeBadge isSandbox={isSandbox} />
                </div>

                {/* Quick guide button */}
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border-2 border-white bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:text-amber-700 shadow-sm transition"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Panduan</span>
                </button>

                {/* Refresh button */}
                <Button
                  size="md"
                  kind="secondary"
                  onClick={() => void refresh()}
                  disabled={loading || busy}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Perbarui</span>
                </Button>

                {/* Mobile Menu trigger */}
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-white bg-white text-slate-700 lg:hidden shadow-sm"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Buka menu navigasi"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative flex w-80 max-w-full flex-col bg-[#F4F7FB] p-6 shadow-2xl border-r-2 border-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5 font-black text-slate-900">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <span>Pocer Universe</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <ModeBadge isSandbox={isSandbox} />
                </div>

                <nav className="space-y-1.5 overflow-y-auto">
                  {allItems.map(item => {
                    const Icon = item.icon;
                    const active = view === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setView(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full rounded-2xl p-3 text-left transition ${
                          active
                            ? 'bg-amber-100 border-2 border-amber-300 font-bold text-slate-900 shadow-sm'
                            : 'bg-white border-2 border-transparent text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-bold">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          {/* Main Content Views */}
          <div className="p-4 sm:p-6 lg:p-8 flex-1">
            {view === 'home' && overview && (
              <HomeView
                overview={overview}
                runs={runs}
                schedules={schedules}
                onNavigate={setView}
                onLoadCurrentUniverse={loadCurrentUniverse}
                onLoadSandbox={loadSandbox}
                busy={busy}
              />
            )}

            {view === 'universe' && overview && (
              <UniverseView
                overview={overview}
                storage={storage}
                onLoadCurrentUniverse={loadCurrentUniverse}
                onLoadSandbox={loadSandbox}
                onUnmount={unmount}
                onNavigateToSandbox={() => setView('sandbox')}
                busy={busy}
              />
            )}

            {view === 'production' && overview && (
              <ProductionView
                overview={overview}
                runs={runs}
                latestRun={latestRun}
                onRunProduction={runProduction}
                onNavigateToUniverse={() => setView('universe')}
                busy={busy}
              />
            )}

            {view === 'pages' && (
              <PagesView
                pages={pages}
                onSeedPages={seedPages}
                onTogglePage={togglePage}
                isMounted={isMounted}
                isSandbox={isSandbox}
                busy={busy}
              />
            )}

            {view === 'scheduler' && (
              <SchedulerView
                universeDate={universeDate}
                schedules={schedules}
                scheduledJobs={scheduledJobs}
                onExecuteScheduler={executeScheduler}
                isSandbox={isSandbox}
                busy={busy}
              />
            )}

            {view === 'history' && (
              <HistoryView
                runs={runs}
                usage={usage}
                isSandbox={isSandbox}
              />
            )}

            {view === 'sandbox' && overview && (
              <SandboxView
                overview={overview}
                runs={runs}
                onRunProduction={runProduction}
                onAdvanceDay={advanceDay}
                onCloneToSandbox={cloneToSandbox}
                onAddCharacter={addCharacter}
                onAddLocation={addLocation}
                onAddObject={addObject}
                onLoadCurrentUniverse={loadCurrentUniverse}
                busy={busy}
              />
            )}

            {view === 'ai' && overview && (
              <AiView
                overview={overview}
                providerHealth={providerHealth}
                isSandbox={isSandbox}
              />
            )}

            {view === 'system' && overview && (
              <SystemView
                overview={overview}
                readiness={readiness}
                isSandbox={isSandbox}
              />
            )}
          </div>
        </main>
      </div>

      {/* Guide Modal */}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}

      {/* Toast notification */}
      {toast && (
        <div
          id="toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 border-white bg-white p-4 shadow-2xl animate-in slide-in-from-bottom-3 max-w-md"
        >
          {toast.tone === 'ok' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
          {toast.tone === 'error' && <XCircle className="h-5 w-5 text-rose-600 shrink-0" />}
          {toast.tone === 'info' && <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0" />}
          <div className="text-xs font-bold text-slate-800 leading-snug">{toast.message}</div>
        </div>
      )}
    </div>
  );
};
export default App;
