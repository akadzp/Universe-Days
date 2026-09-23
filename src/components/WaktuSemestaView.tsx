import React from 'react';
import type { UniverseData } from '../types.ts';
import {
  Clock,
  Calendar,
  FastForward,
  Hourglass,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TruthBadge } from './StatusBadges.tsx';

interface WaktuSemestaViewProps {
  universe: UniverseData | null;
  onAdvanceDay: () => Promise<void>;
  isActionPending: boolean;
}

export function WaktuSemestaView({
  universe,
  onAdvanceDay,
  isActionPending
}: WaktuSemestaViewProps) {
  const temporal = universe?.temporalContext;
  const events = Object.values(universe?.events || {});
  const processes = Object.values(universe?.processes || {});

  const CATEGORIES = [
    {
      name: 'ACTUAL',
      badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      description: 'Garis waktu resmi yang telah terjadi dan tercatat pada Canon semesta secara mutlak.'
    },
    {
      name: 'POSSIBILITY',
      badgeClass: 'bg-indigo-950 text-indigo-300 border-indigo-800',
      description: 'Potensi peristiwa atau rencana masa depan yang belum terjadi secara objektif.'
    },
    {
      name: 'UNKNOWN',
      badgeClass: 'bg-neutral-900 text-neutral-400 border-neutral-700',
      description: 'Informasi temporal yang belum diverifikasi atau diobservasi.'
    },
    {
      name: 'COUNTERFACTUAL',
      badgeClass: 'bg-rose-950 text-rose-300 border-rose-800',
      description: 'Skenario hipotetis alternatif yang tidak menjadi bagian dari Canon semesta.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              SISTEM UTAMA: KRONOLOGI WAKTU
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              TEMPORAL AUTHORITY
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
            Kronologi & Siklus Waktu Semesta
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Sistem temporal deterministik yang mengendalikan jam alam semesta (Universe Clock), kategori validitas temporal, dan kesinambungan waktu entitas.
          </p>
        </div>

        <button
          onClick={onAdvanceDay}
          disabled={isActionPending}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <FastForward className="w-4 h-4" />
          <span>{isActionPending ? 'Memajukan Waktu...' : 'Majukan +1 Hari Semesta'}</span>
        </button>
      </div>

      {/* Primary Clock Card */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                Current Universe Clock
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono mt-0.5">
                {temporal?.currentUniverseDate || universe?.universeDate || '-'}
              </div>
              <div className="text-xs text-neutral-400 font-mono mt-0.5">
                Timestamp: {temporal?.currentUniverseTime || universe?.universeTime || '-'}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
              Kategori: ACTUAL
            </span>
            <span className="text-[11px] text-neutral-500">Precision: DATETIME (UTC)</span>
          </div>
        </div>

        {/* Temporal Rule Note */}
        <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-400 space-y-1">
          <div className="font-semibold text-neutral-300 flex items-center gap-1.5 font-mono">
            <Hourglass className="w-3.5 h-3.5 text-amber-400" />
            <span>Aturan Kontinuitas Temporal:</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Waktu alam semesta hanya dapat bergerak maju secara deterministik. Setiap mutasi entitas mencatat <code className="text-indigo-300">effectiveTime</code> dan <code className="text-indigo-300">recordedTimestamp</code> untuk mencegah time paradox.
          </p>
        </div>
      </div>

      {/* Temporal Categories Grid */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-neutral-200">
          Kategori Validitas Temporal (Temporal Validity Contract)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {CATEGORIES.map((cat) => (
            <div key={cat.name} className="bg-neutral-950 rounded-lg border border-neutral-800 p-3.5 space-y-2">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cat.badgeClass}`}>
                {cat.name}
              </span>
              <p className="text-neutral-400 text-[11px] leading-relaxed">{cat.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Events & Processes Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Events */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h3 className="text-xs font-bold font-mono text-neutral-200 uppercase">
              Peristiwa Terjadwal (Canon Events)
            </h3>
            <span className="text-[10px] font-mono text-neutral-400">{events.length} Terdaftar</span>
          </div>
          <div className="space-y-2">
            {events.map((evt: any) => (
              <div key={evt.eventId} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-200">{evt.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800">
                    {evt.status}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Mulai: {evt.temporalInterval?.start} • Lokasi: {evt.locationRef}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ongoing Processes */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h3 className="text-xs font-bold font-mono text-neutral-200 uppercase">
              Proses Berjalan (Active Processes)
            </h3>
            <span className="text-[10px] font-mono text-neutral-400">{processes.length} Berjalan</span>
          </div>
          <div className="space-y-2">
            {processes.map((proc: any) => (
              <div key={proc.processId} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-200">{proc.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Ratio: {Math.round(proc.progressRatio * 100)}%
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Dimulai: {proc.startTime} • Tipe: {proc.processType}
                </div>
                {/* Progress bar */}
                <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${proc.progressRatio * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
