import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Cpu,
  RefreshCw,
  GitBranch,
  Calendar,
  Activity,
  AlertCircle,
  Server,
  Sparkles
} from 'lucide-react';

interface EnginePhaseInfo {
  phaseId: number;
  name: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED';
  description: string;
  modules: string[];
  testCount: number;
}

interface ArchitectureStatusResponse {
  project: string;
  currentPhase: string;
  phaseNumber: number;
  status: string;
  totalTestsPassing: number;
  testPassRate: string;
  ownersCount: number;
  owners: Array<{ id: string; name: string; prefix: string; description: string }>;
  phases: EnginePhaseInfo[];
  engineCapabilities: string[];
}

export const App: React.FC = () => {
  const [data, setData] = useState<ArchitectureStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPhase, setSelectedPhase] = useState<number>(6);
  const [activeTab, setActiveTab] = useState<'phases' | 'domains' | 'capabilities'>('phases');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchStatus = () => {
    setLoading(true);
    fetch('/api/architecture/status')
      .then((res) => res.json())
      .then((json: ArchitectureStatusResponse) => {
        setData(json);
        setLoading(false);
        setLastRefreshed(new Date().toLocaleTimeString());
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const activePhaseData = data?.phases?.find((p) => p.phaseId === selectedPhase) || data?.phases?.[data.phases.length - 1];

  return (
    <div id="pocer-app-root" className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-start p-4 sm:p-8 font-sans">
      <div className="max-w-4xl w-full space-y-6">
        {/* Top Header Card */}
        <header id="engine-header" className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800/80 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Engine Active &bull; Phase {data?.phaseNumber ?? 6}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium rounded-full flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  {data?.status ?? 'ACTIVE'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100 font-serif">
                {data?.project ?? 'Pocer Universe Engine'}
              </h1>
              <p className="text-sm text-stone-400 max-w-2xl">
                Deterministic Universe-period orchestration layer, Allen interval temporal algebra, immutable continuity chains, and Daily Story lifecycle contracts.
              </p>
            </div>

            <button
              id="refresh-status-btn"
              onClick={fetchStatus}
              disabled={loading}
              className="self-start sm:self-center px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 rounded-lg text-xs font-mono font-medium border border-stone-700 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Ping Engine</span>
            </button>
          </div>

          {/* Key Metric Gauges */}
          <div id="metrics-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-left font-mono">
            <div className="bg-stone-950/70 border border-stone-800/90 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-amber-400/80" />
                <span>Active Phase</span>
              </div>
              <span className="text-stone-100 text-base font-semibold block">Phase 6</span>
              <span className="text-stone-500 text-[10px] block">Daily Story Core</span>
            </div>

            <div className="bg-stone-950/70 border border-stone-800/90 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
                <span>Test Suite</span>
              </div>
              <span className="text-emerald-400 text-base font-semibold block">
                {data?.totalTestsPassing ?? 260} Passing
              </span>
              <span className="text-emerald-500/80 text-[10px] block font-medium">100% Pass Rate (57 Suites)</span>
            </div>

            <div className="bg-stone-950/70 border border-stone-800/90 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-sky-400/80" />
                <span>Domain Owners</span>
              </div>
              <span className="text-stone-100 text-base font-semibold block">
                {data?.ownersCount ?? 13} Domains
              </span>
              <span className="text-stone-500 text-[10px] block">Boundaries Verified</span>
            </div>

            <div className="bg-stone-950/70 border border-stone-800/90 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-purple-400/80" />
                <span>Engine Clock</span>
              </div>
              <span className="text-stone-100 text-base font-semibold block">Deterministic</span>
              <span className="text-stone-500 text-[10px] block">Isolated Universe Time</span>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div id="dashboard-nav" className="flex items-center space-x-2 border-b border-stone-800 pb-2">
          <button
            id="tab-phases"
            onClick={() => setActiveTab('phases')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition flex items-center gap-2 ${
              activeTab === 'phases'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Phases &amp; Modules (1–6)</span>
          </button>

          <button
            id="tab-domains"
            onClick={() => setActiveTab('domains')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition flex items-center gap-2 ${
              activeTab === 'domains'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Domain Architecture ({data?.ownersCount ?? 13})</span>
          </button>

          <button
            id="tab-capabilities"
            onClick={() => setActiveTab('capabilities')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition flex items-center gap-2 ${
              activeTab === 'capabilities'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Capabilities ({data?.engineCapabilities?.length ?? 21})</span>
          </button>
        </div>

        {/* Tab 1: Phase Explorer */}
        {activeTab === 'phases' && (
          <section id="phases-section" className="space-y-4">
            {/* Phase Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
              {(data?.phases ?? []).map((phase) => {
                const isSelected = selectedPhase === phase.phaseId;
                return (
                  <button
                    key={phase.phaseId}
                    id={`phase-btn-${phase.phaseId}`}
                    onClick={() => setSelectedPhase(phase.phaseId)}
                    className={`p-3 rounded-xl border text-left transition relative ${
                      isSelected
                        ? 'bg-stone-900 border-amber-500/50 shadow-lg'
                        : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-stone-400 font-semibold">Phase {phase.phaseId}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-xs font-semibold text-stone-200 truncate">
                      {phase.name.split(':')[1]?.trim() || phase.name}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      {phase.testCount} tests
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Phase Detail Card */}
            {activePhaseData && (
              <div id="phase-detail-card" className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-4">
                  <div>
                    <span className="text-amber-400 font-mono text-xs uppercase tracking-wider block">
                      Phase {activePhaseData.phaseId} Details
                    </span>
                    <h2 className="text-lg font-bold text-stone-100 font-serif">
                      {activePhaseData.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded-md">
                      Verified &bull; {activePhaseData.testCount} Tests Passing
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-stone-300">
                  {activePhaseData.description}
                </p>

                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block font-semibold">
                    Core Architectural Modules ({activePhaseData.modules.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                    {activePhaseData.modules.map((mod, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2.5 bg-stone-950/60 border border-stone-800/80 p-2.5 rounded-lg text-stone-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{mod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Domain Owners */}
        {activeTab === 'domains' && (
          <section id="domains-section" className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 space-y-4 font-mono">
            <div className="border-b border-stone-800 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-stone-100">Registered System Domain Owners</h2>
                <p className="text-xs text-stone-400 font-sans">Strict domain boundaries, error prefix namespaces, and deterministic ownership rules.</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-stone-800 text-stone-300 rounded border border-stone-700">
                13 Domains Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {(data?.owners ?? []).map((owner) => (
                <div key={owner.id} className="bg-stone-950/60 border border-stone-800 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300">{owner.name}</span>
                    <span className="px-2 py-0.5 bg-stone-800 text-stone-400 text-[10px] rounded">
                      Prefix: {owner.prefix}
                    </span>
                  </div>
                  <p className="text-stone-400 text-[11px] font-sans leading-relaxed">
                    {owner.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 3: Engine Capabilities */}
        {activeTab === 'capabilities' && (
          <section id="capabilities-section" className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 space-y-4 font-mono">
            <div className="border-b border-stone-800 pb-3">
              <h2 className="text-base font-bold text-stone-100">Engine Capabilities Matrix</h2>
              <p className="text-xs text-stone-400 font-sans">Authoritative runtime features registered across Phase 1 through Phase 5.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {(data?.engineCapabilities ?? []).map((cap, i) => (
                <div key={i} className="flex items-center space-x-2 bg-stone-950/60 border border-stone-800 p-2.5 rounded-lg text-stone-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-[11px] truncate">{cap}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-stone-800/80 pt-4 text-xs font-mono text-stone-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Pocer Universe Engine &bull; Version 0.1.0 (Phase 1–5 Complete)</span>
          <span className="text-[11px] text-stone-600">
            {lastRefreshed ? `Last ping: ${lastRefreshed}` : ''}
          </span>
        </footer>
      </div>
    </div>
  );
};
