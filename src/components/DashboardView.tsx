import React from 'react';
import type { DashboardSection, UniverseData, ReadinessReport, ProductionRunRecord } from '../types.ts';
import {
  Users,
  Compass,
  BookOpen,
  GitCompare,
  Clock,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
  Database,
  Cpu,
  Home,
  Calendar
} from 'lucide-react';
import { TruthBadge, UnknownSafetyBadge } from './StatusBadges.tsx';

interface DashboardViewProps {
  section: DashboardSection;
  onSelectSection: (sec: DashboardSection) => void;
  universe: UniverseData | null;
  readiness: ReadinessReport | null;
  productionRuns: ProductionRunRecord[];
  onNavigate: (nav: 'aktor' | 'cerita' | 'cocokkan' | 'dunia', sec: string) => void;
  onAdvanceDay: () => Promise<void>;
  isActionPending: boolean;
}

export function DashboardView({
  section,
  onSelectSection,
  universe,
  readiness,
  productionRuns,
  onNavigate,
  onAdvanceDay,
  isActionPending
}: DashboardViewProps) {
  const stats = universe?.statistics;

  const TABS: Array<{ id: DashboardSection; label: string; icon: any; count?: number }> = [
    { id: 'beranda', label: 'Beranda Ringkasan', icon: Home },
    { id: 'hari_ini', label: 'Hari Ini (Today)', icon: Calendar },
    { id: 'aktivitas', label: 'Aktivitas Semesta', icon: Activity, count: productionRuns.length }
  ];

  return (
    <div className="space-y-6">
      {/* Submenu Tabs di dalam Dashboard */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = section === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectSection(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-indigo-950 text-indigo-300' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. HARI INI */}
      {section === 'hari_ini' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Kondisi Hari Aktif (Today)</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Konteks temporal aktif yang mengikat Daily Universe tanpa menggantikan Universe Canon.
            </p>
          </div>

          {/* Temporal Card */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-200">
                      Universe Date: {universe?.universeDate}
                    </span>
                    <TruthBadge level="CANON" />
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mt-0.5">
                    Temporal Context: {universe?.temporalContext.currentUniverseTime}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onAdvanceDay}
                  disabled={isActionPending}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isActionPending ? 'Memajukan...' : '+1 Hari (Advance Day)'}</span>
                </button>
              </div>
            </div>

            {/* Quick stats for current day */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wide">
                  Universe Scope
                </span>
                <div className="text-sm font-semibold text-neutral-200 mt-1">
                  {universe?.scope || 'DAILY_PRODUCTION'}
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Authority boundary active
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wide">
                  Cycle Status
                </span>
                <div className="text-sm font-semibold text-emerald-400 mt-1">
                  COMMITTED
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Deterministic daily progression
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-3">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wide">
                  Carryover Unresolved
                </span>
                <div className="text-sm font-semibold text-amber-300 mt-1">
                  {stats?.unresolvedCount ?? 0} Kondisi
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Membutuhkan observasi/resolusi
                </div>
              </div>
            </div>
          </div>

          {/* Unresolved conditions for today */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide font-mono">
              Kondisi Belum Terselesaikan (Unresolved Conditions)
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {Object.values(universe?.unresolvedConditions || {}).map((unres: any) => (
                <div
                  key={unres.conditionId}
                  className="bg-neutral-900/60 border border-neutral-800/80 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-neutral-200">
                        {unres.conditionId}
                      </span>
                      <UnknownSafetyBadge status={unres.currentStatus || 'UNRESOLVED'} />
                      <span className="text-[11px] font-mono text-neutral-400">
                        Target: {unres.targetEntityRef}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300">{unres.description}</p>
                  </div>
                  <button
                    onClick={() => onNavigate('cocokkan', 'masalah')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium shrink-0"
                  >
                    <span>Buka di Cocokkan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. AKTIVITAS */}
      {section === 'aktivitas' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Riwayat Aktivitas & Traces</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Audit log dan traces deterministic pipeline yang telah dieksekusi sistem.
            </p>
          </div>

          {productionRuns.length === 0 ? (
            <div className="bg-neutral-900/40 border border-dashed border-neutral-800 rounded-xl p-8 text-center space-y-3">
              <Activity className="w-8 h-8 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Belum ada aktivitas produksi pada sesi ini. Jalankan &apos;Trigger Daily Production Run&apos; di menu Cerita untuk melihat traces.
              </p>
              <button
                onClick={() => onNavigate('cerita', 'daily_story')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Ke Menu Cerita
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {productionRuns.map((run) => (
                <div
                  key={run.runId}
                  className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-300">
                        {run.runId}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {run.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      Renderer: {run.renderResult?.rendererId || 'DETERMINISTIC_MOCK_RENDERER'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wide">
                      Pipeline Stage Traces:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {run.traces.map((trace, idx) => (
                        <div
                          key={idx}
                          className="bg-neutral-950 border border-neutral-800 rounded p-2 text-center"
                        >
                          <div className="text-[10px] font-mono font-bold text-neutral-400">
                            {trace.stage}
                          </div>
                          <div
                            className={`text-[10px] font-mono mt-0.5 font-semibold ${
                              trace.status === 'PASSED'
                                ? 'text-emerald-400'
                                : trace.status === 'BLOCKED'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {trace.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. BERANDA */}
      {section === 'beranda' && (
        <div className="space-y-6">
          {/* Welcome & Overview Header */}
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Dashboard Observasi</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Ringkasan status aplikasi dan universe aktif sesuai prinsip arsitektur Pocer UI (Read-Only Consumer).
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              onClick={() => onNavigate('aktor', 'semua_aktor')}
              className="bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 text-left transition-all group"
            >
              <div className="flex items-center justify-between text-neutral-400 group-hover:text-indigo-400">
                <Users className="w-4 h-4" />
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-2">
                {stats?.charactersCount ?? 0}
              </div>
              <div className="text-xs font-medium text-neutral-300 mt-0.5">Semua Aktor</div>
              <div className="text-[10px] text-neutral-500">Registry Karakter</div>
            </button>

            <button
              onClick={() => onNavigate('cerita', 'daily_story')}
              className="bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 text-left transition-all group"
            >
              <div className="flex items-center justify-between text-neutral-400 group-hover:text-purple-400">
                <BookOpen className="w-4 h-4" />
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-2">
                {productionRuns.length}
              </div>
              <div className="text-xs font-medium text-neutral-300 mt-0.5">Daily Stories</div>
              <div className="text-[10px] text-neutral-500">Hasil Produksi</div>
            </button>

            <button
              onClick={() => onNavigate('cocokkan', 'ringkasan')}
              className="bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 text-left transition-all group"
            >
              <div className="flex items-center justify-between text-neutral-400 group-hover:text-emerald-400">
                <GitCompare className="w-4 h-4" />
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">
                {stats?.unresolvedCount === 0 ? '100%' : `${Math.max(0, 100 - (stats?.unresolvedCount ?? 0) * 10)}%`}
              </div>
              <div className="text-xs font-medium text-neutral-300 mt-0.5">Konsistensi</div>
              <div className="text-[10px] text-neutral-500">
                {stats?.unresolvedCount === 0 ? 'Canon Verified' : `${stats?.unresolvedCount} Unresolved`}
              </div>
            </button>

            <button
              onClick={() => onNavigate('dunia', 'tempat')}
              className="bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 text-left transition-all group"
            >
              <div className="flex items-center justify-between text-neutral-400 group-hover:text-cyan-400">
                <Compass className="w-4 h-4" />
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-2">
                {stats?.locationsCount ?? 0}
              </div>
              <div className="text-xs font-medium text-neutral-300 mt-0.5">Lokasi Dunia</div>
              <div className="text-[10px] text-neutral-500">Tempat Canon</div>
            </button>

            <button
              onClick={() => onNavigate('cocokkan', 'masalah')}
              className="bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 text-left transition-all group col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between text-neutral-400 group-hover:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-2">
                {stats?.unresolvedCount ?? 0}
              </div>
              <div className="text-xs font-medium text-neutral-300 mt-0.5">Unresolved</div>
              <div className="text-[10px] text-neutral-500">Perlu Perhatian</div>
            </button>
          </div>

          {/* Active Universe Card */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-200">
                      Universe Aktif: {universe?.universeId || 'UNIVERSE_SEED_01'}
                    </span>
                    <TruthBadge level="CANON" />
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mt-0.5">
                    Tanggal: {universe?.universeDate} • Scope: {universe?.scope}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onAdvanceDay}
                  disabled={isActionPending}
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isActionPending ? 'Memajukan...' : '+1 Hari Semesta'}</span>
                </button>
              </div>
            </div>

            {/* Sub-counts overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Benda</span>
                <div className="text-base font-bold text-neutral-200 font-mono">
                  {stats?.objectsCount ?? 0}
                </div>
              </div>
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Relasi</span>
                <div className="text-base font-bold text-neutral-200 font-mono">
                  {stats?.relationshipsCount ?? 0}
                </div>
              </div>
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Pengetahuan</span>
                <div className="text-base font-bold text-neutral-200 font-mono">
                  {stats?.knowledgeCount ?? 0}
                </div>
              </div>
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">State</span>
                <div className="text-base font-bold text-neutral-200 font-mono">
                  {stats?.statesCount ?? 0}
                </div>
              </div>
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Peristiwa</span>
                <div className="text-base font-bold text-neutral-200 font-mono">
                  {stats?.eventsCount ?? 0}
                </div>
              </div>
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Proses</span>
                <div className="text-base font-bold text-neutral-200 font-mono">
                  {stats?.processesCount ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Engine Readiness Banner */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-semibold uppercase text-neutral-200">
                  Status Engine & Hardening (Phase 34)
                </h3>
              </div>
              <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold border ${
                readiness?.status === 'READY'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}>
                {readiness?.status || 'UNKNOWN'}
              </span>
            </div>

            <p className="text-xs text-neutral-400">
              Pocer Universe Engine berjalan dengan authoritas penuh. Mutasi status entitas hanya dilakukan melalui backend contract dan persistent storage.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs">
              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-[11px]">Storage Persistence</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  {readiness?.subsystems.universePersistence.mounted ? 'MOUNTED' : 'UNMOUNTED'}
                </span>
              </div>
              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-[11px]">Cost Controller</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  ${(readiness?.subsystems.costController.totalCommittedCost ?? 0).toFixed(2)} USD
                </span>
              </div>
              <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400 font-mono text-[11px]">Scheduler</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  {readiness?.subsystems.scheduler.status || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
