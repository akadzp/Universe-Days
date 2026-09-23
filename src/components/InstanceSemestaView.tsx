import React, { useState } from 'react';
import type { UniverseData } from '../types.ts';
import {
  Database,
  RotateCcw,
  Copy,
  Check,
  Download,
  FileCode,
  HardDrive,
  Layers,
  ArrowRight
} from 'lucide-react';
import { TruthBadge } from './StatusBadges.tsx';

interface InstanceSemestaViewProps {
  universe: UniverseData | null;
  onResetSeed: () => Promise<void>;
  isActionPending: boolean;
}

export function InstanceSemestaView({
  universe,
  onResetSeed,
  isActionPending
}: InstanceSemestaViewProps) {
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const jsonStr = universe ? JSON.stringify(universe, null, 2) : '{}';

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `universe-snapshot-${universe?.universeId || 'unknown'}-${universe?.universeDate || 'seed'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = universe?.statistics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              SISTEM UTAMA: SNAPSHOT SEMESTA
            </span>
            <TruthBadge level="CANON" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
            Instance & Snapshot Penyimpanan Semesta
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Penyimpanan snapshot authoritatif (Universe Instances) dengan deep freeze imutabilitas, serialisasi JSON deterministik, dan pemulihan seed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetSeed}
            disabled={isActionPending}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-800 text-neutral-300 border border-neutral-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Seed Authoritatif</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Snapshot JSON</span>
          </button>
        </div>
      </div>

      {/* Instance Metadata Card */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-200">
                Universe Instance ID: <code className="text-indigo-300 font-mono">{universe?.universeId}</code>
              </span>
              <div className="text-xs text-neutral-400 font-mono mt-0.5">
                Scope: {universe?.scope} • Tanggal Aktif: {universe?.universeDate}
              </div>
            </div>
          </div>

          <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            STORAGE: PERSISTED ON DISK
          </span>
        </div>

        {/* Counts summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs font-mono">
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-500 block">Karakter</span>
            <span className="text-sm font-bold text-neutral-200">{stats?.charactersCount ?? 0}</span>
          </div>
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-500 block">Lokasi</span>
            <span className="text-sm font-bold text-neutral-200">{stats?.locationsCount ?? 0}</span>
          </div>
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-500 block">Benda</span>
            <span className="text-sm font-bold text-neutral-200">{stats?.objectsCount ?? 0}</span>
          </div>
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-500 block">Relasi</span>
            <span className="text-sm font-bold text-neutral-200">{stats?.relationshipsCount ?? 0}</span>
          </div>
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-500 block">Pengetahuan</span>
            <span className="text-sm font-bold text-neutral-200">{stats?.knowledgeCount ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Raw Snapshot JSON Explorer */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-mono font-semibold uppercase text-neutral-200">
              Raw Snapshot State Inspector (JSON)
            </h3>
          </div>

          <button
            onClick={handleCopy}
            className="text-xs font-mono px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
          </button>
        </div>

        <div className="bg-neutral-950 rounded-lg border border-neutral-800/80 p-4 max-h-[480px] overflow-auto font-mono text-xs text-neutral-300 leading-relaxed">
          <pre>{jsonStr}</pre>
        </div>
      </div>
    </div>
  );
}
