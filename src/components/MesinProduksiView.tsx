import React, { useState } from 'react';
import type { UniverseData, ReadinessReport, ProductionRunRecord } from '../types.ts';
import {
  Play,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Database,
  ShieldCheck,
  DollarSign,
  Calendar,
  FileCode
} from 'lucide-react';
import { TruthBadge } from './StatusBadges.tsx';

interface MesinProduksiViewProps {
  universe: UniverseData | null;
  readiness: ReadinessReport | null;
  productionRuns: ProductionRunRecord[];
  onTriggerProduction: () => Promise<void>;
  isActionPending: boolean;
}

export function MesinProduksiView({
  universe,
  readiness,
  productionRuns,
  onTriggerProduction,
  isActionPending
}: MesinProduksiViewProps) {
  const [selectedRun, setSelectedRun] = useState<ProductionRunRecord | null>(
    productionRuns[0] || null
  );

  const STAGES = [
    { id: 'INPUT', label: '1. Input Validation', desc: 'Memvalidasi story trigger, temporal anchor & universe scope' },
    { id: 'INITIALIZATION', label: '2. Period Init', desc: 'Membangun context periodik & temporal interval snapshot' },
    { id: 'PROGRESSION', label: '3. Progression Calc', desc: 'Menghitung pergerakan status entitas dan world clock' },
    { id: 'STORY', label: '4. Story Package', desc: 'Mengemas relevansi aktor, objek, kondisi & continuity restrictions' },
    { id: 'RENDER', label: '5. Deterministic Render', desc: 'Eksekusi deterministic rendering tanpa modifikasi Canon' },
    { id: 'FINALIZATION', label: '6. Period Finalize', desc: 'Finalisasi period cycle & validasi konsistensi next cycle' },
    { id: 'PERSISTENCE', label: '7. Durable Persistence', desc: 'Commit snapshot produksi ke file store runtime' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              SISTEM UTAMA: MESIN PRODUKSI
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              PHASE 34 HARDENED
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
            Mesin Produksi & Pipeline Deterministik
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Sistem eksekusi pipeline harian (DailyProductionPipeline) dengan arsitektur 7 tahap, zero leak cost controller, dan audit traces lengkap.
          </p>
        </div>

        <button
          onClick={onTriggerProduction}
          disabled={isActionPending}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Play className="w-4 h-4" />
          <span>{isActionPending ? 'Menjalankan Pipeline...' : 'Trigger Produksi Harian'}</span>
        </button>
      </div>

      {/* Engine Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Architecture Phase</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">Phase 34</div>
          <div className="text-[10px] text-neutral-500 font-mono">Hardened Core Engine</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cost Controller</span>
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono">
            ${(readiness?.subsystems.costController.totalCommittedCost ?? 0).toFixed(2)} USD
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Zero Resource Leak</div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Scheduler Status</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {readiness?.subsystems.scheduler.status || '-'}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            {readiness?.subsystems.scheduler.activeSchedules ?? 0} Active Schedules
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>Total Production Runs</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">{productionRuns.length} Runs</div>
          <div className="text-[10px] text-neutral-500 font-mono">Sesi Aktif</div>
        </div>
      </div>

      {/* 7-Stage Pipeline Flow */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-neutral-200">
              Alur Pipeline Produksi 7-Tahap (Deterministic Story Engine)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">DAILY_PRODUCTION_PIPELINE</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {STAGES.map((s, idx) => (
            <div
              key={s.id}
              className={`p-3 rounded-lg border flex flex-col justify-between ${
                idx === 6 ? 'sm:col-span-2 lg:col-span-2' : ''
              } bg-neutral-950 border-neutral-800/80`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-indigo-300">{s.label}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal">{s.desc}</p>
              </div>
              <div className="mt-2 text-[10px] font-mono text-neutral-600">ID: {s.id}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Run Traces & Details */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h2 className="text-sm font-bold text-neutral-200">
            Riwayat Eksekusi & Audit Traces Pipeline
          </h2>
          <span className="text-xs font-mono text-neutral-400">{productionRuns.length} Recorded Runs</span>
        </div>

        {productionRuns.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-neutral-950 rounded-lg border border-dashed border-neutral-800 space-y-2">
            <Cpu className="w-6 h-6 mx-auto text-neutral-600" />
            <p className="text-xs">Belum ada eksekusi pipeline dalam sesi ini.</p>
            <button
              onClick={onTriggerProduction}
              disabled={isActionPending}
              className="text-xs text-indigo-400 hover:underline font-mono"
            >
              Klik untuk menjalankan pipeline pertama →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {productionRuns.map((run) => (
              <div key={run.runId} className="bg-neutral-950 rounded-lg border border-neutral-800 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-300">{run.runId}</span>
                    <TruthBadge level="DERIVED" />
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    STATUS: {run.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 font-mono uppercase">Story Package ID:</span>
                    <div className="font-mono text-neutral-300 text-[11px]">
                      {run.storyPackage?.storyId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 font-mono uppercase">Renderer:</span>
                    <div className="font-mono text-neutral-300 text-[11px]">
                      {run.renderResult?.rendererId || 'DETERMINISTIC_MOCK_RENDERER'}
                    </div>
                  </div>
                </div>

                {/* Traces */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Audit Stage Traces:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {run.traces.map((trace, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-neutral-200">{trace.stage}</span>
                        {trace.detail && (
                          <span className="text-neutral-500 text-[9px] truncate max-w-[120px]">
                            ({trace.detail})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
