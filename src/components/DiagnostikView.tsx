import React, { useState } from 'react';
import type { ReadinessReport } from '../types.ts';
import {
  Activity,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Lock,
  Calendar,
  DollarSign
} from 'lucide-react';

interface DiagnostikViewProps {
  readiness: ReadinessReport | null;
  onRefresh: () => Promise<void>;
}

export function DiagnostikView({
  readiness,
  onRefresh
}: DiagnostikViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const subsystems = readiness?.subsystems;
  const checks = readiness?.checks || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              SISTEM UTAMA: DIAGNOSTIK
            </span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold border ${
              readiness?.status === 'READY'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}>
              STATUS: {readiness?.status || 'UNKNOWN'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
            Kesehatan Mesin & Kesiapan Sistem (Diagnostics)
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Audit telemetri internal dan status kesiapan 7 subsistem Pocer Universe Engine sesuai arsitektur Phase 34 Hardened.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostik</span>
        </button>
      </div>

      {/* Overview Card */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              <span>{readiness?.engine || 'Pocer Universe Engine'}</span>
            </h2>
            <div className="text-xs text-neutral-400 font-mono mt-0.5">
              Phase {readiness?.architecturePhase} Hardened • Diperiksa: {readiness?.timestamp}
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-neutral-400">Hardening:</span>
            <span className="text-emerald-400 font-bold">WIRED & SECURED</span>
          </div>
        </div>

        {/* 7 Subsystems Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Persistence */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-200 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Universe Persistence</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {subsystems?.universePersistence.status}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono space-y-0.5">
              <div>Mounted: {subsystems?.universePersistence.mounted ? 'TRUE' : 'FALSE'}</div>
              <div>Stored Universes: {subsystems?.universePersistence.storedUniverses}</div>
              <div className="truncate text-neutral-500">Root: {subsystems?.universePersistence.rootDir}</div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-200 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-purple-400" />
                <span>Production Storage</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {subsystems?.storage.status}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono space-y-0.5">
              <div>Type: FileSystem Durable</div>
              <div className="truncate text-neutral-500">Root: {subsystems?.storage.rootDir}</div>
            </div>
          </div>

          {/* Scheduler */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Task Scheduler</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {subsystems?.scheduler.status}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono space-y-0.5">
              <div>Active Schedules: {subsystems?.scheduler.activeSchedules}</div>
              <div className="truncate text-neutral-500">Store: {subsystems?.scheduler.jobStoreRoot}</div>
            </div>
          </div>

          {/* Cost Controller */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cost Controller</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {subsystems?.costController.status}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono space-y-0.5">
              <div>Committed Cost: ${subsystems?.costController.totalCommittedCost.toFixed(2)} USD</div>
              <div className="text-neutral-500">Zero Resource Leak Active</div>
            </div>
          </div>

          {/* Hardening */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Engine Hardening</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {subsystems?.hardening.status}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono space-y-0.5">
              <div>Deep Freeze State Protection</div>
              <div>Domain Contract Wired</div>
            </div>
          </div>

          {/* Providers */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>External Providers</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                {subsystems?.providers.status}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono space-y-0.5">
              <div>Connected: {subsystems?.providers.connected}</div>
              <div className="text-neutral-500">Deterministic Mock Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Checks List */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-mono font-semibold uppercase text-neutral-300">
          Integritas Pemeriksaan Otomatis (System Invariant Checks)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {Object.entries(checks).map(([key, val]) => (
            <div
              key={key}
              className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-center justify-between"
            >
              <span className="text-neutral-300">{key}</span>
              {val ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PASS</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>WARN</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
