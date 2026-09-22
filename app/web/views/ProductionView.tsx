import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  FileText,
  BookOpen,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ControlOverview, ProductionRunRecord } from '../types.ts';
import { Card, Button, StatusBadge } from '../components/UIElements.tsx';
import {
  formatFriendlyDate,
  formatFriendlyTime,
  getFriendlyPurpose,
  purposeMap,
} from '../translations.ts';

export function ProductionView({
  overview,
  runs,
  latestRun,
  onRunProduction,
  onNavigateToUniverse,
  busy,
}: {
  overview: ControlOverview;
  runs: ProductionRunRecord[];
  latestRun: ProductionRunRecord | null;
  onRunProduction: (kind: 'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION', instruction: string) => Promise<void>;
  onNavigateToUniverse: () => void;
  busy: boolean;
}) {
  const isMounted = overview.universe.status === 'READY';
  const universeDate = overview.universe.universeDate;
  const [selectedKind, setSelectedKind] = useState<'DAILY_STORY' | 'DAILY_PAGE' | 'GENERAL_PRODUCTION'>('DAILY_STORY');
  const [instruction, setInstruction] = useState('');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const samplePrompts: Record<string, string[]> = {
    DAILY_STORY: [
      'Gambarkan suasana pagi hari di kota pelabuhan dan pertemuan tak terduga antara dua tokoh.',
      'Fokuskan pada dialog mendalam mengenai rahasia masa lalu yang baru terungkap.',
      'Tuliskan adegan penuh ketegangan saat tokoh utama mengambil keputusan sulit.',
    ],
    DAILY_PAGE: [
      'Terbitkan kronik peristiwa yang merangkum perselisihan faksi hari ini.',
      'Buat ringkasan kabar tokoh mengenai siapa yang kini menjadi sekutu baru.',
      'Sajikan tinjauan alur cerita yang menyoroti konsistensi peristiwa.',
    ],
    GENERAL_PRODUCTION: [
      'Eksplorasi sudut pandang tokoh pendukung saat peristiwa besar terjadi.',
      'Buat catatan monolog batin karakter sebelum pertempuran dimulai.',
    ],
  };

  const activeRun = latestRun ?? runs[0] ?? null;

  const handleSubmit = () => {
    void onRunProduction(selectedKind, instruction);
  };

  return (
    <div id="view-production" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-100">
          Studio Penulisan Cerita
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-400">
          Pilih jenis karya yang ingin dibuat. Asisten AI akan menulis naskah dengan mengacu pada karakter dan peristiwa dalam dunia cerita Anda.
        </p>
      </div>

      {/* Warning if Universe not mounted */}
      {!isMounted && (
        <Card className="border-amber-400/30 bg-amber-400/[0.04] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-300 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-amber-100">
                Dunia Cerita Belum Dibuka
              </h4>
              <p className="text-xs leading-relaxed text-stone-300">
                Sebelum asisten AI dapat menulis naskah yang konsisten, Anda perlu membuka Dunia Cerita terlebih dahulu agar konteks latar dan para tokoh terbaca dengan jelas.
              </p>
              <div>
                <Button size="sm" kind="primary" onClick={onNavigateToUniverse}>
                  Buka Dunia Cerita
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Creation form */}
      <Card className="p-6 sm:p-7 border-stone-800 bg-stone-950/70">
        <div className="mb-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            1. Pilih Format Karya
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(['DAILY_STORY', 'DAILY_PAGE', 'GENERAL_PRODUCTION'] as const).map(kind => {
              const meta = purposeMap[kind];
              const isSelected = selectedKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setSelectedKind(kind)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-amber-400/40 bg-amber-400/10 shadow-sm ring-1 ring-amber-400/20'
                      : 'border-stone-800 bg-stone-900/40 hover:border-stone-700 hover:bg-stone-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs text-stone-100">
                    <Sparkles className={`h-3.5 w-3.5 ${isSelected ? 'text-amber-300' : 'text-stone-500'}`} />
                    <span>{meta.title}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-stone-400 leading-relaxed">
                    {meta.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt presets / ideas */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-300" />
            <span>Inspirasi Arahan Cerita (Klik untuk menggunakan):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(samplePrompts[selectedKind] ?? []).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInstruction(prompt)}
                className="rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-1.5 text-left text-[11px] text-stone-300 transition hover:border-amber-400/40 hover:bg-stone-900 hover:text-amber-200"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              2. Petunjuk Khusus Penulisan <span className="font-normal text-stone-500">(Opsional)</span>
            </label>
            {instruction && (
              <button
                type="button"
                onClick={() => setInstruction('')}
                className="text-[11px] text-stone-500 hover:text-stone-300"
              >
                Hapus teks
              </button>
            )}
          </div>
          <textarea
            id="story-instruction-input"
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            rows={4}
            disabled={busy || !isMounted}
            className="w-full rounded-2xl border border-stone-800 bg-stone-950 p-4 text-xs sm:text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
            placeholder={
              isMounted
                ? `Tuliskan arahan cerita untuk tanggal ${formatFriendlyDate(universeDate)}... (Kosongkan bila ingin asisten AI menggunakan naskah standar).`
                : 'Buka dunia cerita terlebih dahulu untuk mulai menulis...'
            }
          />
        </div>

        {/* Submit action */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-800/60">
          <div className="text-[11px] text-stone-500">
            {isMounted ? (
              <span>Penulisan akan mengikuti latar cerita tanggal: <strong className="text-stone-300">{formatFriendlyDate(universeDate)}</strong></span>
            ) : (
              <span>Menunggu pembukaan dunia cerita</span>
            )}
          </div>

          <Button
            id="submit-story-btn"
            kind="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={busy || !isMounted}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sedang Menulis Naskah...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Mulai Tulis {getFriendlyPurpose(selectedKind)}</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Latest Production Result */}
      {activeRun && (
        <Card className="p-6 border-stone-800 bg-stone-950/70">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-800/80">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-400/10 p-2.5 text-amber-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-100">
                  Hasil Penulisan Terakhir: {getFriendlyPurpose(activeRun.purpose)}
                </h3>
                <div className="mt-0.5 text-[11px] text-stone-400">
                  Selesai pada {formatFriendlyTime(activeRun.timestamp)}
                </div>
              </div>
            </div>
            <StatusBadge status={activeRun.status} />
          </div>

          {/* Friendly writing stats */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-stone-800/80 bg-stone-900/60 p-3 text-center">
              <div className="text-base font-bold text-stone-100">
                ~{Math.round((activeRun.outputTokens || 0) * 0.75)} kata
              </div>
              <div className="text-[10px] text-stone-400">Estimasi Panjang Naskah</div>
            </div>
            <div className="rounded-xl border border-stone-800/80 bg-stone-900/60 p-3 text-center">
              <div className="text-base font-bold text-emerald-400">
                100% Konsisten
              </div>
              <div className="text-[10px] text-stone-400">Kesesuaian Alur Cerita</div>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-stone-800/80 bg-stone-900/60 p-3 text-center">
              <div className="text-base font-bold text-stone-200">
                Tersimpan di Pustaka
              </div>
              <div className="text-[10px] text-stone-400">Status Penyimpanan</div>
            </div>
          </div>

          {/* Render readable story content if output available */}
          {activeRun.output && typeof activeRun.output === 'object' && (
            <div className="mt-5 rounded-2xl border border-stone-800 bg-stone-900/40 p-5">
              <div className="text-xs font-semibold text-stone-300 mb-3 flex items-center gap-2">
                <Edit3 className="h-3.5 w-3.5 text-amber-300" />
                <span>Tinjauan Naskah Cerita:</span>
              </div>
              <div className="text-xs sm:text-sm text-stone-300 leading-relaxed space-y-3 font-serif whitespace-pre-wrap">
                {typeof (activeRun.output as any).storyText === 'string'
                  ? (activeRun.output as any).storyText
                  : typeof (activeRun.output as any).summary === 'string'
                    ? (activeRun.output as any).summary
                    : JSON.stringify(activeRun.output, null, 2)}
              </div>
            </div>
          )}

          {activeRun.reason && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-200/90">
              <span className="font-semibold">Catatan Sistem:</span> {activeRun.reason}
            </div>
          )}

          {/* Collapsible Tech Info */}
          <div className="mt-4 pt-3 border-t border-stone-800/60">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="inline-flex items-center gap-2 text-[11px] text-stone-500 hover:text-stone-300"
            >
              {showTechnicalDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showTechnicalDetails ? 'Sembunyikan Detail Teknis ID & Token' : 'Lihat Detail Teknis ID & Token'}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 rounded-xl bg-stone-900/60 p-3 font-mono text-[10px] text-stone-400 space-y-1">
                <div>ID Penulisan: {activeRun.runId}</div>
                <div>Model AI: {activeRun.modelId ?? 'Standar'}</div>
                <div>Token Masuk: {activeRun.inputTokens} · Token Keluar: {activeRun.outputTokens}</div>
                <div>Estimasi Biaya: ${activeRun.cost.toFixed(5)}</div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
