import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import type { AuthoritativeUniverse, ProductionRunResponse } from '../types';

interface CeritaViewProps {
  universe: AuthoritativeUniverse | null;
}

export const CeritaView: React.FC<CeritaViewProps> = ({ universe }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<ProductionRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunProduction = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const res = await fetch('/api/production/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Gagal menjalankan produksi cerita');
      }

      setLastRun(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-neutral-100">Cerita Workspace</h2>
          </div>
          <p className="text-xs text-neutral-400">
            Pipeline Produksi Naratif Harian (Daily Story & Page Projection) bersumber dari Canon
            Semesta.
          </p>
        </div>

        <button
          onClick={handleRunProduction}
          disabled={isRunning}
          className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg transition cursor-pointer self-start sm:self-auto"
        >
          {isRunning ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-indigo-200" />
              <span>Memproduksi Cerita...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-white fill-white" />
              <span>Jalankan Produksi Harian</span>
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800/70 rounded-xl flex items-center space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Context Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-neutral-500">
            KONTEKS TEMPORAL AKTIF
          </span>
          <div className="text-sm font-bold font-mono text-neutral-200">
            {universe?.temporalContext?.currentUniverseDate ?? 'MEMUAT...'}
          </div>
          <p className="text-[11px] text-neutral-400">
            Siklus harian yang menjadi jangkar narasi (Anchor).
          </p>
        </div>

        <div className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-neutral-500">
            TRIGGER PRODUKSI
          </span>
          <div className="text-sm font-bold font-mono text-indigo-300">
            TEMPORAL_TRANSITION
          </div>
          <p className="text-[11px] text-neutral-400">
            Transisi siklus matahari & pergantian hari semesta.
          </p>
        </div>

        <div className="p-4 bg-neutral-900/50 rounded-xl border border-neutral-800 space-y-1">
          <span className="text-[10px] font-mono uppercase text-neutral-500">
            STATUS RENDERER
          </span>
          <div className="text-sm font-bold font-mono text-emerald-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>DETERMINISTIC MOCK</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Renderer produksi deterministik standar arsitektur.
          </p>
        </div>
      </div>

      {/* Main Results / Execution Display */}
      {lastRun ? (
        <div className="space-y-6">
          {/* Status Header */}
          <div className="p-4 bg-neutral-900/80 rounded-xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs text-neutral-400">Hasil Eksekusi Produksi:</span>
                <h3 className="text-sm font-bold font-mono text-neutral-100">
                  Run ID: {lastRun.runId}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-bold">
                STATUS: {lastRun.status}
              </span>
              <span className="px-2.5 py-1 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 font-bold">
                CANON: {lastRun.storyPackage?.canonStatus || 'COMMITTED'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Story Narrative Text Presentation (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-bold text-neutral-100">
                      Naskah Narasi Harian (Daily Page Output)
                    </h4>
                  </div>
                  {lastRun.renderResult?.wordCount && (
                    <span className="text-xs font-mono text-neutral-400">
                      {lastRun.renderResult.wordCount} Kata
                    </span>
                  )}
                </div>

                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-neutral-300 leading-relaxed font-serif bg-neutral-950/70 p-5 rounded-xl border border-neutral-800/80 whitespace-pre-line">
                  {lastRun.renderResult?.content ||
                    'Naskah narasi berhasil diproduksi melalui deterministic renderer pipeline.'}
                </div>

                {/* Narrative Beats */}
                {lastRun.storyPackage?.narrativeBeats &&
                  lastRun.storyPackage.narrativeBeats.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-neutral-800">
                      <span className="text-xs font-semibold text-neutral-300 block">
                        Struktur Beat Naratif:
                      </span>
                      <div className="space-y-2">
                        {lastRun.storyPackage.narrativeBeats.map((beat, idx) => (
                          <div
                            key={beat.beatId || idx}
                            className="p-3 bg-neutral-950/50 rounded-lg border border-neutral-800/70 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="text-indigo-300 font-semibold">{beat.title}</span>
                              <span className="text-neutral-500">{beat.beatId}</span>
                            </div>
                            <p className="text-neutral-400 text-[11px]">{beat.focus}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Traces & Finalization Pipeline Info (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Traces */}
              <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-5 space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b border-neutral-800">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    Pipeline Execution Traces
                  </h4>
                </div>

                <div className="space-y-2">
                  {lastRun.traces && lastRun.traces.length > 0 ? (
                    lastRun.traces.map((trace, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-neutral-950/60 rounded-lg border border-neutral-800/70 text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-300 font-semibold">{trace.phase}</span>
                          <span className="text-[10px] text-emerald-400">{trace.status}</span>
                        </div>
                        {trace.message && (
                          <div className="text-[11px] text-neutral-400">{trace.message}</div>
                        )}
                        <span className="text-[9px] text-neutral-600 block">
                          {trace.timestamp}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-neutral-500 italic">
                      Tidak ada jejak eksekusi terpisah.
                    </div>
                  )}
                </div>
              </div>

              {/* Governance & Rules Reminder */}
              <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 text-xs space-y-2 text-neutral-400">
                <div className="flex items-center space-x-2 text-neutral-300 font-semibold">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Kepatuhan Aturan Cerita</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Cerita adalah proyeksi naratif dari Semesta, bukan pemilik kebenaran semesta
                  (Section 19). Perubahan dalam teks cerita tidak otomatis mengubah Canon karakter
                  atau lokasi tanpa validasi domain otoritatif.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-neutral-900/30 rounded-2xl border border-neutral-800/80 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-neutral-200">
              Belum Ada Eksekusi Produksi Cerita Hari Ini
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Klik tombol &ldquo;Jalankan Produksi Harian&rdquo; di atas untuk memproses pipeline
              cerita harian, menghasilkan narasi terstruktur, dan merekam jejak eksekusi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
