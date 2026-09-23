import React from 'react';
import {
  Users,
  MapPin,
  Box,
  Network,
  Brain,
  Activity,
  Calendar,
  Layers,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Server,
  Loader2
} from 'lucide-react';
import type { AuthoritativeUniverse, DeploymentReadinessReport } from '../types';
import type { NavTab } from './Sidebar';

interface DashboardViewProps {
  universe: AuthoritativeUniverse | null;
  readiness: DeploymentReadinessReport | null;
  onNavigate: (tab: NavTab) => void;
  onAdvanceTime: () => void;
  loadingAction: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  universe,
  readiness,
  onNavigate,
  onAdvanceTime,
  loadingAction
}) => {
  const isLoaded = Boolean(universe);
  const stats = universe?.statistics ?? null;

  const statCards = [
    {
      title: 'Actor & Character',
      count: stats ? stats.charactersCount : null,
      icon: Users,
      color: 'text-indigo-400',
      bg: 'bg-indigo-950/30',
      border: 'border-indigo-800/40',
      tab: 'actor-actress' as NavTab,
      label: 'Entitas Aktif'
    },
    {
      title: 'Locations',
      count: stats ? stats.locationsCount : null,
      icon: MapPin,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-800/40',
      label: 'Node Spasial'
    },
    {
      title: 'Objects / Artifacts',
      count: stats ? stats.objectsCount : null,
      icon: Box,
      color: 'text-amber-400',
      bg: 'bg-amber-950/30',
      border: 'border-amber-800/40',
      label: 'Relik & Artefak'
    },
    {
      title: 'Relationships',
      count: stats ? stats.relationshipsCount : null,
      icon: Network,
      color: 'text-purple-400',
      bg: 'bg-purple-950/30',
      border: 'border-purple-800/40',
      label: 'Koneksi Antar-Entitas'
    },
    {
      title: 'Knowledge Facts',
      count: stats ? stats.knowledgeCount : null,
      icon: Brain,
      color: 'text-sky-400',
      bg: 'bg-sky-950/30',
      border: 'border-sky-800/40',
      label: 'Fakta & Pengetahuan'
    },
    {
      title: 'Temporal States',
      count: stats ? stats.statesCount : null,
      icon: Activity,
      color: 'text-rose-400',
      bg: 'bg-rose-950/30',
      border: 'border-rose-800/40',
      label: 'Vektor Dinamis'
    },
    {
      title: 'Universe Events',
      count: stats ? stats.eventsCount : null,
      icon: Calendar,
      color: 'text-yellow-400',
      bg: 'bg-yellow-950/30',
      border: 'border-yellow-800/40',
      label: 'Kejadian Bersejarah'
    },
    {
      title: 'Active Processes',
      count: stats ? stats.processesCount : null,
      icon: Layers,
      color: 'text-teal-400',
      bg: 'bg-teal-950/30',
      border: 'border-teal-800/40',
      label: 'Proses Berjalan'
    },
    {
      title: 'Unresolved Conditions',
      count: stats ? stats.unresolvedCount : null,
      icon: AlertCircle,
      color: 'text-orange-400',
      bg: 'bg-orange-950/30',
      border: 'border-orange-800/40',
      label: 'Kondisi Tertunda'
    }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-indigo-950/40 to-neutral-900 border border-neutral-800 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                ARSITEKTUR UI POCER
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                Authoritative Domain Governance
              </span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-100 tracking-tight">
              Pocer Universe Days Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Platform storytelling kontinuitas harian berbasis domain otoritatif. UI bertindak
              sebagai consumer & client komando yang tunduk pada aturan sistem semesta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onAdvanceTime}
              disabled={loadingAction === 'advance'}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Majukan Waktu Universe (+1 Hari)</span>
            </button>
            <button
              onClick={() => onNavigate('cerita')}
              className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-neutral-700 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Buka Ruang Cerita</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Deployment Readiness Inspector Card */}
      {readiness && (
        <div className="bg-neutral-900/60 rounded-2xl border border-neutral-800 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div className="flex items-center space-x-3">
              <Server className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-neutral-100">
                  Inspeksi Kesiapan Sistem (Readiness Phase {readiness.architecturePhase})
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Engine: {readiness.engine} • Timestamp: {readiness.timestamp}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-neutral-400">Status Keseluruhan:</span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                  readiness.status === 'READY'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : readiness.status === 'DEGRADED'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                    : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                }`}
              >
                {readiness.status}
              </span>
            </div>
          </div>

          {/* Subsystems grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            {Object.entries(readiness.subsystems).map(([key, value]) => {
              const status = (value as any)?.status ?? 'UNKNOWN';
              const isReady = status === 'READY' || status === 'WIRED' || status === 'CONNECTED';
              return (
                <div
                  key={key}
                  className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80 space-y-1"
                >
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block truncate">
                    {key}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isReady ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-semibold text-neutral-200 font-mono text-[11px] truncate">
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checks checklist */}
          <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/60">
            <span className="text-xs font-semibold text-neutral-300 block mb-2">
              Pemeriksaan Invariant Arsitektur Otoritatif:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(readiness.checks).map(([checkKey, ok]) => (
                <div key={checkKey} className="flex items-center space-x-2">
                  {ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="font-mono text-neutral-400 text-[11px] truncate">
                    {checkKey}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Universe Authoritative Statistics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
              Statistik Canonical State Semesta
            </h3>
          </div>
          <span className="text-xs font-mono text-neutral-500">
            ID: {universe?.universeId ?? 'MEMUAT...'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                onClick={() => stat.tab && onNavigate(stat.tab)}
                className={`p-5 rounded-xl border ${stat.bg} ${stat.border} flex items-start justify-between transition ${
                  stat.tab ? 'hover:scale-[1.01] cursor-pointer hover:border-indigo-500/50' : ''
                }`}
              >
                <div className="space-y-1">
                  <span className="text-xs text-neutral-400 font-medium">{stat.title}</span>
                  <div className="text-3xl font-bold font-mono text-neutral-100">
                    {stat.count !== null ? (
                      stat.count
                    ) : (
                      <span className="text-neutral-500 text-lg flex items-center space-x-1">
                        <Loader2 className="w-4 h-4 animate-spin inline" />
                        <span className="text-xs font-sans">Memuat</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">{stat.label}</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Entities & Unresolved Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Characters in this Universe */}
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-bold text-neutral-100">Karakter & Aktor Semesta</h4>
            </div>
            <button
              onClick={() => onNavigate('actor-actress')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Lihat di Actor & Actress</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {universe?.characters && Object.values(universe.characters).length > 0 ? (
              Object.values(universe.characters).map(char => (
                <div
                  key={char.identity.id}
                  onClick={() => onNavigate('actor-actress')}
                  className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800/80 flex items-center justify-between hover:border-neutral-700 transition cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-xs text-neutral-200">
                      {char.identity.displayName}
                    </span>
                    <div className="flex items-center space-x-2 text-[11px] text-neutral-400 font-mono mt-0.5">
                      <span>{char.identity.id}</span>
                      <span>•</span>
                      <span className="text-indigo-300">
                        {char.roleReferences?.join(', ') || 'Tanpa Peran'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 rounded border border-neutral-800 text-neutral-400">
                    {char.identity.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-neutral-500 italic p-4 text-center">
                Belum ada karakter yang tercatat di Universe ini.
              </div>
            )}
          </div>
        </div>

        {/* Unresolved Conditions / Carryover */}
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              <h4 className="text-sm font-bold text-neutral-100">Kondisi Tertunda (Carryover)</h4>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              {Object.keys(universe?.unresolvedConditions || {}).length} Kondisi
            </span>
          </div>

          <div className="space-y-2.5">
            {universe?.unresolvedConditions &&
            Object.values(universe.unresolvedConditions).length > 0 ? (
              Object.values(universe.unresolvedConditions).map(item => (
                <div
                  key={item.conditionId}
                  className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-orange-300 font-semibold">
                      {item.conditionId}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-orange-950/50 text-orange-400 border border-orange-800/40 rounded">
                      {item.currentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300">{item.description}</p>
                  <div className="text-[10px] text-neutral-500 font-mono flex items-center space-x-2">
                    <span>Domain: {item.ownerDomain}</span>
                    <span>•</span>
                    <span>Target: {item.targetEntityRef}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-neutral-500 italic p-4 text-center">
                Tidak ada kondisi tertunda di Universe saat ini.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
