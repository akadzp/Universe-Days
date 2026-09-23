import React, { useState, useEffect, useCallback } from 'react';
import type {
  ActiveView,
  RootNav,
  DashboardSection,
  AktorSection,
  CeritaSection,
  CocokkanSection,
  DuniaSection,
  UniverseData,
  ReadinessReport,
  ProductionRunRecord
} from './types.ts';
import { Header } from './components/Header.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { MainSidebar } from './components/MainSidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { AktorView } from './components/AktorView.tsx';
import { CeritaView } from './components/CeritaView.tsx';
import { CocokkanView } from './components/CocokkanView.tsx';
import { DuniaView } from './components/DuniaView.tsx';
import { TataKelolaView } from './components/TataKelolaView.tsx';
import { MesinProduksiView } from './components/MesinProduksiView.tsx';
import { WaktuSemestaView } from './components/WaktuSemestaView.tsx';
import { DiagnostikView } from './components/DiagnostikView.tsx';
import { InstanceSemestaView } from './components/InstanceSemestaView.tsx';
import { AuditLedgerView } from './components/AuditLedgerView.tsx';
import { AlertCircle, Loader2, PanelLeftOpen } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [dashboardSec, setDashboardSec] = useState<DashboardSection>('beranda');
  const [aktorSec, setAktorSec] = useState<AktorSection>('semua_aktor');
  const [ceritaSec, setCeritaSec] = useState<CeritaSection>('daily_story');
  const [cocokkanSec, setCocokkanSec] = useState<CocokkanSection>('ringkasan');
  const [duniaSec, setDuniaSec] = useState<DuniaSection>('ringkasan');

  // Sidebar Open/Close State (Explicit Control)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Selected Entity State
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  // Data & Subsystem States
  const [universe, setUniverse] = useState<UniverseData | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [productionRuns, setProductionRuns] = useState<ProductionRunRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch universe state from authoritative backend
  const fetchUniverse = useCallback(async () => {
    try {
      const res = await fetch('/api/universe');
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching universe`);
      const data = await res.json();
      setUniverse(data);
    } catch (err) {
      console.error('Failed to load universe:', err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Fetch engine readiness report
  const fetchReadiness = useCallback(async () => {
    try {
      const res = await fetch('/api/readiness');
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);
      }
    } catch (err) {
      console.warn('Failed to load readiness:', err);
    }
  }, []);

  // Initial mount load
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([fetchUniverse(), fetchReadiness()]);
      setIsLoading(false);
    }
    init();
  }, [fetchUniverse, fetchReadiness]);

  // Action: Advance Temporal Clock
  const handleAdvanceDay = async () => {
    setIsActionPending(true);
    try {
      const res = await fetch('/api/time/advance', { method: 'POST' });
      if (!res.ok) throw new Error('Gagal memajukan waktu alam semesta.');
      await fetchUniverse();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsActionPending(false);
    }
  };

  // Action: Reset Universe to Seed
  const handleResetSeed = async () => {
    if (!confirm('Kembalikan Universe ke generic seed authoritatif?')) return;
    setIsActionPending(true);
    try {
      const res = await fetch('/api/universe/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Gagal mereset universe.');
      await fetchUniverse();
      await fetchReadiness();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsActionPending(false);
    }
  };

  // Action: Trigger Daily Production Run
  const handleTriggerProduction = async () => {
    setIsActionPending(true);
    try {
      const res = await fetch('/api/production/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Pipeline execution failed.');
      }
      setProductionRuns((prev) => [data, ...prev]);
      setActiveView('cerita');
      setCeritaSec('riwayat');
      await fetchUniverse();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsActionPending(false);
    }
  };

  // Locator Jump (Single Home Rule router)
  const handleSelectEntityFromSearch = (
    nav: 'aktor' | 'dunia' | 'cerita',
    section: string,
    entityId?: string
  ) => {
    setActiveView(nav);
    if (nav === 'aktor') {
      setAktorSec(section as AktorSection);
      if (entityId) setSelectedCharId(entityId);
    } else if (nav === 'dunia') {
      setDuniaSec(section as DuniaSection);
    } else if (nav === 'cerita') {
      setCeritaSec(section as CeritaSection);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-xs font-mono">Memuat Pocer Universe Days (Phase 34 Core)...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans pb-16">
      {/* 1. Global Header with Sidebar Open/Close Button */}
      <Header
        universe={universe}
        readiness={readiness}
        onAdvanceDay={handleAdvanceDay}
        onResetSeed={handleResetSeed}
        onSelectEntity={handleSelectEntityFromSearch}
        isActionPending={isActionPending}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Error alert banner if any */}
      {errorMessage && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Middle Frame: Main Sidebar (Control: Open/Close) + Content View */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Sidebar: Menu Utama Lainnya dengan kontrol Close & Open */}
        <MainSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeView={activeView}
          onSelectView={(view) => setActiveView(view)}
          readiness={readiness}
          universe={universe}
          productionRunsCount={productionRuns.length}
        />

        {/* Quick Open tab on the edge if sidebar is closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute left-0 top-6 z-20 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border-r border-y border-neutral-700/80 rounded-r-lg px-2 py-2 text-xs font-mono flex items-center gap-1.5 shadow-lg transition-all"
            title="Buka Sidebar (Menu Utama Lainnya)"
          >
            <PanelLeftOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] hidden sm:inline">Sistem Utama</span>
          </button>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
          {/* BOTTOM NAV MAIN MENUS (Each contains its own internal submenu) */}
          {activeView === 'dashboard' && (
            <DashboardView
              section={dashboardSec}
              onSelectSection={(sec) => setDashboardSec(sec)}
              universe={universe}
              readiness={readiness}
              productionRuns={productionRuns}
              onNavigate={(nav, sec) => {
                setActiveView(nav);
                if (nav === 'aktor') setAktorSec(sec as AktorSection);
                if (nav === 'cerita') setCeritaSec(sec as CeritaSection);
                if (nav === 'cocokkan') setCocokkanSec(sec as CocokkanSection);
                if (nav === 'dunia') setDuniaSec(sec as DuniaSection);
              }}
              onAdvanceDay={handleAdvanceDay}
              isActionPending={isActionPending}
            />
          )}

          {activeView === 'aktor' && (
            <AktorView
              section={aktorSec}
              onSelectSection={(sec) => setAktorSec(sec)}
              universe={universe}
              selectedCharId={selectedCharId}
              onSelectCharacter={(id) => {
                setSelectedCharId(id);
                setAktorSec('karakter');
              }}
              onNavigate={(nav, sec) => {
                setActiveView(nav);
                if (nav === 'cerita') setCeritaSec(sec as CeritaSection);
                if (nav === 'cocokkan') setCocokkanSec(sec as CocokkanSection);
                if (nav === 'dunia') setDuniaSec(sec as DuniaSection);
              }}
              onRefresh={fetchUniverse}
            />
          )}

          {activeView === 'cerita' && (
            <CeritaView
              section={ceritaSec}
              onSelectSection={(sec) => setCeritaSec(sec)}
              universe={universe}
              productionRuns={productionRuns}
              onTriggerProduction={handleTriggerProduction}
              isActionPending={isActionPending}
            />
          )}

          {activeView === 'cocokkan' && (
            <CocokkanView
              section={cocokkanSec}
              onSelectSection={(sec) => setCocokkanSec(sec)}
              universe={universe}
              onNavigate={(nav, sec, id) => {
                setActiveView(nav);
                if (nav === 'aktor') {
                  setAktorSec(sec as AktorSection);
                  if (id) setSelectedCharId(id);
                } else if (nav === 'dunia') {
                  setDuniaSec(sec as DuniaSection);
                } else if (nav === 'cerita') {
                  setCeritaSec(sec as CeritaSection);
                }
              }}
            />
          )}

          {activeView === 'dunia' && (
            <DuniaView
              section={duniaSec}
              onSelectSection={(sec) => setDuniaSec(sec)}
              universe={universe}
              onNavigateToActor={(actorId) => {
                setActiveView('aktor');
                setAktorSec('karakter');
                setSelectedCharId(actorId);
              }}
            />
          )}

          {/* SIDEBAR MAIN MENUS (Other Primary Systems not in bottom navigation) */}
          {activeView === 'tata_kelola' && <TataKelolaView />}

          {activeView === 'mesin_produksi' && (
            <MesinProduksiView
              universe={universe}
              readiness={readiness}
              productionRuns={productionRuns}
              onTriggerProduction={handleTriggerProduction}
              isActionPending={isActionPending}
            />
          )}

          {activeView === 'waktu_semesta' && (
            <WaktuSemestaView
              universe={universe}
              onAdvanceDay={handleAdvanceDay}
              isActionPending={isActionPending}
            />
          )}

          {activeView === 'diagnostik' && (
            <DiagnostikView
              readiness={readiness}
              onRefresh={fetchReadiness}
            />
          )}

          {activeView === 'instance_semesta' && (
            <InstanceSemestaView
              universe={universe}
              onResetSeed={handleResetSeed}
              isActionPending={isActionPending}
            />
          )}

          {activeView === 'audit_ledger' && (
            <AuditLedgerView
              universe={universe}
            />
          )}
        </main>
      </div>

      {/* 3. Bottom Navigation (Always present on root for the 5 primary views) */}
      <BottomNav
        activeNav={activeView}
        onSelectNav={(nav: RootNav) => setActiveView(nav)}
      />
    </div>
  );
}
