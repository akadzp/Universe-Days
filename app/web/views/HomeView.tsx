import React from 'react';
import {
  Sparkles,
  BookOpen,
  CalendarCheck,
  FileText,
  Clock,
  ArrowRight,
  Bot,
  ShieldCheck,
  CheckCircle2,
  TestTube,
  Users,
  Compass,
  Zap,
} from 'lucide-react';
import { ControlOverview, ProductionRunRecord, ScheduleDefinition, View } from '../types.ts';
import { Card, Button, StatusBadge, ModeBadge } from '../components/UIElements.tsx';
import {
  formatFriendlyDate,
  formatFriendlyTime,
  getFriendlyPurpose,
  getFriendlyScope,
} from '../translations.ts';

export function HomeView({
  overview,
  runs,
  schedules,
  onNavigate,
  onLoadCurrentUniverse,
  onLoadSandbox,
  busy,
}: {
  overview: ControlOverview;
  runs: ProductionRunRecord[];
  schedules: ScheduleDefinition[];
  onNavigate: (view: View) => void;
  onLoadCurrentUniverse: () => Promise<void>;
  onLoadSandbox: () => Promise<void>;
  busy: boolean;
}) {
  const isUniverseActive = overview.universe.status === 'READY';
  const universeDate = overview.universe.universeDate;
  const isSandbox = overview.universe.universeScope === 'SANDBOX';
  const latestRun = runs[0];

  return (
    <div id="view-home" className="space-y-6">
      {/* Top Banner with Distinctive Mode & Welcome */}
      <section
        className={`relative overflow-hidden p-6 sm:p-8 ${
          isSandbox ? 'clay-card-active-sandbox' : 'clay-card-ambient'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <ModeBadge isSandbox={isSandbox} />
              {isUniverseActive && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  <Compass className="h-3.5 w-3.5 text-amber-500" />
                  Tanggal Alur: <strong className="text-slate-900">{formatFriendlyDate(universeDate)}</strong>
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {isSandbox
                ? 'Laboratorium Kreatif & Ruang Simulasi'
                : 'Selamat Datang di Studio Cerita Pocer'}
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
              {isSandbox
                ? 'Di Mode Sandbox, Anda bebas menguji coba alur masa depan, membuat karakter baru, dan mengeksplorasi ide cerita tanpa mengubah arsip resmi.'
                : 'Kelola dunia cerita, tulis bab baru bersama asisten AI, dan jadwalkan publikasi naskah harian dengan konsistensi alur yang terjamin.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {!isUniverseActive ? (
              <Button
                id="home-load-universe-btn"
                kind="primary"
                size="lg"
                onClick={() => void onLoadCurrentUniverse()}
                disabled={busy}
              >
                <BookOpen className="h-5 w-5" />
                Buka Cerita Terakhir
              </Button>
            ) : (
              <Button
                id="home-start-writing-btn"
                kind={isSandbox ? 'indigo' : 'primary'}
                size="lg"
                onClick={() => onNavigate('production')}
                disabled={busy}
              >
                <Sparkles className="h-5 w-5" />
                Tulis Naskah Baru
              </Button>
            )}

            {!isSandbox ? (
              <Button
                id="home-open-sandbox-btn"
                kind="indigo"
                size="md"
                onClick={() => onNavigate('sandbox')}
                disabled={busy}
              >
                <TestTube className="h-4 w-4" />
                Buka Sandbox
              </Button>
            ) : (
              <Button
                id="home-open-canon-btn"
                kind="primary"
                size="md"
                onClick={() => void onLoadCurrentUniverse()}
                disabled={busy}
              >
                <BookOpen className="h-4 w-4" />
                Kembali ke Kanun
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* 4 Feature Activity Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tile 1: Ensiklopedia */}
        <div
          onClick={() => onNavigate('universe')}
          className="clay-card p-5 cursor-pointer hover:scale-[1.02] transition-transform duration-150 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border-2 border-amber-200 shadow-sm">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-500">Ensiklopedia</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Dunia & Tokoh Cerita</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Jelajahi karakter, kepribadian, peta wilayah, dan benda pusaka sejarah.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-700">
            <span>Buka Ensiklopedia</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Tile 2: Tulis Naskah */}
        <div
          onClick={() => onNavigate('production')}
          className="clay-card p-5 cursor-pointer hover:scale-[1.02] transition-transform duration-150 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-800 border-2 border-rose-200 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-500">Penulisan</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Tulis Naskah Bab</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Tulis bab harian, naskah drama, atau monolog dibimbing konteks alur.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-rose-700">
            <span>Mulai Menulis</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Tile 3: Jadwal Terbit */}
        <div
          onClick={() => onNavigate('scheduler')}
          className="clay-card p-5 cursor-pointer hover:scale-[1.02] transition-transform duration-150 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 border-2 border-teal-200 shadow-sm">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-500">Otomasi</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Jadwal Terbit Otomatis</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Publikasikan kronik dan format bacaan seiring bertambahnya hari cerita.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-teal-700">
            <span>Atur Jadwal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Tile 4: Lab Sandbox */}
        <div
          onClick={() => onNavigate('sandbox')}
          className="clay-card p-5 cursor-pointer hover:scale-[1.02] transition-transform duration-150 flex flex-col justify-between border-2 border-indigo-200/80"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-800 border-2 border-indigo-200 shadow-sm">
                <TestTube className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-bold text-indigo-700">Eksperimen</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Lab Simulasi & Waktu</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Majukan tanggal alur, uji tokoh baru, dan tes prompt naskah tanpa risiko.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-700">
            <span>Masuk Laboratorium</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Main Studio Overview Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Recent Story Work */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Naskah Terakhir yang Dibuat</h3>
                  <p className="text-[11px] text-slate-600">Arsip naskah dari sesi penulisan terbaru</p>
                </div>
              </div>
              <Button size="sm" kind="ghost" onClick={() => onNavigate('history')}>
                Lihat Semua ({runs.length})
              </Button>
            </div>

            {latestRun ? (
              <div className="rounded-2xl border-2 border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {getFriendlyPurpose(latestRun.purpose)}
                    </span>
                    <StatusBadge status={latestRun.status} />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">
                    {formatFriendlyTime(latestRun.timestamp)}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-700 line-clamp-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {typeof latestRun.output === 'string'
                    ? latestRun.output
                    : latestRun.output?.storyText ||
                      latestRun.output?.summary ||
                      'Naskah tersimpan rapi dan siap dibaca di Pustaka.'}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-600 font-medium">
                    Estimasi: ~{Math.round((latestRun.outputTokens || 0) * 0.75)} kata
                  </div>
                  <Button size="sm" kind="secondary" onClick={() => onNavigate('history')}>
                    Baca Naskah Lengkap
                  </Button>
                </div>
              </div>
            ) : (
              <div className="clay-inset p-8 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Belum Ada Naskah yang Ditulis</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Mulai petualangan cerita pertama Anda dengan membuka studio penulisan.
                </p>
                <div>
                  <Button
                    size="md"
                    kind="primary"
                    onClick={() => onNavigate('production')}
                    disabled={!isUniverseActive}
                  >
                    Tulis Cerita Pertama
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Status & Assistance */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Status Kesiapan Studio</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-semibold text-slate-700">Dunia Cerita</div>
                <StatusBadge status={overview.universe.status} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-semibold text-slate-700">Asisten AI</div>
                <StatusBadge status={overview.ai.status} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-semibold text-slate-700">Format Halaman</div>
                <span className="text-xs font-bold text-slate-800">
                  {overview.pages.enabled} / {overview.pages.total} Aktif
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <Button
                size="sm"
                kind="secondary"
                className="w-full"
                onClick={() => onNavigate('system')}
              >
                Lihat Rincian Cadangan & Sistem
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
