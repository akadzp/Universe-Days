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

import { Button } from './components/UIElements.tsx';
import { Sidebar, mainNavItems, secondaryNavItems } from './components/Navigation.tsx';
import { HomeView } from './views/HomeView.tsx';
import { UniverseView } from './views/UniverseView.tsx';
import { ProductionView } from './views/ProductionView.tsx';
import { SchedulerView } from './views/SchedulerView.tsx';
import { PagesView } from './views/PagesView.tsx';
import { HistoryView } from './views/HistoryView.tsx';
import { AiView } from './views/AiView.tsx';
import { SystemView } from './views/SystemView.tsx';
import { GuideModal } from './views/GuideModal.tsx';

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
      const responses = await Promise.all([
        fetch('/api/control/overview'),
        fetch('/api/control/universe/storage'),
        fetch('/api/control/pages'),
        fetch('/api/production/runs?limit=25'),
        fetch('/api/production/providers'),
        fetch('/api/production/readiness'),
        fetch('/api/control/production/usage'),
        fetch('/api/production/schedules'),
      ]);

      const [ovRes, storageRes, pagesRes, runsRes, providersRes, readinessRes, usageRes, schedulesRes] = responses;
      const pairs = [ovRes, storageRes, pagesRes, runsRes, providersRes, readinessRes, usageRes, schedulesRes];

      for (let i = 0; i < pairs.length; i += 1) {
        if (!pairs[i].ok) {
          throw new Error(`Gagal menyinkronkan data studio (${pairs[i].status}).`);
        }
      }

      const [ov, st, pg, rn, pv, rd, us, sc] = await Promise.all(
        pairs.map(response => response.json())
      );

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
      const response = await fetch('/api/control/universe/load-current', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Gagal membuka dunia cerita.');
      }
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
      const response = await fetch('/api/control/universe/mount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'GENERIC_SEED', universeScope: 'SANDBOX' }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Gagal membuka Ruang Draf Bebas.');
      }
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
      const response = await fetch('/api/control/universe/unmount', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Gagal menutup dunia cerita.');
      }
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

  const seedPages = async () => {
    if (!overview || overview.universe.status !== 'READY') {
      return showToast({
        tone: 'error',
        message: 'Silakan buka dunia cerita terlebih dahulu sebelum memuat format standar.',
      });
    }
    setBusy(true);
    try {
      const response = await fetch('/api/control/pages/seed', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Gagal memuat katalog format.');
      }
      showToast({
        tone: 'ok',
        message: `${result.count} format standar cerita telah ditambahkan ke katalog.`,
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
      const response = await fetch(`/api/production/schedules/execute/${encodeURIComponent(date)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? result.reason ?? 'Gagal mengeksekusi jadwal penerbitan.');
      }
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
      const response = await fetch(`/api/control/pages/${encodeURIComponent(pageId)}/toggle`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Gagal memperbarui status halaman.');
      }
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

      const response = await fetch('/api/control/produce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: kind,
          userInstruction: userInstruction.trim() || fallback,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? result.reason ?? 'Proses penulisan naskah tidak berhasil.');
      }

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

  const allItems = [...mainNavItems, ...secondaryNavItems];
  const activeNavItem = allItems.find(i => i.id === view) ?? mainNavItems[0];

  return (
    <div className="min-h-screen bg-[#08090b] text-stone-200 antialiased selection:bg-amber-400/20 selection:text-amber-200">
      <div className="mx-auto flex min-h-screen max-w-[1550px] border-x border-stone-800/80 bg-[#0b0c0f]">
        {/* Desktop Sidebar */}
        <Sidebar
          currentView={view}
          onNavigate={v => {
            setView(v);
            setMobileMenuOpen(false);
          }}
          systemStatus={readiness?.status ?? 'READY'}
          onOpenGuide={() => setGuideOpen(true)}
        />

        {/* Main Content Pane */}
        <main className="min-w-0 flex-1 flex flex-col pb-20 lg:pb-0">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-[#0b0c0f]/95 px-4 py-3.5 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-amber-300/80 uppercase tracking-wider">
                  Pocer Universe
                </div>
                <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight text-stone-100 sm:text-xl">
                  {activeNavItem.label}
                </h1>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Active story date badge */}
                {isMounted && universeDate && (
                  <div className="hidden sm:flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-950/80 px-3 py-1.5 text-xs text-stone-300">
                    <BookOpen className="h-3.5 w-3.5 text-amber-300" />
                    <span>Tanggal Cerita: <strong className="text-stone-100">{formatFriendlyDate(universeDate)}</strong></span>
                  </div>
                )}

                {/* Quick guide button */}
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-950 px-3 py-2 text-xs font-medium text-stone-300 hover:border-stone-700 hover:text-amber-200 transition"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Panduan</span>
                </button>

                {/* Refresh button */}
                <Button
                  size="md"
                  onClick={() => void refresh()}
                  disabled={loading || busy}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Perbarui</span>
                </Button>

                {/* Mobile Menu trigger */}
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-800 bg-stone-950 text-stone-300 lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Buka menu navigasi"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div
                className="ml-auto h-full w-[86%] max-w-sm overflow-y-auto border-l border-stone-800 bg-stone-950 p-5 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="mb-6 flex items-center justify-between border-b border-stone-800 pb-4">
                  <div>
                    <div className="text-sm font-semibold text-stone-100">Navigasi Studio</div>
                    <div className="text-[11px] text-stone-400">Pusat Penulisan Pocer Universe</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Menu Utama
                </div>
                <div className="space-y-1">
                  {mainNavItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                        view === item.id
                          ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                          : 'border-transparent text-stone-300 hover:bg-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </div>
                      <div className="mt-0.5 pl-7 text-[10px] text-stone-500">{item.hint}</div>
                    </button>
                  ))}
                </div>

                <div className="my-4 border-t border-stone-800" />

                <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Pustaka & Pengaturan
                </div>
                <div className="space-y-1">
                  {secondaryNavItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        view === item.id
                          ? 'border-stone-700 bg-stone-900 text-stone-100'
                          : 'border-transparent text-stone-300 hover:bg-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setGuideOpen(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-800 bg-stone-900 px-3 py-2.5 text-xs text-stone-300"
                  >
                    <HelpCircle className="h-4 w-4 text-amber-300" />
                    <span>Buka Panduan Singkat</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast notifications */}
          <div className="p-4 sm:p-6 lg:p-8 flex-1">
            {toast && (
              <div
                className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-xs shadow-lg transition-all ${
                  toast.tone === 'error'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                    : toast.tone === 'ok'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                      : 'border-amber-400/30 bg-amber-400/10 text-amber-100'
                }`}
              >
                {toast.tone === 'error' ? (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                ) : toast.tone === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">{toast.message}</div>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="rounded p-1 hover:bg-stone-900/40 text-stone-400 hover:text-stone-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Main content conditional view rendering */}
            {loading && !overview ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
                <div className="text-xs text-stone-400 font-medium">
                  Menyiapkan Ruang Kerja Cerita...
                </div>
              </div>
            ) : overview ? (
              <>
                {view === 'home' && (
                  <HomeView
                    overview={overview}
                    runs={runs}
                    schedules={schedules}
                    onNavigate={setView}
                    onLoadCurrentUniverse={loadCurrentUniverse}
                    busy={busy}
                  />
                )}

                {view === 'universe' && (
                  <UniverseView
                    overview={overview}
                    storage={storage}
                    onLoadCurrentUniverse={loadCurrentUniverse}
                    onLoadSandbox={loadSandbox}
                    onUnmount={unmount}
                    busy={busy}
                  />
                )}

                {view === 'production' && (
                  <ProductionView
                    overview={overview}
                    runs={runs}
                    latestRun={latestRun}
                    onRunProduction={runProduction}
                    onNavigateToUniverse={() => setView('universe')}
                    busy={busy}
                  />
                )}

                {view === 'scheduler' && (
                  <SchedulerView
                    universeDate={universeDate}
                    schedules={schedules}
                    scheduledJobs={scheduledJobs}
                    onExecuteScheduler={executeScheduler}
                    busy={busy}
                  />
                )}

                {view === 'pages' && (
                  <PagesView
                    pages={pages}
                    onSeedPages={seedPages}
                    onTogglePage={togglePage}
                    isMounted={isMounted}
                    busy={busy}
                  />
                )}

                {view === 'history' && (
                  <HistoryView runs={runs} usage={usage} />
                )}

                {view === 'ai' && (
                  <AiView overview={overview} providerHealth={providerHealth} />
                )}

                {view === 'system' && (
                  <SystemView readiness={readiness} overview={overview} />
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <footer className="mt-auto border-t border-stone-800/80 px-4 py-3.5 text-[11px] text-stone-500 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span>Pocer Universe · Studio Penulisan & Konsistensi Cerita</span>
              <span>{lastRefreshed ? `Disinkronkan pukul ${lastRefreshed}` : 'Menghubungkan ke studio...'}</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-800/90 bg-stone-950/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {mainNavItems.slice(0, 4).map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 transition ${
                  active ? 'text-amber-300 font-semibold' : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 rounded-xl px-2.5 py-1.5 text-stone-500 hover:text-stone-300"
          >
            <Menu className="h-4 w-4" />
            <span className="text-[10px]">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* User Guide Modal */}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
    </div>
  );
};
