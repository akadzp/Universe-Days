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
} from 'lucide-react';
import { ControlOverview, ProductionRunRecord, ScheduleDefinition, View } from '../types.ts';
import { Card, Button, StatusBadge } from '../components/UIElements.tsx';
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
  busy,
}: {
  overview: ControlOverview;
  runs: ProductionRunRecord[];
  schedules: ScheduleDefinition[];
  onNavigate: (view: View) => void;
  onLoadCurrentUniverse: () => Promise<void>;
  busy: boolean;
}) {
  const isUniverseActive = overview.universe.status === 'READY';
  const universeDate = overview.universe.universeDate;
  const latestRun = runs[0];

  return (
    <div id="view-home" className="space-y-6">
      {/* Welcome & Primary Action Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-stone-800 bg-gradient-to-br from-stone-900 via-stone-950 to-[#08090b] p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            Studio Penulisan Cerita Pocer
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            Selamat datang di Ruang Kerja Cerita.
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-stone-400">
            Mulai dari mengelola latar dunia cerita, menulis naskah bersama asisten AI, hingga menjadwalkan penerbitan bab baru secara otomatis. Alur cerita dan karakter selalu dijaga agar konsisten.
          </p>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          {!isUniverseActive ? (
            <Button
              id="home-load-universe-btn"
              kind="primary"
              size="md"
              onClick={() => void onLoadCurrentUniverse()}
              disabled={busy}
            >
              <BookOpen className="h-4 w-4" />
              Buka Cerita Terakhir
            </Button>
          ) : (
            <Button
              id="home-start-writing-btn"
              kind="primary"
              size="md"
              onClick={() => onNavigate('production')}
              disabled={busy}
            >
              <Sparkles className="h-4 w-4" />
              Tulis Cerita Hari Ini
            </Button>
          )}

          <Button
            id="home-explore-world-btn"
            kind="secondary"
            size="md"
            onClick={() => onNavigate('universe')}
            disabled={busy}
          >
            <BookOpen className="h-4 w-4" />
            Kelola Dunia Cerita
          </Button>

          <Button
            id="home-view-history-btn"
            kind="secondary"
            size="md"
            onClick={() => onNavigate('history')}
            disabled={busy}
          >
            <Clock className="h-4 w-4" />
            Pustaka Cerita
          </Button>
        </div>
      </section>

      {/* 3 Core Highlight Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* World / Universe Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-stone-400">
                <BookOpen className="h-4 w-4 text-sky-400" />
                Dunia Cerita
              </span>
              <StatusBadge status={overview.universe.status} />
            </div>
            <div className="mt-4 text-base font-semibold text-stone-100 truncate">
              {overview.universe.universeId ? (
                overview.universe.universeId.replace(/_/g, ' ')
              ) : (
                'Belum Dibuka'
              )}
            </div>
            <div className="mt-1 text-xs text-amber-300/80 font-medium">
              {formatFriendlyDate(universeDate)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-stone-500">
            <span>Status: {getFriendlyScope(overview.universe.universeScope)}</span>
            <button
              type="button"
              onClick={() => onNavigate('universe')}
              className="text-stone-400 hover:text-amber-200 transition"
            >
              Ubah &rarr;
            </button>
          </div>
        </Card>

        {/* AI Assistant Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-stone-400">
                <Bot className="h-4 w-4 text-violet-400" />
                Asisten Penulis AI
              </span>
              <StatusBadge status={overview.ai.status} />
            </div>
            <div className="mt-4 text-base font-semibold text-stone-100">
              {overview.models.connected > 0 ? 'Siap Membantu Menulis' : 'Belum Ada Model'}
            </div>
            <div className="mt-1 text-xs text-stone-400">
              {overview.models.connected > 0
                ? `${overview.models.connected} model cerdas tersambung`
                : 'Menunggu koneksi model'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-stone-500">
            <span>Model menjaga alur cerita</span>
            <button
              type="button"
              onClick={() => onNavigate('ai')}
              className="text-stone-400 hover:text-amber-200 transition"
            >
              Lihat &rarr;
            </button>
          </div>
        </Card>

        {/* Quality & Consistency Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-stone-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Kualitas & Konsistensi
              </span>
              <StatusBadge status={overview.runtime.status} />
            </div>
            <div className="mt-4 text-base font-semibold text-stone-100">
              Pemeriksaan Alur Aktif
            </div>
            <div className="mt-1 text-xs text-stone-400">
              Tokoh & peristiwa diverifikasi otomatis
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-stone-500">
            <span>Bebas kontradiksi cerita</span>
            <button
              type="button"
              onClick={() => onNavigate('system')}
              className="text-stone-400 hover:text-amber-200 transition"
            >
              Detail &rarr;
            </button>
          </div>
        </Card>
      </div>

      {/* Activities & Latest Output */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workspace Quick Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-100">Aktivitas Penulisan</h3>
              <p className="mt-0.5 text-xs text-stone-500">Kesiapan alur kerja dan publikasi.</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Daily Story item */}
            <div className="flex items-center justify-between rounded-xl border border-stone-800/70 bg-stone-950/50 p-3.5 transition hover:border-stone-700">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-400/10 p-2 text-amber-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-200">Kisah Hari Ini</div>
                  <div className="text-[11px] text-stone-400">
                    {isUniverseActive ? `Siap untuk ${formatFriendlyDate(universeDate)}` : 'Perlu buka dunia cerita'}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                kind="ghost"
                onClick={() => onNavigate('production')}
                className="text-stone-300 hover:text-amber-200"
              >
                Tulis <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Pages Catalog item */}
            <div className="flex items-center justify-between rounded-xl border border-stone-800/70 bg-stone-950/50 p-3.5 transition hover:border-stone-700">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-sky-400/10 p-2 text-sky-300">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-200">Format Halaman Cerita</div>
                  <div className="text-[11px] text-stone-400">
                    {overview.pages.enabled} format aktif dari {overview.pages.total} format
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                kind="ghost"
                onClick={() => onNavigate('pages')}
                className="text-stone-300 hover:text-amber-200"
              >
                Kelola <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Scheduler item */}
            <div className="flex items-center justify-between rounded-xl border border-stone-800/70 bg-stone-950/50 p-3.5 transition hover:border-stone-700">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-300">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-200">Jadwal Terbit</div>
                  <div className="text-[11px] text-stone-400">
                    {schedules.length} tugas terjadwal terdaftar
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                kind="ghost"
                onClick={() => onNavigate('scheduler')}
                className="text-stone-300 hover:text-amber-200"
              >
                Lihat <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Latest Written Story Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-100">Karya Cerita Terakhir</h3>
              <p className="mt-0.5 text-xs text-stone-500">Hasil naskah yang baru saja ditulis.</p>
            </div>
            <Clock className="h-4 w-4 text-stone-500" />
          </div>

          {latestRun ? (
            <div className="rounded-xl border border-stone-800 bg-stone-950/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-stone-200">
                    {getFriendlyPurpose(latestRun.purpose)}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    Dibuat pada {formatFriendlyTime(latestRun.timestamp)}
                  </div>
                </div>
                <StatusBadge status={latestRun.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-stone-800/80">
                <div className="rounded-lg bg-stone-900/80 p-2.5 text-center">
                  <div className="text-xs font-semibold text-stone-200">
                    ~{Math.round((latestRun.outputTokens || 0) * 0.75)} kata
                  </div>
                  <div className="text-[10px] text-stone-500">Panjang Cerita</div>
                </div>
                <div className="rounded-lg bg-stone-900/80 p-2.5 text-center">
                  <div className="text-xs font-semibold text-emerald-400">
                    Tersimpan Aman
                  </div>
                  <div className="text-[10px] text-stone-500">Status Dokumen</div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  kind="secondary"
                  onClick={() => onNavigate('history')}
                >
                  Buka di Pustaka Cerita
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-800 p-8 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-stone-600 mb-2" />
              <div className="text-xs text-stone-400">Belum ada cerita yang dibuat.</div>
              <div className="mt-1 text-[11px] text-stone-600">
                Klik tombol "Tulis Cerita Hari Ini" untuk memulai episode pertama.
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
